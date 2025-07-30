const Client = require('../models/Client');
const Payment = require('../models/Payment');
const MessageLog = require('../models/MessageLog');
const { calculateRiskScore, getHighRiskClients } = require('../utils/riskScoring');

/**
 * Get all clients with filtering and pagination
 */
const getClients = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      channel,
      riskLevel,
      search,
      sortBy = 'riskScore',
      sortOrder = 'desc'
    } = req.query;

    // Build filter query
    const filter = {};
    
    if (status) filter.status = status;
    if (channel) filter.preferredChannel = channel;
    
    if (riskLevel) {
      const riskRanges = {
        critical: { $gte: 80 },
        high: { $gte: 60, $lt: 80 },
        medium: { $gte: 40, $lt: 60 },
        low: { $gte: 20, $lt: 40 },
        minimal: { $lt: 20 }
      };
      filter.riskScore = riskRanges[riskLevel];
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const clients = await Client.find(filter)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    // Get total count for pagination
    const total = await Client.countDocuments(filter);

    // Add risk level to each client
    const clientsWithRiskLevel = clients.map(client => ({
      ...client,
      riskLevel: getRiskLevel(client.riskScore)
    }));

    res.json({
      success: true,
      data: clientsWithRiskLevel,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching clients',
      error: error.message
    });
  }
};

/**
 * Get single client by ID with detailed information
 */
const getClientById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const client = await Client.findById(id).lean();
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Get related data
    const [payments, messages] = await Promise.all([
      Payment.find({ clientId: id }).sort({ dueDate: -1 }),
      MessageLog.find({ clientId: id }).sort({ timestamp: -1 }).limit(20)
    ]);

    // Calculate payment summary
    const paymentSummary = await Payment.getClientPaymentSummary(id);
    
    // Get message statistics
    const messageStats = await MessageLog.getMessageStats(id);

    // Add risk level
    const riskLevel = getRiskLevel(client.riskScore);

    res.json({
      success: true,
      data: {
        ...client,
        riskLevel,
        payments,
        messages,
        paymentSummary,
        messageStats
      }
    });
  } catch (error) {
    console.error('Error fetching client:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching client',
      error: error.message
    });
  }
};

/**
 * Create new client
 */
const createClient = async (req, res) => {
  try {
    const clientData = req.body;
    
    // Check if client with email already exists
    const existingClient = await Client.findOne({ email: clientData.email });
    if (existingClient) {
      return res.status(400).json({
        success: false,
        message: 'Client with this email already exists'
      });
    }

    const client = new Client(clientData);
    
    // Calculate initial risk score
    const riskScore = await calculateRiskScore(client);
    client.riskScore = riskScore;
    
    await client.save();

    res.status(201).json({
      success: true,
      data: client,
      message: 'Client created successfully'
    });
  } catch (error) {
    console.error('Error creating client:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map(e => e.message)
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating client',
      error: error.message
    });
  }
};

/**
 * Update client
 */
const updateClient = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if email is being updated and if it conflicts
    if (updateData.email) {
      const existingClient = await Client.findOne({ 
        email: updateData.email,
        _id: { $ne: id }
      });
      
      if (existingClient) {
        return res.status(400).json({
          success: false,
          message: 'Client with this email already exists'
        });
      }
    }

    const client = await Client.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Recalculate risk score if relevant fields were updated
    const riskRelevantFields = ['outstandingBalance', 'status', 'lastContacted'];
    const shouldRecalculateRisk = riskRelevantFields.some(field => updateData.hasOwnProperty(field));
    
    if (shouldRecalculateRisk) {
      const newRiskScore = await calculateRiskScore(client);
      client.riskScore = newRiskScore;
      await client.save();
    }

    res.json({
      success: true,
      data: client,
      message: 'Client updated successfully'
    });
  } catch (error) {
    console.error('Error updating client:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map(e => e.message)
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error updating client',
      error: error.message
    });
  }
};

/**
 * Delete client
 */
