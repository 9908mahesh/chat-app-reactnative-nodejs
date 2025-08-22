const jwt = require('jsonwebtoken');
const Message = require('./models/Message');
const Conversation = require('./models/Conversation');

// Map userId -> Set of socketIds
const userSockets = new Map();

function setupSocket(io) {
  // Authenticate user via JWT
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication error: token missing'));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = payload.id;
      next();
    } catch (e) {
      next(new Error('Authentication error: invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const uid = socket.userId;
    console.log('Socket connected:', uid, socket.id);

    // Add socket to user's active sockets
    if (!userSockets.has(uid)) userSockets.set(uid, new Set());
    userSockets.get(uid).add(socket.id);

    // Notify all users that this user is online
    io.emit('user:online', { userId: uid });

    /**
     * Typing Indicator Events
     */
    socket.on('typing:start', ({ conversationId }) => {
      // Broadcast to all other sockets in this conversation except sender
      socket.broadcast.emit('typing:start', { conversationId, from: uid });
    });

    socket.on('typing:stop', ({ conversationId }) => {
      socket.broadcast.emit('typing:stop', { conversationId, from: uid });
    });

    /**
     * Send Message Event
     */
    socket.on('message:send', async (payload, ack) => {
      try {
        const { conversationId, toUserId, text } = payload;
        if (!conversationId || !toUserId || !text) {
          return ack({ ok: false, error: 'Invalid payload' });
        }

        // Save message in DB
        const msg = await Message.create({
          conversationId,
          senderId: uid,
          receiverId: toUserId,
          text,
          status: 'sent'
        });

        // Update conversation last message
        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: { text, senderId: uid, createdAt: msg.createdAt },
          updatedAt: new Date()
        });

        // Send message to recipient sockets
        const recipientSockets = userSockets.get(toUserId);
        if (recipientSockets) {
          recipientSockets.forEach(sid => io.to(sid).emit('message:new', msg));
        }

        // Acknowledge sender
        ack({ ok: true, message: msg });
      } catch (e) {
        console.error('Error in message:send:', e);
        ack({ ok: false, error: e.message });
      }
    });

    /**
     * Delivered Acknowledgement
     */
    socket.on('message:delivered', async ({ messageId }) => {
      try {
        const msg = await Message.findByIdAndUpdate(
          messageId,
          { status: 'delivered', deliveredAt: new Date() },
          { new: true }
        );

        if (!msg) return;

        const senderId = msg.senderId.toString();
        const senderSockets = userSockets.get(senderId);
        if (senderSockets) {
          senderSockets.forEach(sid =>
            io.to(sid).emit('message:delivered', {
              messageId: msg._id,
              deliveredAt: msg.deliveredAt
            })
          );
        }
      } catch (e) {
        console.error('Error in message:delivered:', e);
      }
    });

    /**
     * Read Acknowledgement
     */
    socket.on('message:read', async ({ messageId }) => {
      try {
        const msg = await Message.findByIdAndUpdate(
          messageId,
          { status: 'read', readAt: new Date() },
          { new: true }
        );

        if (!msg) return;

        const senderId = msg.senderId.toString();
        const senderSockets = userSockets.get(senderId);
        if (senderSockets) {
          senderSockets.forEach(sid =>
            io.to(sid).emit('message:read', {
              messageId: msg._id,
              readAt: msg.readAt
            })
          );
        }
      } catch (e) {
        console.error('Error in message:read:', e);
      }
    });

    /**
     * Disconnect Event
     */
    socket.on('disconnect', () => {
      const sockets = userSockets.get(uid);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(uid);
          // Broadcast offline status with last seen timestamp
          io.emit('user:offline', { userId: uid, lastSeen: new Date() });
        }
      }
      console.log('Socket disconnected:', uid, socket.id);
    });
  });
}

module.exports = { setupSocket };
