const jwt = require('jsonwebtoken');
const Message = require('./models/Message');
const Conversation = require('./models/Conversation');

// userId (string) => Set(socketId)
const userSockets = new Map();

function setupSocket(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('auth error'));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = payload.id;
      next();
    } catch (e) { next(new Error('auth error')); }
  });

  io.on('connection', (socket) => {
    const uid = socket.userId;
    console.log('socket connected', uid, socket.id);

    // add socket id
    if (!userSockets.has(uid)) userSockets.set(uid, new Set());
    userSockets.get(uid).add(socket.id);

    // broadcast online
    io.emit('user:online', { userId: uid });

    // typing events
    socket.on('typing:start', ({ conversationId, toUserId }) => {
      const set = userSockets.get(toUserId);
      if (set) set.forEach(sid => io.to(sid).emit('typing:start', { conversationId, from: uid }));
    });
    socket.on('typing:stop', ({ conversationId, toUserId }) => {
      const set = userSockets.get(toUserId);
      if (set) set.forEach(sid => io.to(sid).emit('typing:stop', { conversationId, from: uid }));
    });

    // send message
    socket.on('message:send', async (payload, ack) => {
      try {
        const { conversationId, toUserId, text } = payload;
        const msg = await Message.create({ conversationId, senderId: uid, receiverId: toUserId, text });
        await Conversation.findByIdAndUpdate(conversationId, { lastMessage: { text, senderId: uid, createdAt: msg.createdAt }, updatedAt: new Date() });

        // send to recipient sockets
        const set = userSockets.get(toUserId);
        if (set) set.forEach(sid => io.to(sid).emit('message:new', msg));

        // ack sender
        ack({ ok: true, message: msg });
      } catch (e) {
        console.error(e);
        ack({ ok: false, error: e.message });
      }
    });

    // delivered ack
    socket.on('message:delivered', async ({ messageId }) => {
      try {
        const msg = await Message.findByIdAndUpdate(messageId, { status: 'delivered', deliveredAt: new Date() }, { new: true });
        const senderId = msg.senderId.toString();
        const set = userSockets.get(senderId);
        if (set) set.forEach(sid => io.to(sid).emit('message:delivered', { messageId: msg._id, deliveredAt: msg.deliveredAt }));
      } catch (e) {
        console.error(e);
      }
    });

    // read ack
    socket.on('message:read', async ({ messageId }) => {
      try {
        const msg = await Message.findByIdAndUpdate(messageId, { status: 'read', readAt: new Date() }, { new: true });
        const senderId = msg.senderId.toString();
        const set = userSockets.get(senderId);
        if (set) set.forEach(sid => io.to(sid).emit('message:read', { messageId: msg._id, readAt: msg.readAt }));
      } catch (e) {
        console.error(e);
      }
    });

    socket.on('disconnect', () => {
      const set = userSockets.get(uid);
      if (set) {
        set.delete(socket.id);
        if (set.size === 0) {
          userSockets.delete(uid);
          io.emit('user:offline', { userId: uid, lastSeen: new Date() });
        }
      }
      console.log('socket disconnected', uid, socket.id);
    });
  });
}

module.exports = { setupSocket };
