const twilio = require('twilio');
const axios = require('axios');
const MessageLog = require('../models/MessageLog');
const Client = require('../models/Client');

// Initialize Twilio client (if credentials are provided)
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

// Initialize OpenAI client (if API key is provided)
let openaiClient = null;
if (process.env.OPENAI_API_KEY) {
  const { OpenAI } = require('openai');
  openaiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

/**
 * Generate AI-powered message content
 * @param {Object} params - Message generation parameters
 * @returns {String} Generated message content
 */
const generateMessage = async ({
  clientName,
  delayDays,
  outstandingBalance,
  channel,
  messageType = 'reminder',
  customContext = ''
}) => {
  try {
    // If OpenAI is configured, use it for message generation
    if (openaiClient) {
      const prompt = createMessagePrompt({
        clientName,
        delayDays,
        outstandingBalance,
        channel,
        messageType,
        customContext
      });

      const completion = await openaiClient.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a professional debt recovery assistant. Generate polite, professional, and effective reminder messages. Keep messages concise and appropriate for the specified channel."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 200,
        temperature: 0.7,
      });

      return completion.choices[0].message.content.trim();
    } else {
      // Fallback to template-based message generation
      return generateTemplateMessage({
        clientName,
        delayDays,
        outstandingBalance,
        channel,
        messageType,
        customContext
      });
    }
  } catch (error) {
    console.error('Error generating AI message:', error);
    // Fallback to template-based generation
    return generateTemplateMessage({
      clientName,
      delayDays,
      outstandingBalance,
      channel,
      messageType,
      customContext
    });
  }
};

/**
 * Create prompt for AI message generation
 */
const createMessagePrompt = ({
  clientName,
  delayDays,
  outstandingBalance,
  channel,
  messageType,
  customContext
}) => {
  const channelInstructions = {
    sms: 'Keep it under 160 characters, direct and clear.',
    whatsapp: 'Can be slightly longer, use friendly but professional tone.',
    email: 'Can be more detailed, include subject line suggestion.'
  };

  return `Generate a ${messageType} message for debt recovery with these details:
- Client name: ${clientName}
- Payment delay: ${delayDays} days
- Outstanding balance: $${outstandingBalance}
- Channel: ${channel}
- Additional context: ${customContext}

Instructions: ${channelInstructions[channel] || 'Keep professional and polite.'}

The message should be professional, empathetic, and encourage payment while maintaining a respectful tone.`;
};

/**
 * Generate template-based message (fallback)
 */
const generateTemplateMessage = ({
  clientName,
  delayDays,
  outstandingBalance,
  channel,
  messageType,
  customContext
}) => {
  const templates = {
    reminder: {
      sms: `Hi ${clientName}, friendly reminder: Your payment of $${outstandingBalance} is ${delayDays} days overdue. Please settle at your earliest convenience. Thank you.`,
      whatsapp: `Hello ${clientName}! 👋 This is a gentle reminder that your payment of $${outstandingBalance} is ${delayDays} days overdue. We understand things can get busy, but we'd appreciate if you could settle this at your earliest convenience. Thank you for your attention to this matter!`,
      email: `Subject: Payment Reminder - Account ${clientName}\n\nDear ${clientName},\n\nI hope this message finds you well. This is a friendly reminder that your payment of $${outstandingBalance} is currently ${delayDays} days overdue.\n\nWe understand that circumstances can sometimes make it challenging to meet payment deadlines. If you're experiencing any difficulties, please don't hesitate to reach out to discuss possible arrangements.\n\nWe would greatly appreciate your prompt attention to this matter.\n\nBest regards,\nDebt Recovery Team`
    },
    'follow-up': {
      sms: `${clientName}, this is a follow-up regarding your overdue payment of $${outstandingBalance} (${delayDays} days). Please contact us to discuss payment options.`,
      whatsapp: `Hello ${clientName}, I'm following up on your overdue payment of $${outstandingBalance}, which is now ${delayDays} days past due. We're here to help find a solution that works for you. Please reach out so we can discuss your payment options. 📞`,
      email: `Subject: Follow-up: Overdue Payment - ${clientName}\n\nDear ${clientName},\n\nI'm writing to follow up on our previous communication regarding your overdue payment of $${outstandingBalance}, which is now ${delayDays} days past the due date.\n\nWe value our relationship with you and want to work together to resolve this matter. If you're facing financial difficulties, we're open to discussing payment arrangements that might work better for your situation.\n\nPlease contact us at your earliest convenience to discuss how we can move forward.\n\nSincerely,\nDebt Recovery Team`
    },
    final: {
      sms: `FINAL NOTICE: ${clientName}, your payment of $${outstandingBalance} is ${delayDays} days overdue. Contact us immediately to avoid further action.`,
      whatsapp: `🚨 FINAL NOTICE: Hello ${clientName}, your payment of $${outstandingBalance} is now ${delayDays} days overdue. This is our final attempt to reach an amicable resolution. Please contact us immediately to discuss payment and avoid any further collection actions.`,
      email: `Subject: FINAL NOTICE - Immediate Action Required - ${clientName}\n\nDear ${clientName},\n\nThis is our final notice regarding your overdue payment of $${outstandingBalance}, which is now ${delayDays} days past due.\n\nDespite our previous attempts to contact you, this matter remains unresolved. We must now inform you that if payment is not received or contact is not made within the next 7 days, we may be forced to take further collection actions.\n\nWe strongly encourage you to contact us immediately to discuss payment arrangements and avoid any additional complications.\n\nUrgent attention required.\n\nDebt Recovery Team`
    }
  };

  return templates[messageType]?.[channel] || templates.reminder[channel];
};

