const express = require('express');
const router = express.Router();
const {
  generateMessageContent,
  sendMessageToClient,
  getClientMessages,
  getAllMessages,
  updateMessageStatus,
  sendAutomatedReminderToClient,
  getMessageStats,
  bulkSendMessages
} = require('../controllers/messageController');

// POST /api/messages/generate - Generate message content using LLM
router.post('/generate', generateMessageContent);

// POST /api/messages/send - Send message to client
router.post('/send', sendMessageToClient);

// POST /api/messages/bulk-send - Send messages to multiple clients
router.post('/bulk-send', bulkSendMessages);

// GET /api/messages - Get all messages with filtering
router.get('/', getAllMessages);

// GET /api/messages/stats - Get message statistics
router.get('/stats', getMessageStats);

// GET /api/messages/client/:clientId - Get messages for specific client
router.get('/client/:clientId', getClientMessages);

// PUT /api/messages/:id/status - Update message status (webhook endpoint)
router.put('/:id/status', updateMessageStatus);

// POST /api/messages/client/:clientId/reminder - Send automated reminder
router.post('/client/:clientId/reminder', sendAutomatedReminderToClient);

module.exports = router;