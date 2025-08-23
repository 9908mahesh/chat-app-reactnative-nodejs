require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { connect } = require('./db');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const convRoutes = require('./routes/conversations');
const setupSocket = require('./socket'); // ✅ Import function

const app = express();
app.use(cors());
app.use(express.json());

// ✅ API Routes
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/conversations', convRoutes);

// ✅ Create HTTP server
const server = http.createServer(app);

// ✅ Attach Socket.IO to server
const io = new Server(server, {
  cors: {
    origin: '*', // allow all origins (or specify your frontend URL)
    methods: ['GET', 'POST'],
  },
});

// ✅ Initialize Socket
setupSocket(io);

// ✅ Use Render's dynamic PORT
const PORT = process.env.PORT || 5000;

// ✅ Connect DB and start server
connect(process.env.MONGO_URI)
  .then(() => {
    server.listen(PORT, () => console.log(`✅ Server listening on ${PORT}`));
  })
  .catch((err) => {
    console.error('❌ DB connection failed', err);
  });
