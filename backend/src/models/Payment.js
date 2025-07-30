const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: [true, 'Client ID is required']
  },
  amount: {
    type: Number,
    required: [true, 'Payment amount is required'],
    min: [0.01, 'Payment amount must be greater than 0']
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required']
  },
  paidDate: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'paid', 'overdue', 'partial', 'cancelled'],
      message: 'Status must be pending, paid, overdue, partial, or cancelled'
    },
    default: 'pending'
  },
  // Payment details
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'credit_card', 'debit_card', 'cash', 'check', 'other'],
    default: null
  },
  transactionId: {
    type: String,
    default: null
  },
  amountPaid: {
    type: Number,
    default: 0,
    min: [0, 'Amount paid cannot be negative']
  },
  // Late payment tracking
  daysOverdue: {
    type: Number,
    default: 0
  },
  lateFee: {
    type: Number,
    default: 0,
    min: [0, 'Late fee cannot be negative']
  },
  // Notes and references
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  invoiceNumber: {
    type: String,
    default: null
  },
  // Reminder tracking
  remindersSent: {
    type: Number,
    default: 0
  },
  lastReminderDate: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for performance
paymentSchema.index({ clientId: 1, dueDate: -1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ dueDate: 1 });

// Virtual for checking if payment is overdue
paymentSchema.virtual('isOverdue').get(function() {
  return this.status === 'pending' && new Date() > this.dueDate;
});

// Virtual for days until due (negative if overdue)
paymentSchema.virtual('daysUntilDue').get(function() {
  const today = new Date();
  const diffTime = this.dueDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Method to mark payment as paid
paymentSchema.methods.markAsPaid = function(amount = null, paymentMethod = null, transactionId = null) {
  this.paidDate = new Date();
  this.amountPaid = amount || this.amount;
  this.status = this.amountPaid >= this.amount ? 'paid' : 'partial';
  
  if (paymentMethod) this.paymentMethod = paymentMethod;
  if (transactionId) this.transactionId = transactionId;
  
  return this.save();
};

// Method to update overdue status
paymentSchema.methods.updateOverdueStatus = function() {
  if (this.status === 'pending' && new Date() > this.dueDate) {
    this.status = 'overdue';
    this.daysOverdue = Math.floor((new Date() - this.dueDate) / (1000 * 60 * 60 * 24));
  }
  return this.save();
};

// Static method to get overdue payments
paymentSchema.statics.getOverduePayments = function(clientId = null) {
  const query = {
    status: { $in: ['pending', 'overdue'] },
    dueDate: { $lt: new Date() }
  };
  
  if (clientId) {
    query.clientId = clientId;
  }
  
  return this.find(query).populate('clientId');
};

// Static method to get payment summary for a client
paymentSchema.statics.getClientPaymentSummary = async function(clientId) {
  const summary = await this.aggregate([
    { $match: { clientId: new mongoose.Types.ObjectId(clientId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        totalPaid: { $sum: '$amountPaid' }
      }
    }
  ]);
  
  return summary.reduce((acc, item) => {
    acc[item._id] = {
      count: item.count,
      totalAmount: item.totalAmount,
      totalPaid: item.totalPaid
    };
    return acc;
  }, {});
};

// Pre-save middleware to update overdue status
paymentSchema.pre('save', function(next) {
  if (this.status === 'pending' && new Date() > this.dueDate) {
    this.status = 'overdue';
    this.daysOverdue = Math.floor((new Date() - this.dueDate) / (1000 * 60 * 60 * 24));
  }
  next();
});

module.exports = mongoose.model('Payment', paymentSchema);