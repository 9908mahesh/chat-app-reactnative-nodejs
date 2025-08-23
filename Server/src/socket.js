// Server/src/socket.js
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Message = require('./models/Message');
const Conversation = require('./models/Conversation');

// Keep this consistent with your models:
// Message: { conversationId, senderId, receiverId, text, status }
function socketHandler(server) {
  const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
  });

  io.on('connection', (socket) => {
    console.log('✅ [SOCKET] connected', socket.id);

    // Optional JWT from query or auth – not required here, but logged if present
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (token) {
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = payload.id;
        console.log('🔐 [SOCKET] JWT ok for user:', socket.userId);
      } catch (e) {
        console.log('⚠️ [SOCKET] JWT invalid:', e.message);
      }
    } else {
      console.log('ℹ️ [SOCKET] No JWT provided');
    }

    // Join a conversation room
    socket.on('joinConversation', (conversationId) => {
      if (!conversationId) return;
      socket.join(conversationId);
      console.log(`🏠 [ROOM] ${socket.id} joined ${conversationId}`);
    });

    // Unified handler used by both event name styles
    async function handleSendMessage({ conversationId, senderId, toUserId, text }) {
      try {
        console.log('📩 [SEND] payload =>', { conversationId, senderId, toUserId, text });

        if (!conversationId || !senderId || !text) {
          console.log('❌ [SEND] invalid payload');
          return;
        }

        // Save to DB
        const msg = await Message.create({
          conversationId,
          senderId,
          receiverId: toUserId || null,
          text,
          status: 'sent'
        });

        // Update conversation lastMessage (if your schema has it)
        try {
          await Conversation.findByIdAndUpdate(conversationId, {
            lastMessage: { text, senderId, createdAt: msg.createdAt },
            updatedAt: new Date()
          });
        } catch (e) {
          console.log('⚠️ [CONV] lastMessage update failed:', e.message);
        }

        // Broadcast to the room
        io.to(conversationId).emit('message:new', msg);          // legacy client
        io.to(conversationId).emit('messageReceived', msg);      // new client
        console.log('📤 [BROADCAST] to room', conversationId, 'msgId:', msg._id);
      } catch (e) {
        console.log('💥 [SEND] error:', e);
      }
    }

    // Support BOTH event name styles
    socket.on('message:send', handleSendMessage);
    socket.on('sendMessage', handleSendMessage);

    socket.on('disconnect', () => {
      console.log('👋 [SOCKET] disconnected', socket.id);
    });
  });
}

module.exports = socketHandler;
