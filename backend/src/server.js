require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Database connection
const connectDB = require('../config/database');

// Routes
const clientRoutes = require('./routes/clients');
const messageRoutes = require('./routes/messages');
const paymentRoutes = require('./routes/payments');

// Utilities
const { initializeRiskScoringCron, updateAllRiskScores } = require('./utils/riskScoring');

// Initialize Express app
const app = express();

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  }
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL || 'http://localhost:3000'
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Debt Recovery API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/clients', clientRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/payments', paymentRoutes);

// Risk scoring management endpoints
app.post('/api/risk/update-all', async (req, res) => {
  try {
    const result = await updateAllRiskScores();
    res.json({
      success: true,
      data: result,
      message: 'Risk scores updated successfully'
    });
  } catch (error) {
    console.error('Error updating risk scores:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating risk scores',
      error: error.message
    });
  }
});

// LLM message generation endpoint (direct access)
app.post('/api/generate-message', async (req, res) => {
  try {
    const { generateMessage } = require('./utils/messageService');
    
    const {
      clientName,
      delayDays,
      outstandingBalance,
      channel,
      messageType = 'reminder',
      customContext = ''
    } = req.body;

    if (!clientName || !outstandingBalance || !channel) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: clientName, outstandingBalance, channel'
      });
    }

    const content = await generateMessage({
      clientName,
      delayDays: delayDays || 0,
      outstandingBalance,
      channel,
      messageType,
      customContext
    });

    res.json({
      success: true,
      data: {
        content,
        parameters: {
          clientName,
          delayDays: delayDays || 0,
          outstandingBalance,
          channel,
          messageType,
          customContext
        }
      }
    });
  } catch (error) {
    console.error('Error generating message:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating message',
      error: error.message
    });
  }
});

// Dashboard statistics endpoint
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const Client = require('./models/Client');
    const Payment = require('./models/Payment');
    const MessageLog = require('./models/MessageLog');

    const [
      totalClients,
      highRiskClients,
      totalOutstanding,
      overduePayments,
      recentMessages
    ] = await Promise.all([
      Client.countDocuments(),
      Client.countDocuments({ riskScore: { $gte: 70 } }),
      Client.aggregate([
        { $group: { _id: null, total: { $sum: '$outstandingBalance' } } }
      ]),
      Payment.countDocuments({ 
        status: { $in: ['overdue', 'pending'] },
        dueDate: { $lt: new Date() }
      }),
      MessageLog.countDocuments({
        timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      })
    ]);

    // Get risk distribution
    const riskDistribution = await Client.aggregate([
      {
        $bucket: {
          groupBy: '$riskScore',
          boundaries: [0, 20, 40, 60, 80, 100],
          default: 'other',
          output: {
            count: { $sum: 1 }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalClients,
          highRiskClients,
          totalOutstanding: totalOutstanding[0]?.total || 0,
          overduePayments,
          recentMessages
        },
        riskDistribution: riskDistribution.reduce((acc, bucket) => {
          const ranges = {
            0: 'minimal',
            20: 'low', 
            40: 'medium',
            60: 'high',
            80: 'critical'
          };
          acc[ranges[bucket._id] || 'other'] = bucket.count;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics',
      error: error.message
    });
  }
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`
    });
  }

  // Default error
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Initialize cron jobs
if (process.env.NODE_ENV !== 'test') {
  initializeRiskScoringCron();
  console.log('Risk scoring cron job initialized');
}

// Start server
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Debt Recovery API Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️  Database: ${process.env.MONGODB_URI ? 'Connected' : 'Configuration needed'}`);
  console.log(`🤖 OpenAI: ${process.env.OPENAI_API_KEY ? 'Configured' : 'Not configured (will use templates)'}`);
  console.log(`📱 Twilio: ${process.env.TWILIO_ACCOUNT_SID ? 'Configured' : 'Not configured (will use mock)'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

module.exports = app;