/**
 * Send message via specified channel
 * @param {Object} messageData - Message data including client, content, channel
 * @returns {Object} Send result
 */
const sendMessage = async (messageData) => {
  const { clientId, content, channel, messageType } = messageData;
  
  try {
    const client = await Client.findById(clientId);
    if (!client) {
      throw new Error('Client not found');
    }

    // Create message log entry
    const messageLog = new MessageLog({
      clientId,
      messageType,
      channel,
      content,
      status: 'pending'
    });

    let sendResult;
    
    switch (channel) {
      case 'sms':
        sendResult = await sendSMS(client.phone, content, messageLog);
        break;
      case 'whatsapp':
        sendResult = await sendWhatsApp(client.phone, content, messageLog);
        break;
      case 'email':
        sendResult = await sendEmail(client.email, content, messageLog);
        break;
      default:
        throw new Error(`Unsupported channel: ${channel}`);
    }

    // Update client's last contacted date
    client.lastContacted = new Date();
    await client.save();

    return sendResult;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

/**
 * Send SMS via Twilio
 */
const sendSMS = async (phoneNumber, content, messageLog) => {
  try {
    if (twilioClient) {
      const message = await twilioClient.messages.create({
        body: content,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber
      });

      messageLog.externalMessageId = message.sid;
      messageLog.status = 'sent';
      messageLog.sentAt = new Date();
      await messageLog.save();

      return {
        success: true,
        messageId: message.sid,
        status: 'sent',
        logId: messageLog._id
      };
    } else {
      // Mock SMS sending when Twilio is not configured
      console.log(`[MOCK SMS] To: ${phoneNumber}, Content: ${content}`);
      
      messageLog.status = 'sent';
      messageLog.sentAt = new Date();
      messageLog.externalMessageId = `mock_sms_${Date.now()}`;
      await messageLog.save();

      return {
        success: true,
        messageId: `mock_sms_${Date.now()}`,
        status: 'sent',
        logId: messageLog._id,
        mock: true
      };
    }
  } catch (error) {
    messageLog.status = 'failed';
    messageLog.failureReason = error.message;
    await messageLog.save();
    throw error;
  }
};

/**
 * Send WhatsApp message via Twilio
 */
const sendWhatsApp = async (phoneNumber, content, messageLog) => {
  try {
    if (twilioClient) {
      const message = await twilioClient.messages.create({
        body: content,
        from: process.env.TWILIO_WHATSAPP_NUMBER,
        to: `whatsapp:${phoneNumber}`
      });

      messageLog.externalMessageId = message.sid;
      messageLog.status = 'sent';
      messageLog.sentAt = new Date();
      await messageLog.save();

      return {
        success: true,
        messageId: message.sid,
        status: 'sent',
        logId: messageLog._id
      };
    } else {
      // Mock WhatsApp sending
      console.log(`[MOCK WHATSAPP] To: ${phoneNumber}, Content: ${content}`);
      
      messageLog.status = 'sent';
      messageLog.sentAt = new Date();
      messageLog.externalMessageId = `mock_whatsapp_${Date.now()}`;
      await messageLog.save();

      return {
        success: true,
        messageId: `mock_whatsapp_${Date.now()}`,
        status: 'sent',
        logId: messageLog._id,
        mock: true
      };
    }
  } catch (error) {
    messageLog.status = 'failed';
    messageLog.failureReason = error.message;
    await messageLog.save();
    throw error;
  }
};

/**
 * Send Email (mock implementation)
 */
const sendEmail = async (emailAddress, content, messageLog) => {
  try {
    // Mock email sending - in real implementation, you'd use SendGrid, AWS SES, etc.
    console.log(`[MOCK EMAIL] To: ${emailAddress}, Content: ${content}`);
    
    messageLog.status = 'sent';
    messageLog.sentAt = new Date();
    messageLog.externalMessageId = `mock_email_${Date.now()}`;
    await messageLog.save();

    return {
      success: true,
      messageId: `mock_email_${Date.now()}`,
      status: 'sent',
      logId: messageLog._id,
      mock: true
    };
  } catch (error) {
    messageLog.status = 'failed';
    messageLog.failureReason = error.message;
    await messageLog.save();
    throw error;
  }
};

/**
 * Send automated reminder based on client risk and payment status
 */
const sendAutomatedReminder = async (clientId) => {
  try {
    const client = await Client.findById(clientId);
    if (!client) {
      throw new Error('Client not found');
    }

    // Determine message type based on risk score and last contact
    let messageType = 'reminder';
    const daysSinceContact = client.daysSinceLastContact;
    
    if (client.riskScore >= 80 || daysSinceContact > 30) {
      messageType = 'final';
    } else if (client.riskScore >= 60 || daysSinceContact > 14) {
      messageType = 'follow-up';
    }

    // Calculate delay days (mock calculation)
    const delayDays = daysSinceContact || 0;

    // Generate message content
    const content = await generateMessage({
      clientName: client.name,
      delayDays,
      outstandingBalance: client.outstandingBalance,
      channel: client.preferredChannel,
      messageType
    });

    // Send the message
    return await sendMessage({
      clientId,
      content,
      channel: client.preferredChannel,
      messageType
    });
  } catch (error) {
    console.error('Error sending automated reminder:', error);
    throw error;
  }
};

module.exports = {
  generateMessage,
  sendMessage,
  sendSMS,
  sendWhatsApp,
  sendEmail,
  sendAutomatedReminder,
  // Export for testing
  generateTemplateMessage,
  createMessagePrompt
};