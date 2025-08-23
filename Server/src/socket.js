const { Server } = require('socket.io');
const Message = require('./models/Message');

function socketHandler(server) {
  const io = new Server(server, {
    cors: {
      origin: '*', // Replace with your frontend URL in production
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('✅ User connected:', socket.id);

    // Join a conversation (room)
    socket.on('joinConversation', (conversationId) => {
      socket.join(conversationId);
      console.log(`✅ User joined conversation: ${conversationId}`);
    });

    // Send message
    socket.on('sendMessage', async ({ conversationId, senderId, text }) => {
      try {
        console.log('📤 Message received from client:', text);

        const message = new Message({ conversationId, sender: senderId, text });
        await message.save();

        // Emit to all users in the room
        io.to(conversationId).emit('messageReceived', message);
      } catch (error) {
        console.error('❌ Error saving message:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log('❌ User disconnected:', socket.id);
    });
  });
}

module.exports = socketHandler;
