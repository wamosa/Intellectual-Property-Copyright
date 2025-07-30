const cron = require('node-cron');
const Client = require('../models/Client');
const Payment = require('../models/Payment');
const MessageLog = require('../models/MessageLog');

/**
 * Calculate comprehensive risk score for a client
 * @param {Object} client - Client document
 * @param {Array} payments - Client's payment history
 * @param {Array} messages - Client's message history
 * @returns {Number} Risk score (0-100)
 */
const calculateRiskScore = async (client, payments = null, messages = null) => {
  try {
    // Fetch related data if not provided
    if (!payments) {
      payments = await Payment.find({ clientId: client._id });
    }
    if (!messages) {
      messages = await MessageLog.find({ clientId: client._id });
    }

    let riskScore = 0;

    // 1. Outstanding Balance Factor (0-25 points)
    const balanceScore = calculateBalanceRisk(client.outstandingBalance);
    riskScore += balanceScore;

    // 2. Payment History Factor (0-30 points)
    const paymentScore = calculatePaymentHistoryRisk(payments);
    riskScore += paymentScore;

    // 3. Communication Response Factor (0-20 points)
    const communicationScore = calculateCommunicationRisk(messages, client.lastContacted);
    riskScore += communicationScore;

    // 4. Account Age Factor (0-10 points)
    const ageScore = calculateAccountAgeRisk(client.accountCreatedDate);
    riskScore += ageScore;

    // 5. Current Status Factor (0-15 points)
    const statusScore = calculateStatusRisk(client.status, payments);
    riskScore += statusScore;

    // Ensure score is within bounds
    return Math.min(Math.max(Math.round(riskScore), 0), 100);
  } catch (error) {
    console.error('Error calculating risk score:', error);
    return client.riskScore || 0; // Return existing score if calculation fails
  }
};

/**
 * Calculate risk based on outstanding balance
 */
const calculateBalanceRisk = (balance) => {
  if (balance >= 50000) return 25;
  if (balance >= 25000) return 20;
  if (balance >= 10000) return 15;
  if (balance >= 5000) return 10;
  if (balance >= 1000) return 5;
  return 0;
};

/**
 * Calculate risk based on payment history
 */
const calculatePaymentHistoryRisk = (payments) => {
  if (!payments || payments.length === 0) return 20; // No payment history is risky

  const now = new Date();
  const overduePayments = payments.filter(p => p.status === 'overdue');
  const totalPayments = payments.length;
  const overdueRatio = overduePayments.length / totalPayments;

  let score = 0;

  // Overdue ratio factor (0-15 points)
  score += overdueRatio * 15;

  // Average days overdue (0-10 points)
  if (overduePayments.length > 0) {
    const avgDaysOverdue = overduePayments.reduce((sum, p) => sum + p.daysOverdue, 0) / overduePayments.length;
    score += Math.min(avgDaysOverdue / 30 * 10, 10);
  }

  // Recent payment behavior (0-5 points)
  const recentPayments = payments.filter(p => {
    const paymentDate = new Date(p.createdAt);
    const daysDiff = (now - paymentDate) / (1000 * 60 * 60 * 24);
    return daysDiff <= 90; // Last 3 months
  });

  if (recentPayments.length > 0) {
    const recentOverdueRatio = recentPayments.filter(p => p.status === 'overdue').length / recentPayments.length;
    score += recentOverdueRatio * 5;
  }

  return Math.min(score, 30);
};

/**
 * Calculate risk based on communication patterns
 */
