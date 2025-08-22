const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String },
  createdAt: { type: Date, default: Date.now },
  deliveredAt: Date,
  readAt: Date,
  status: { type: String, enum: ['sent','delivered','read'], default: 'sent' }
});

module.exports = mongoose.model('Message', MessageSchema);

