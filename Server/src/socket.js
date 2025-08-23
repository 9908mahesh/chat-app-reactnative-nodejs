const { Server } = require('socket.io');
const Message = require('./models/Message');

function setupSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: '*', // For production, restrict this to your frontend domain
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('✅ User connected:', socket.id);

    socket.on('joinConversation', (conversationId) => {
      socket.join(conversationId);
      console.log(`✅ User joined conversation: ${conversationId}`);
    });

    socket.on('sendMessage', async ({ conversationId, senderId, text }) => {
      try {
        console.log('📤 Message received from client:', { conversationId, senderId, text });

        const message = new Message({ conversationId, sender: senderId, text });
        await message.save();

        // Broadcast to everyone in that conversation room
        io.to(conversationId).emit('messageReceived', message);

        console.log('✅ Message saved & broadcasted');
      } catch (err) {
        console.error('❌ Error saving message:', err);
      }
    });

    socket.on('disconnect', () => {
      console.log('❌ User disconnected:', socket.id);
    });
  });
}

module.exports = { setupSocket };
