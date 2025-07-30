const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const Client = require('../models/Client');
const { calculateRiskScore } = require('../utils/riskScoring');

// GET /api/payments - Get all payments with filtering
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      clientId,
      overdue,
      sortBy = 'dueDate',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (clientId) filter.clientId = clientId;
    if (overdue === 'true') {
      filter.status = { $in: ['pending', 'overdue'] };
      filter.dueDate = { $lt: new Date() };
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const payments = await Payment.find(filter)
      .populate('clientId', 'name email phone riskScore')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Payment.countDocuments(filter);

    res.json({
      success: true,
      data: payments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payments',
      error: error.message
    });
  }
});

// GET /api/payments/overdue - Get overdue payments
router.get('/overdue', async (req, res) => {
  try {
    const { clientId } = req.query;
    const overduePayments = await Payment.getOverduePayments(clientId);

    res.json({
      success: true,
      data: overduePayments,
      count: overduePayments.length
    });
  } catch (error) {
    console.error('Error fetching overdue payments:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching overdue payments',
      error: error.message
    });
  }
});

// GET /api/payments/client/:clientId - Get payments for specific client
router.get('/client/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const payments = await Payment.find({ clientId })
      .sort({ dueDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Payment.countDocuments({ clientId });
    const summary = await Payment.getClientPaymentSummary(clientId);

    res.json({
      success: true,
      data: payments,
      summary,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching client payments:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching client payments',
      error: error.message
    });
  }
});

// GET /api/payments/:id - Get single payment
router.get('/:id', async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('clientId', 'name email phone');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment',
      error: error.message
    });
  }
});

// POST /api/payments - Create new payment
router.post('/', async (req, res) => {
  try {
    const paymentData = req.body;

    // Verify client exists
    const client = await Client.findById(paymentData.clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    const payment = new Payment(paymentData);
    await payment.save();

    // Update client's outstanding balance if needed
    if (paymentData.amount) {
      client.outstandingBalance += paymentData.amount;
      await client.save();
    }

    res.status(201).json({
      success: true,
      data: payment,
      message: 'Payment created successfully'
    });
  } catch (error) {
    console.error('Error creating payment:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map(e => e.message)
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating payment',
      error: error.message
    });
  }
});

// PUT /api/payments/:id - Update payment
router.put('/:id', async (req, res) => {
  try {
    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('clientId', 'name email phone');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.json({
      success: true,
      data: payment,
      message: 'Payment updated successfully'
    });
  } catch (error) {
    console.error('Error updating payment:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map(e => e.message)
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error updating payment',
      error: error.message
    });
  }
});

// PUT /api/payments/:id/mark-paid - Mark payment as paid
router.put('/:id/mark-paid', async (req, res) => {
  try {
    const { amount, paymentMethod, transactionId } = req.body;
    
    const payment = await Payment.findById(req.params.id).populate('clientId');
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    await payment.markAsPaid(amount, paymentMethod, transactionId);

    // Update client's outstanding balance
    const paidAmount = amount || payment.amount;
    const client = payment.clientId;
    client.outstandingBalance = Math.max(0, client.outstandingBalance - paidAmount);
    
    // Recalculate risk score
    const newRiskScore = await calculateRiskScore(client);
    client.riskScore = newRiskScore;
    await client.save();

    res.json({
      success: true,
      data: payment,
      message: 'Payment marked as paid successfully'
    });
  } catch (error) {
    console.error('Error marking payment as paid:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking payment as paid',
      error: error.message
    });
  }
});

// DELETE /api/payments/:id - Delete payment
router.delete('/:id', async (req, res) => {
  try {
    const payment = await Payment.findByIdAndDelete(req.params.id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.json({
      success: true,
      message: 'Payment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting payment',
      error: error.message
    });
  }
});

// GET /api/payments/stats/summary - Get payment statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const [
      totalPayments,
      paidPayments,
      overduePayments,
      pendingPayments,
      totalAmount,
      paidAmount
    ] = await Promise.all([
      Payment.countDocuments(),
      Payment.countDocuments({ status: 'paid' }),
      Payment.countDocuments({ status: 'overdue' }),
      Payment.countDocuments({ status: 'pending' }),
      Payment.aggregate([
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Payment.aggregate([
        { $match: { status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amountPaid' } } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        totalPayments,
        paymentsByStatus: {
          paid: paidPayments,
          overdue: overduePayments,
          pending: pendingPayments
        },
        financialSummary: {
          totalAmount: totalAmount[0]?.total || 0,
          paidAmount: paidAmount[0]?.total || 0,
          outstandingAmount: (totalAmount[0]?.total || 0) - (paidAmount[0]?.total || 0)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching payment statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment statistics',
      error: error.message
    });
  }
});

module.exports = router;