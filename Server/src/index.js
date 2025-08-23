require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { connect } = require('./db');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const convRoutes = require('./routes/conversations');
const setupSocket = require('./socket'); // ✅ No destructuring

const app = express();
app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/conversations', convRoutes);

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
setupSocket(io);

const PORT = process.env.PORT || 4000;
connect(process.env.MONGO_URI).then(() => {
  server.listen(PORT, () => console.log('Server listening on', PORT));
}).catch((err) => {
  console.error('DB connection failed', err);
});
