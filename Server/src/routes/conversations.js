const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

// Create or get 1:1 conversation
router.post('/start', auth, async (req, res) => {
  try {
    const { otherUserId } = req.body;
    if (!otherUserId) return res.status(400).json({ error: 'missing otherUserId' });
    let conv = await Conversation.findOne({ participants: { $all: [req.user._id, otherUserId] } });
    if (!conv) conv = await Conversation.create({ participants: [req.user._id, otherUserId] });
    res.json(conv);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server error' });
  }
});

// Get messages for a conversation (latest 50)
router.get('/:id/messages', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const messages = await Message.find({ conversationId: id }).sort({ createdAt: -1 }).limit(50);
    res.json(messages.reverse());
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;
