const jwt = require('jsonwebtoken');
});


io.on('connection', (socket) => {
const uid = socket.userId;
console.log('socket connected', uid, socket.id);


// add socket id map
if (!userSockets.has(uid)) userSockets.set(uid, new Set());
userSockets.get(uid).add(socket.id);


// broadcast online
io.emit('user:online', { userId: uid });


socket.on('typing:start', ({ conversationId, toUserId }) => {
const set = userSockets.get(toUserId);
if (set) set.forEach(sid => io.to(sid).emit('typing:start', { conversationId, from: uid }));
});
socket.on('typing:stop', ({ conversationId, toUserId }) => {
const set = userSockets.get(toUserId);
if (set) set.forEach(sid => io.to(sid).emit('typing:stop', { conversationId, from: uid }));
});


socket.on('message:send', async (payload, ack) => {
// payload: { conversationId, toUserId, text }
try {
const { conversationId, toUserId, text } = payload;
// create message
const msg = await Message.create({ conversationId, senderId: uid, receiverId: toUserId, text });
// update conversation lastMessage
await Conversation.findByIdAndUpdate(conversationId, { lastMessage: { text, senderId: uid, createdAt: msg.createdAt }, updatedAt: new Date() });
// emit to recipient sockets
const set = userSockets.get(toUserId);
if (set) set.forEach(sid => io.to(sid).emit('message:new', msg));
// ack sender with saved message
ack({ ok: true, message: msg });
} catch (e) {
console.error(e);
ack({ ok: false, error: e.message });
}
});


socket.on('message:delivered', async ({ messageId }) => {
const msg = await Message.findByIdAndUpdate(messageId, { status: 'delivered', deliveredAt: new Date() }, { new: true });
// notify sender sockets
const set = userSockets.get(msg.senderId.toString());
if (set) set.forEach(sid => io.to(sid).emit('message:delivered', { messageId: msg._id, deliveredAt: msg.deliveredAt }));
});


socket.on('message:read', async ({ messageId }) => {
const msg = await Message.findByIdAndUpdate(messageId, { status: 'read', readAt: new Date() }, { new: true });
const set = userSockets.get(msg.senderId.toString());
if (set) set.forEach(sid => io.to(sid).emit('message:read', { messageId: msg._id, readAt: msg.readAt }));
});


socket.on('disconnect', () => {
const set = userSockets.get(uid);
if (set) {
set.delete(socket.id);
if (set.size === 0) {
userSockets.delete(uid);
// broadcast offline
io.emit('user:offline', { userId: uid, lastSee
