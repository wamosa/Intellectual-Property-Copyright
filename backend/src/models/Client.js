const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Client name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^\+?[\d\s-()]+$/, 'Please enter a valid phone number']
  },
  riskScore: {
    type: Number,
    default: 0,
    min: [0, 'Risk score cannot be negative'],
    max: [100, 'Risk score cannot exceed 100']
  },
  lastContacted: {
    type: Date,
    default: null
  },
  preferredChannel: {
    type: String,
    enum: {
      values: ['email', 'sms', 'whatsapp'],
      message: 'Preferred channel must be email, sms, or whatsapp'
    },
    default: 'email'
  },
  outstandingBalance: {
    type: Number,
    required: [true, 'Outstanding balance is required'],
    min: [0, 'Outstanding balance cannot be negative']
  },
  status: {
    type: String,
    enum: {
      values: ['active', 'delinquent', 'recovered'],
      message: 'Status must be active, delinquent, or recovered'
    },
    default: 'active'
  },
  // Additional fields for better risk assessment
  accountCreatedDate: {
    type: Date,
    default: Date.now
  },
  lastPaymentDate: {
    type: Date,
    default: null
  },
  totalMissedPayments: {
    type: Number,
    default: 0
  },
  averagePaymentDelay: {
    type: Number,
    default: 0
  },
  contactHistory: [{
    date: Date,
    channel: String,
    response: Boolean
  }]
}, {
  timestamps: true
});

// Index for performance
clientSchema.index({ riskScore: -1 });
clientSchema.index({ status: 1 });
clientSchema.index({ email: 1 });

// Virtual for days since last contact
clientSchema.virtual('daysSinceLastContact').get(function() {
  if (!this.lastContacted) return null;
  return Math.floor((Date.now() - this.lastContacted.getTime()) / (1000 * 60 * 60 * 24));
});

// Method to update risk score
clientSchema.methods.updateRiskScore = function() {
  let score = 0;
  
  // Outstanding balance factor (0-30 points)
  if (this.outstandingBalance > 10000) score += 30;
  else if (this.outstandingBalance > 5000) score += 20;
  else if (this.outstandingBalance > 1000) score += 10;
  
  // Payment delay factor (0-25 points)
  score += Math.min(this.averagePaymentDelay * 2, 25);
  
  // Missed payments factor (0-20 points)
  score += Math.min(this.totalMissedPayments * 5, 20);
  
  // Days since last contact factor (0-15 points)
  const daysSinceContact = this.daysSinceLastContact;
  if (daysSinceContact > 30) score += 15;
  else if (daysSinceContact > 14) score += 10;
  else if (daysSinceContact > 7) score += 5;
  
  // Contact response rate factor (0-10 points)
  if (this.contactHistory.length > 0) {
    const responseRate = this.contactHistory.filter(c => c.response).length / this.contactHistory.length;
    score += Math.floor((1 - responseRate) * 10);
  }
  
  this.riskScore = Math.min(Math.max(score, 0), 100);
  return this.riskScore;
};

module.exports = mongoose.model('Client', clientSchema);