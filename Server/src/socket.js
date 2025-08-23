const { Server } = require('socket.io');
const Message = require('./models/Message');

function socketHandler(server) {
  const io = new Server(server, {
    cors: {
      origin: '*', // or your mobile app URL
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
      console.log('📤 Message received from client:', text);
      
      const message = new Message({ conversationId, sender: senderId, text });
      await message.save();

      io.to(conversationId).emit('messageReceived', message);
    });

    socket.on('disconnect', () => {
      console.log('❌ User disconnected:', socket.id);
    });
  });
}

module.exports = socketHandler;
