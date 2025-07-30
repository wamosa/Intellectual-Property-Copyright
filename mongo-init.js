// MongoDB initialization script for debt recovery system
db = db.getSiblingDB('debt_recovery');

// Create collections and indexes
db.createCollection('clients');
db.createCollection('messagelogs');
db.createCollection('payments');

// Create indexes for better performance
db.clients.createIndex({ "email": 1 }, { unique: true });
db.clients.createIndex({ "riskScore": -1 });
db.clients.createIndex({ "status": 1 });

db.messagelogs.createIndex({ "clientId": 1, "timestamp": -1 });
db.messagelogs.createIndex({ "status": 1 });

db.payments.createIndex({ "clientId": 1, "dueDate": -1 });
db.payments.createIndex({ "status": 1 });
db.payments.createIndex({ "dueDate": 1 });

// Insert sample clients
db.clients.insertMany([
  {
    name: "John Smith",
    email: "john.smith@example.com",
    phone: "+1-555-0101",
    riskScore: 85,
    lastContacted: new Date("2024-01-15"),
    preferredChannel: "email",
    outstandingBalance: 15000,
    status: "delinquent",
    accountCreatedDate: new Date("2023-06-15"),
    lastPaymentDate: new Date("2023-12-01"),
    totalMissedPayments: 3,
    averagePaymentDelay: 15,
    contactHistory: [
      {
        date: new Date("2024-01-15"),
        channel: "email",
        response: false
      },
      {
        date: new Date("2024-01-10"),
        channel: "sms",
        response: true
      }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Sarah Johnson",
    email: "sarah.johnson@example.com",
    phone: "+1-555-0102",
    riskScore: 45,
    lastContacted: new Date("2024-01-20"),
    preferredChannel: "whatsapp",
    outstandingBalance: 5500,
    status: "active",
    accountCreatedDate: new Date("2023-08-20"),
    lastPaymentDate: new Date("2024-01-05"),
    totalMissedPayments: 1,
    averagePaymentDelay: 5,
    contactHistory: [
      {
        date: new Date("2024-01-20"),
        channel: "whatsapp",
        response: true
      }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Michael Brown",
    email: "michael.brown@example.com",
    phone: "+1-555-0103",
    riskScore: 92,
    lastContacted: new Date("2024-01-05"),
    preferredChannel: "sms",
    outstandingBalance: 25000,
    status: "delinquent",
    accountCreatedDate: new Date("2023-03-10"),
    lastPaymentDate: new Date("2023-10-15"),
    totalMissedPayments: 5,
    averagePaymentDelay: 25,
    contactHistory: [
      {
        date: new Date("2024-01-05"),
        channel: "sms",
        response: false
      },
      {
        date: new Date("2023-12-28"),
        channel: "email",
        response: false
      }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Emily Davis",
    email: "emily.davis@example.com",
    phone: "+1-555-0104",
    riskScore: 25,
    lastContacted: new Date("2024-01-22"),
    preferredChannel: "email",
    outstandingBalance: 2000,
    status: "active",
    accountCreatedDate: new Date("2023-11-01"),
    lastPaymentDate: new Date("2024-01-20"),
    totalMissedPayments: 0,
    averagePaymentDelay: 2,
    contactHistory: [
      {
        date: new Date("2024-01-22"),
        channel: "email",
        response: true
      }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Robert Wilson",
    email: "robert.wilson@example.com",
    phone: "+1-555-0105",
    riskScore: 68,
    lastContacted: new Date("2024-01-18"),
    preferredChannel: "sms",
    outstandingBalance: 8500,
    status: "active",
    accountCreatedDate: new Date("2023-05-15"),
    lastPaymentDate: new Date("2023-12-15"),
    totalMissedPayments: 2,
    averagePaymentDelay: 12,
    contactHistory: [
      {
        date: new Date("2024-01-18"),
        channel: "sms",
        response: true
      }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);

// Get client IDs for creating payments and messages
const clients = db.clients.find({}).toArray();

// Insert sample payments
const samplePayments = [];
clients.forEach(client => {
  // Create some payment records for each client
  samplePayments.push({
    clientId: client._id,
    amount: Math.floor(client.outstandingBalance * 0.3),
    dueDate: new Date("2024-01-15"),
    paidDate: null,
    status: "overdue",
    paymentMethod: null,
    transactionId: null,
    amountPaid: 0,
    daysOverdue: Math.floor((new Date() - new Date("2024-01-15")) / (1000 * 60 * 60 * 24)),
    lateFee: 50,
    description: "Monthly payment",
    invoiceNumber: `INV-${Math.floor(Math.random() * 10000)}`,
    remindersSent: 2,
    lastReminderDate: new Date("2024-01-20"),
    createdAt: new Date(),
    updatedAt: new Date()
  });

  samplePayments.push({
    clientId: client._id,
    amount: Math.floor(client.outstandingBalance * 0.4),
    dueDate: new Date("2024-02-15"),
    paidDate: null,
    status: "pending",
    paymentMethod: null,
    transactionId: null,
    amountPaid: 0,
    daysOverdue: 0,
    lateFee: 0,
    description: "Monthly payment",
    invoiceNumber: `INV-${Math.floor(Math.random() * 10000)}`,
    remindersSent: 0,
    lastReminderDate: null,
    createdAt: new Date(),
    updatedAt: new Date()
  });
});

db.payments.insertMany(samplePayments);

// Insert sample message logs
const sampleMessages = [];
clients.forEach(client => {
  sampleMessages.push({
    clientId: client._id,
    messageType: "reminder",
    channel: client.preferredChannel,
    content: `Hi ${client.name}, this is a friendly reminder that your payment of $${Math.floor(client.outstandingBalance * 0.3)} is overdue. Please settle at your earliest convenience.`,
    status: "sent",
    timestamp: new Date("2024-01-20"),
    sentAt: new Date("2024-01-20"),
    deliveredAt: new Date("2024-01-20"),
    readAt: client.contactHistory.some(h => h.response) ? new Date("2024-01-20") : null,
    failureReason: null,
    externalMessageId: `msg_${Math.floor(Math.random() * 100000)}`,
    cost: 0.05,
    responseReceived: client.contactHistory.some(h => h.response),
    responseContent: client.contactHistory.some(h => h.response) ? "Thank you for the reminder. I will make the payment soon." : null,
    responseTimestamp: client.contactHistory.some(h => h.response) ? new Date("2024-01-20") : null,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  if (client.riskScore > 70) {
    sampleMessages.push({
      clientId: client._id,
      messageType: "follow-up",
      channel: client.preferredChannel,
      content: `${client.name}, this is a follow-up regarding your overdue payment. Please contact us to discuss payment options.`,
      status: "delivered",
      timestamp: new Date("2024-01-22"),
      sentAt: new Date("2024-01-22"),
      deliveredAt: new Date("2024-01-22"),
      readAt: null,
      failureReason: null,
      externalMessageId: `msg_${Math.floor(Math.random() * 100000)}`,
      cost: 0.05,
      responseReceived: false,
      responseContent: null,
      responseTimestamp: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
});

db.messagelogs.insertMany(sampleMessages);

print("✅ Database initialized successfully with sample data!");
print(`📊 Created ${clients.length} clients`);
print(`💳 Created ${samplePayments.length} payments`);
print(`📨 Created ${sampleMessages.length} messages`);
print("🚀 Ready to start the debt recovery system!");