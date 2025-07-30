const MessageLog = require('../models/MessageLog');
const Client = require('../models/Client');
const { generateMessage, sendMessage, sendAutomatedReminder } = require('../utils/messageService');

/**
 * Generate message using LLM
 */
const generateMessageContent = async (req, res) => {
  try {
    const {
      clientName,
      delayDays,
      outstandingBalance,
      channel,
      messageType = 'reminder',
      customContext = ''
    } = req.body;

    // Validate required fields
    if (!clientName || !outstandingBalance || !channel) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: clientName, outstandingBalance, channel'
      });
    }

    // Generate message content
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
};

/**
 * Send message to client
 */
const sendMessageToClient = async (req, res) => {
  try {
    const {
      clientId,
      content,
      channel,
      messageType = 'custom'
    } = req.body;

    // Validate required fields
    if (!clientId || !content || !channel) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: clientId, content, channel'
      });
    }

    // Verify client exists
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Send message
    const result = await sendMessage({
      clientId,
      content,
      channel,
      messageType
    });

    res.json({
      success: true,
      data: result,
      message: 'Message sent successfully'
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending message',
      error: error.message
    });
  }
};

/**
 * Get message history for a client
 */
const getClientMessages = async (req, res) => {
  try {
    const { clientId } = req.params;
    const {
      page = 1,
      limit = 20,
      messageType,
      channel,
      status
    } = req.query;

    // Build filter
    const filter = { clientId };
    if (messageType) filter.messageType = messageType;
    if (channel) filter.channel = channel;
    if (status) filter.status = status;

    // Get messages with pagination
    const messages = await MessageLog.find(filter)
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('clientId', 'name email phone');

    const total = await MessageLog.countDocuments(filter);

    res.json({
      success: true,
      data: messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching messages',
      error: error.message
    });
  }
};

/**
 * Get all messages with filtering
 */
const getAllMessages = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      messageType,
      channel,
      status,
      search,
      sortBy = 'timestamp',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filter = {};
    if (messageType) filter.messageType = messageType;
    if (channel) filter.channel = channel;
    if (status) filter.status = status;

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Build aggregation pipeline
    const pipeline = [
      { $match: filter },
      {
        $lookup: {
          from: 'clients',
          localField: 'clientId',
          foreignField: '_id',
          as: 'client'
        }
      },
      { $unwind: '$client' }
    ];

    // Add search filter if provided
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { 'client.name': { $regex: search, $options: 'i' } },
            { 'client.email': { $regex: search, $options: 'i' } },
            { content: { $regex: search, $options: 'i' } }
          ]
        }
      });
    }

    // Add sorting and pagination
    pipeline.push(
      { $sort: sort },
      { $skip: (page - 1) * limit },
      { $limit: parseInt(limit) }
    );

    const messages = await MessageLog.aggregate(pipeline);

    // Get total count
    const countPipeline = [...pipeline];
    countPipeline.pop(); // Remove limit
    countPipeline.pop(); // Remove skip
    countPipeline.pop(); // Remove sort
    countPipeline.push({ $count: 'total' });
    
    const countResult = await MessageLog.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    res.json({
      success: true,
      data: messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching all messages:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching messages',
      error: error.message
    });
  }
};

/**
 * Update message status (for webhooks from external services)
 */
const updateMessageStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    const message = await MessageLog.findById(id);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    await message.updateStatus(status, reason);

    res.json({
      success: true,
      data: message,
      message: 'Message status updated successfully'
    });
  } catch (error) {
    console.error('Error updating message status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating message status',
      error: error.message
    });
  }
};

/**
 * Send automated reminder to client
 */
const sendAutomatedReminderToClient = async (req, res) => {
  try {
    const { clientId } = req.params;

    const result = await sendAutomatedReminder(clientId);

    res.json({
      success: true,
      data: result,
      message: 'Automated reminder sent successfully'
    });
  } catch (error) {
    console.error('Error sending automated reminder:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending automated reminder',
      error: error.message
    });
  }
};

/**
 * Get message statistics
 */
