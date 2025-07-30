# 🏦 Debt Recovery System

A comprehensive full-stack MERN application for managing debt recovery operations with intelligent risk scoring, automated messaging, and LLM-powered communication tools.

## 🌟 Features

### 🎯 Core Functionality
- **Client Management**: Complete CRUD operations for client data with risk assessment
- **Risk Scoring System**: Automated risk calculation based on payment history, communication patterns, and account age
- **Automated Messaging**: Multi-channel communication via Email, SMS, and WhatsApp
- **Payment Tracking**: Comprehensive payment management and overdue monitoring
- **LLM Integration**: AI-powered message generation using OpenAI GPT-3.5 (with fallback templates)

### 📊 Dashboard & Analytics
- Real-time dashboard with key metrics and risk distribution
- Interactive charts and visualizations
- High-risk client identification and management
- Message delivery tracking and analytics

### 🔧 Technical Features
- **RESTful API**: Complete backend API with proper error handling
- **Real-time Updates**: Automated risk score updates via cron jobs
- **Responsive Design**: Modern UI built with Tailwind CSS
- **Docker Support**: Full containerization for easy deployment
- **Mock Integrations**: Stub implementations for Twilio and OpenAI (works without API keys)

## 🏗️ Architecture

```
debt-recovery-system/
├── backend/                 # Express.js API server
│   ├── src/
│   │   ├── models/         # MongoDB schemas (Client, MessageLog, Payment)
│   │   ├── routes/         # API routes
│   │   ├── controllers/    # Business logic
│   │   ├── utils/          # Utilities (risk scoring, messaging)
│   │   └── server.js       # Main server file
│   ├── config/             # Database configuration
│   └── Dockerfile
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── utils/          # API utilities
│   │   └── App.js
│   ├── public/
│   └── Dockerfile
├── docker-compose.yml      # Full stack orchestration
├── mongo-init.js          # Database initialization with sample data
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)
- MongoDB (if running locally)

### Option 1: Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd debt-recovery-system
   ```

2. **Start the application**
   ```bash
   docker-compose up -d
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - MongoDB: localhost:27017

4. **View logs**
   ```bash
   docker-compose logs -f
   ```

### Option 2: Local Development

1. **Setup Backend**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your configuration
   npm install
   npm run dev
   ```

2. **Setup Frontend**
   ```bash
   cd frontend
   npm install
   npm start
   ```

3. **Setup MongoDB**
   - Install MongoDB locally or use MongoDB Atlas
   - Update MONGODB_URI in backend/.env

## 📋 API Documentation

### 🔗 Base URL
- Development: `http://localhost:5000/api`
- Docker: `http://localhost:5000/api`

### 👥 Clients API
```
GET    /api/clients              # Get all clients (with filtering)
GET    /api/clients/:id          # Get client by ID
POST   /api/clients              # Create new client
PUT    /api/clients/:id          # Update client
DELETE /api/clients/:id          # Delete client
GET    /api/clients/high-risk    # Get high-risk clients
PUT    /api/clients/:id/risk-score # Update risk score
GET    /api/clients/stats        # Get client statistics
```

### 💬 Messages API
```
POST   /api/messages/generate    # Generate AI message
POST   /api/messages/send        # Send message to client
GET    /api/messages             # Get all messages
GET    /api/messages/client/:id  # Get client messages
POST   /api/messages/bulk-send   # Send bulk messages
GET    /api/messages/stats       # Get message statistics
```

### 💳 Payments API
```
GET    /api/payments             # Get all payments
GET    /api/payments/:id         # Get payment by ID
POST   /api/payments             # Create payment
PUT    /api/payments/:id         # Update payment
PUT    /api/payments/:id/mark-paid # Mark as paid
GET    /api/payments/overdue     # Get overdue payments
```

### 🎯 Special Endpoints
```
POST   /api/generate-message     # Direct LLM message generation
GET    /api/dashboard/stats      # Dashboard statistics
POST   /api/risk/update-all      # Update all risk scores
GET    /api/health               # Health check
```

## 🎨 Frontend Pages

### 📊 Dashboard
- Key metrics overview
- Risk distribution chart
- High-risk clients list
- Recent activity feed
- Quick actions panel