const calculateCommunicationRisk = (messages, lastContacted) => {
  let score = 0;

  // Days since last contact (0-10 points)
  if (lastContacted) {
    const daysSinceContact = Math.floor((Date.now() - lastContacted.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceContact > 60) score += 10;
    else if (daysSinceContact > 30) score += 7;
    else if (daysSinceContact > 14) score += 4;
    else if (daysSinceContact > 7) score += 2;
  } else {
    score += 8; // Never contacted
  }

  // Message response rate (0-10 points)
  if (messages && messages.length > 0) {
    const responseRate = messages.filter(m => m.responseReceived).length / messages.length;
    score += (1 - responseRate) * 10;
  } else {
    score += 5; // No message history
  }

  return Math.min(score, 20);
};

/**
 * Calculate risk based on account age
 */
const calculateAccountAgeRisk = (accountCreatedDate) => {
  const now = new Date();
  const accountAgeMonths = (now - accountCreatedDate) / (1000 * 60 * 60 * 24 * 30);

  // Newer accounts are riskier
  if (accountAgeMonths < 3) return 10;
  if (accountAgeMonths < 6) return 7;
  if (accountAgeMonths < 12) return 4;
  if (accountAgeMonths < 24) return 2;
  return 0;
};

/**
 * Calculate risk based on current status and recent activity
 */
const calculateStatusRisk = (status, payments) => {
  let score = 0;

  // Base status risk
  switch (status) {
    case 'delinquent':
      score += 15;
      break;
    case 'active':
      score += 0;
      break;
    case 'recovered':
      score -= 5; // Negative risk for recovered accounts
      break;
  }

  // Recent overdue payments increase risk
  const now = new Date();
  const recentOverdue = payments.filter(p => {
    const daysSinceCreated = (now - new Date(p.createdAt)) / (1000 * 60 * 60 * 24);
    return daysSinceCreated <= 30 && p.status === 'overdue';
  });

  score += recentOverdue.length * 2;

  return Math.min(Math.max(score, 0), 15);
};

/**
 * Update risk scores for all clients
 */
const updateAllRiskScores = async () => {
  try {
    console.log('Starting risk score update for all clients...');
    
    const clients = await Client.find({});
    let updatedCount = 0;

    for (const client of clients) {
      try {
        const payments = await Payment.find({ clientId: client._id });
        const messages = await MessageLog.find({ clientId: client._id });
        
        const newRiskScore = await calculateRiskScore(client, payments, messages);
        
        if (client.riskScore !== newRiskScore) {
          client.riskScore = newRiskScore;
          await client.save();
          updatedCount++;
        }
      } catch (error) {
        console.error(`Error updating risk score for client ${client._id}:`, error);
      }
    }

    console.log(`Risk score update completed. Updated ${updatedCount} out of ${clients.length} clients.`);
    return { total: clients.length, updated: updatedCount };
  } catch (error) {
    console.error('Error in updateAllRiskScores:', error);
    throw error;
  }
};

/**
 * Get high-risk clients (risk score > threshold)
 */
const getHighRiskClients = async (threshold = 70) => {
  try {
    return await Client.find({ 
      riskScore: { $gt: threshold },
      status: { $ne: 'recovered' }
    }).sort({ riskScore: -1 });
  } catch (error) {
    console.error('Error fetching high-risk clients:', error);
    throw error;
  }
};

/**
 * Initialize cron job for daily risk score updates
 */
const initializeRiskScoringCron = () => {
  const cronExpression = process.env.RISK_UPDATE_CRON || '0 2 * * *'; // Default: Daily at 2 AM
  
  cron.schedule(cronExpression, async () => {
    console.log('Running scheduled risk score update...');
    try {
      await updateAllRiskScores();
    } catch (error) {
      console.error('Scheduled risk score update failed:', error);
    }
  }, {
    scheduled: true,
    timezone: "UTC"
  });

  console.log(`Risk scoring cron job initialized with expression: ${cronExpression}`);
};

/**
 * Get risk level description
 */
const getRiskLevel = (score) => {
  if (score >= 80) return { level: 'critical', color: 'red' };
  if (score >= 60) return { level: 'high', color: 'orange' };
  if (score >= 40) return { level: 'medium', color: 'yellow' };
  if (score >= 20) return { level: 'low', color: 'green' };
  return { level: 'minimal', color: 'blue' };
};

module.exports = {
  calculateRiskScore,
  updateAllRiskScores,
  getHighRiskClients,
  initializeRiskScoringCron,
  getRiskLevel,
  // Export individual calculators for testing
  calculateBalanceRisk,
  calculatePaymentHistoryRisk,
  calculateCommunicationRisk,
  calculateAccountAgeRisk,
  calculateStatusRisk
};