const getMessageStats = async (req, res) => {
  try {
    const { clientId, days = 30 } = req.query;

    let matchStage = {};
    
    // Date filter
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    matchStage.timestamp = { $gte: startDate };

    // Client filter
    if (clientId) {
      matchStage.clientId = new mongoose.Types.ObjectId(clientId);
    }

    const stats = await MessageLog.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalMessages: { $sum: 1 },
          byStatus: {
            $push: {
              status: '$status',
              channel: '$channel',
              messageType: '$messageType'
            }
          }
        }
      },
      {
        $project: {
          totalMessages: 1,
          statusBreakdown: {
            $reduce: {
              input: '$byStatus',
              initialValue: {},
              in: {
                $mergeObjects: [
                  '$$value',
                  {
                    $arrayToObject: [
                      [{ k: '$$this.status', v: { $add: [{ $ifNull: [{ $getField: { field: '$$this.status', input: '$$value' } }, 0] }, 1] } }]
                    ]
                  }
                ]
              }
            }
          },
          channelBreakdown: {
            $reduce: {
              input: '$byStatus',
              initialValue: {},
              in: {
                $mergeObjects: [
                  '$$value',
                  {
                    $arrayToObject: [
                      [{ k: '$$this.channel', v: { $add: [{ $ifNull: [{ $getField: { field: '$$this.channel', input: '$$value' } }, 0] }, 1] } }]
                    ]
                  }
                ]
              }
            }
          },
          typeBreakdown: {
            $reduce: {
              input: '$byStatus',
              initialValue: {},
              in: {
                $mergeObjects: [
                  '$$value',
                  {
                    $arrayToObject: [
                      [{ k: '$$this.messageType', v: { $add: [{ $ifNull: [{ $getField: { field: '$$this.messageType', input: '$$value' } }, 0] }, 1] } }]
                    ]
                  }
                ]
              }
            }
          }
        }
      }
    ]);

    // Get success rate
    const successRate = await MessageLog.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          successful: {
            $sum: {
              $cond: [
                { $in: ['$status', ['sent', 'delivered', 'read']] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          successRate: {
            $multiply: [
              { $divide: ['$successful', '$total'] },
              100
            ]
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        period: `${days} days`,
        ...(stats[0] || { totalMessages: 0 }),
        successRate: successRate[0]?.successRate || 0
      }
    });
  } catch (error) {
    console.error('Error fetching message statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching message statistics',
      error: error.message
    });
  }
};

/**
 * Bulk send messages to multiple clients
 */
const bulkSendMessages = async (req, res) => {
  try {
    const { clientIds, messageTemplate, channel, messageType = 'bulk' } = req.body;

    if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'clientIds array is required'
      });
    }

    const results = [];
    const errors = [];

    for (const clientId of clientIds) {
      try {
        const client = await Client.findById(clientId);
        if (!client) {
          errors.push({ clientId, error: 'Client not found' });
          continue;
        }

        // Generate personalized message if template is provided
        let content = messageTemplate;
        if (messageTemplate) {
          content = messageTemplate
            .replace(/\{name\}/g, client.name)
            .replace(/\{balance\}/g, client.outstandingBalance)
            .replace(/\{email\}/g, client.email);
        } else {
          // Generate using AI/template
          content = await generateMessage({
            clientName: client.name,
            delayDays: client.daysSinceLastContact || 0,
            outstandingBalance: client.outstandingBalance,
            channel: channel || client.preferredChannel,
            messageType
          });
        }

        const result = await sendMessage({
          clientId,
          content,
          channel: channel || client.preferredChannel,
          messageType
        });

        results.push({ clientId, result });
      } catch (error) {
        errors.push({ clientId, error: error.message });
      }
    }

    res.json({
      success: true,
      data: {
        successful: results.length,
        failed: errors.length,
        results,
        errors
      },
      message: `Bulk message operation completed. ${results.length} successful, ${errors.length} failed.`
    });
  } catch (error) {
    console.error('Error in bulk send messages:', error);
    res.status(500).json({
      success: false,
      message: 'Error in bulk send operation',
      error: error.message
    });
  }
};

module.exports = {
  generateMessageContent,
  sendMessageToClient,
  getClientMessages,
  getAllMessages,
  updateMessageStatus,
  sendAutomatedReminderToClient,
  getMessageStats,
  bulkSendMessages
};