### 👥 Client Management
- Client list with filtering and sorting
- Individual client profiles
- Risk history visualization
- Message timeline
- Payment tracking

### 💬 Message Center
- AI-powered message composition
- Message history and status tracking
- Bulk messaging capabilities
- Template management

### 💳 Payment Management
- Payment tracking and history
- Overdue payment monitoring
- Payment recording and updates
- Financial analytics

## ⚙️ Configuration

### 🔐 Environment Variables

**Backend (.env)**
```env
# Database
MONGODB_URI=mongodb://localhost:27017/debt_recovery
NODE_ENV=development
PORT=5000

# Security
JWT_SECRET=your_jwt_secret_key_here

# OpenAI (Optional)
OPENAI_API_KEY=your_openai_api_key_here

# Twilio (Optional)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Cron Jobs
RISK_UPDATE_CRON=0 2 * * *  # Daily at 2 AM
```

**Frontend (.env)**
```env
REACT_APP_API_URL=http://localhost:5000/api
```

### 🤖 LLM Integration

The system supports OpenAI GPT-3.5 for intelligent message generation:

1. **With API Key**: Provides AI-generated, context-aware messages
2. **Without API Key**: Falls back to professional templates

**Message Generation Example:**
```javascript
POST /api/generate-message
{
  "clientName": "John Smith",
  "delayDays": 15,
  "outstandingBalance": 5000,
  "channel": "email",
  "messageType": "reminder"
}
```

### 📱 Communication Channels

**Supported Channels:**
- **Email**: Mock implementation (easily replaceable with SendGrid/AWS SES)
- **SMS**: Twilio integration with mock fallback
- **WhatsApp**: Twilio WhatsApp Business API with mock fallback

## 📈 Risk Scoring Algorithm

The system calculates risk scores (0-100) based on:

1. **Outstanding Balance** (0-25 points)
2. **Payment History** (0-30 points)
3. **Communication Response** (0-20 points)
4. **Account Age** (0-10 points)
5. **Current Status** (0-15 points)

**Risk Levels:**
- 🔵 Minimal (0-19): Low risk
- 🟢 Low (20-39): Manageable risk
- 🟡 Medium (40-59): Moderate attention needed
- 🟠 High (60-79): High priority
- 🔴 Critical (80-100): Immediate action required

## 🔄 Automated Features

### ⏰ Cron Jobs
- **Daily Risk Updates**: Recalculates all client risk scores
- **Configurable Schedule**: Customizable via environment variables

### 🤖 Automated Messaging
- Risk-based message type selection
- Channel preference respect
- Response tracking and follow-up

## 🐳 Docker Configuration

The application includes complete Docker support:

- **Multi-stage builds** for optimized images
- **Health checks** for all services
- **Volume persistence** for MongoDB data
- **Network isolation** for security
- **Production-ready** nginx configuration

## 📊 Sample Data

The system includes comprehensive sample data:
- 5 diverse client profiles with varying risk levels
- Payment history and overdue scenarios
- Message logs with different statuses
- Realistic financial data for testing

## 🔒 Security Features

- **Helmet.js** for security headers
- **Rate limiting** on API endpoints
- **Input validation** and sanitization
- **Error handling** without data exposure
- **CORS configuration** for cross-origin requests

## 🚀 Deployment

### Production Deployment
1. Update environment variables for production
2. Configure external MongoDB (MongoDB Atlas recommended)
3. Set up API keys for OpenAI and Twilio
4. Deploy using Docker Compose or container orchestration

### Scaling Considerations
- MongoDB replica sets for high availability
- Load balancer for multiple backend instances
- CDN for frontend static assets
- Message queue for bulk operations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
1. Check the API documentation above
2. Review the sample data and configurations
3. Check Docker logs for debugging
4. Ensure all environment variables are properly set

## 🎯 Future Enhancements

- [ ] Advanced analytics and reporting
- [ ] Mobile application
- [ ] Integration with accounting systems
- [ ] Advanced AI features (sentiment analysis, predictive modeling)
- [ ] Multi-tenant support
- [ ] Advanced workflow automation

---

**Built with ❤️ using the MERN Stack**

*Ready to revolutionize your debt recovery operations!* 🚀
