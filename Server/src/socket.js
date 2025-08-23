const { Server } = require('socket.io');
const Message = require('./models/Message'); // adjust path if different

function initSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: '*', // or specify your frontend URL
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('✅ Socket connected:', socket.id);

    // Join a conversation room
    socket.on('joinConversation', (conversationId) => {
      socket.join(conversationId);
      console.log(`✅ Joined conversation: ${conversationId}`);
    });

    // Handle sending a message
    socket.on('sendMessage', async (data) => {
      console.log('📩 Data received on sendMessage:', data);

      const { conversationId, senderId, text } = data;

      if (!conversationId || !senderId || !text) {
        console.error('❌ Missing fields:', { conversationId, senderId, text });
        return;
      }

      try {
        const message = new Message({
          conversationId,
          sender: senderId,
          text,
        });
        await message.save();
        console.log('✅ Message saved to DB:', message);

        // Broadcast to conversation
        io.to(conversationId).emit('messageReceived', message);
      } catch (error) {
        console.error('❌ Error saving message:', error.message);
      }
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket disconnected:', socket.id);
    });
  });
}

module.exports = initSocket;