const deleteClient = async (req, res) => {
  try {
    const { id } = req.params;

    const client = await Client.findByIdAndDelete(id);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Optionally delete related data (payments, messages)
    // In production, you might want to soft delete or archive instead
    await Promise.all([
      Payment.deleteMany({ clientId: id }),
      MessageLog.deleteMany({ clientId: id })
    ]);

    res.json({
      success: true,
      message: 'Client deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting client',
      error: error.message
    });
  }
};

/**
 * Get high-risk clients
 */
const getHighRiskClientsController = async (req, res) => {
  try {
    const { threshold = 70 } = req.query;
    
    const highRiskClients = await getHighRiskClients(parseInt(threshold));
    
    const clientsWithRiskLevel = highRiskClients.map(client => ({
      ...client.toObject(),
      riskLevel: getRiskLevel(client.riskScore)
    }));

    res.json({
      success: true,
      data: clientsWithRiskLevel,
      count: clientsWithRiskLevel.length
    });
  } catch (error) {
    console.error('Error fetching high-risk clients:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching high-risk clients',
      error: error.message
    });
  }
};

/**
 * Update client risk score manually
 */
const updateClientRiskScore = async (req, res) => {
  try {
    const { id } = req.params;
    
    const client = await Client.findById(id);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    const newRiskScore = await calculateRiskScore(client);
    client.riskScore = newRiskScore;
    await client.save();

    res.json({
      success: true,
      data: {
        clientId: id,
        oldRiskScore: client.riskScore,
        newRiskScore,
        riskLevel: getRiskLevel(newRiskScore)
      },
      message: 'Risk score updated successfully'
    });
  } catch (error) {
    console.error('Error updating risk score:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating risk score',
      error: error.message
    });
  }
};

/**
 * Get client dashboard statistics
 */
const getClientStats = async (req, res) => {
  try {
    const [
      totalClients,
      activeClients,
      delinquentClients,
      recoveredClients,
      highRiskCount,
      avgRiskScore
    ] = await Promise.all([
      Client.countDocuments(),
      Client.countDocuments({ status: 'active' }),
      Client.countDocuments({ status: 'delinquent' }),
      Client.countDocuments({ status: 'recovered' }),
      Client.countDocuments({ riskScore: { $gte: 70 } }),
      Client.aggregate([
        { $group: { _id: null, avgRisk: { $avg: '$riskScore' } } }
      ])
    ]);

    // Get risk distribution
    const riskDistribution = await Client.aggregate([
      {
        $bucket: {
          groupBy: '$riskScore',
          boundaries: [0, 20, 40, 60, 80, 100],
          default: 'other',
          output: {
            count: { $sum: 1 },
            clients: { $push: { name: '$name', riskScore: '$riskScore' } }
          }
        }
      }
    ]);

    // Get total outstanding balance
    const balanceStats = await Client.aggregate([
      {
        $group: {
          _id: null,
          totalOutstanding: { $sum: '$outstandingBalance' },
          avgOutstanding: { $avg: '$outstandingBalance' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        totalClients,
        clientsByStatus: {
          active: activeClients,
          delinquent: delinquentClients,
          recovered: recoveredClients
        },
        riskMetrics: {
          highRiskCount,
          averageRiskScore: avgRiskScore[0]?.avgRisk || 0,
          distribution: riskDistribution
        },
        financialMetrics: {
          totalOutstanding: balanceStats[0]?.totalOutstanding || 0,
          averageOutstanding: balanceStats[0]?.avgOutstanding || 0
        }
      }
    });
  } catch (error) {
    console.error('Error fetching client statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
};

/**
 * Helper function to get risk level description
 */
const getRiskLevel = (score) => {
  if (score >= 80) return { level: 'critical', color: 'red' };
  if (score >= 60) return { level: 'high', color: 'orange' };
  if (score >= 40) return { level: 'medium', color: 'yellow' };
  if (score >= 20) return { level: 'low', color: 'green' };
  return { level: 'minimal', color: 'blue' };
};

module.exports = {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  getHighRiskClientsController,
  updateClientRiskScore,
  getClientStats
};