const mongoose = require('mongoose');

const messageLogSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: [true, 'Client ID is required']
  },
  messageType: {
    type: String,
    enum: {
      values: ['reminder', 'follow-up', 'final', 'payment-confirmation', 'welcome', 'custom'],
      message: 'Message type must be reminder, follow-up, final, payment-confirmation, welcome, or custom'
    },
    required: [true, 'Message type is required']
  },
  channel: {
    type: String,
    enum: {
      values: ['email', 'sms', 'whatsapp'],
      message: 'Channel must be email, sms, or whatsapp'
    },
    required: [true, 'Channel is required']
  },
  content: {
    type: String,
    required: [true, 'Message content is required'],
    maxlength: [2000, 'Message content cannot exceed 2000 characters']
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'sent', 'delivered', 'read', 'failed'],
      message: 'Status must be pending, sent, delivered, read, or failed'
    },
    default: 'pending'
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  // Additional tracking fields
  sentAt: {
    type: Date,
    default: null
  },
  deliveredAt: {
    type: Date,
    default: null
  },
  readAt: {
    type: Date,
    default: null
  },
  failureReason: {
    type: String,
    default: null
  },
  // External service tracking
  externalMessageId: {
    type: String,
    default: null
  },
  cost: {
    type: Number,
    default: 0
  },
  // Response tracking
  responseReceived: {
    type: Boolean,
    default: false
  },
  responseContent: {
    type: String,
    default: null
  },
  responseTimestamp: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for performance
messageLogSchema.index({ clientId: 1, timestamp: -1 });
messageLogSchema.index({ status: 1 });
messageLogSchema.index({ messageType: 1 });
messageLogSchema.index({ channel: 1 });

// Method to update status with timestamp
messageLogSchema.methods.updateStatus = function(newStatus, reason = null) {
  this.status = newStatus;
  
  switch (newStatus) {
    case 'sent':
      this.sentAt = new Date();
      break;
    case 'delivered':
      this.deliveredAt = new Date();
      break;
    case 'read':
      this.readAt = new Date();
      break;
    case 'failed':
      this.failureReason = reason;
      break;
  }
  
  return this.save();
};

// Static method to get message statistics
messageLogSchema.statics.getMessageStats = async function(clientId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const stats = await this.aggregate([
    {
      $match: {
        clientId: new mongoose.Types.ObjectId(clientId),
        timestamp: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
  
  return stats.reduce((acc, stat) => {
    acc[stat._id] = stat.count;
    return acc;
  }, {});
};

module.exports = mongoose.model('MessageLog', messageLogSchema);