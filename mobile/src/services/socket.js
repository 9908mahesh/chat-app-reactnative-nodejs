// mobile/src/services/socket.js
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

let socket = null;

// 👇 your Render URL (no trailing slash)
const SOCKET_URL = 'https://chat-app-reactnative-nodejs.onrender.com';

export async function createSocket() {
  if (socket && socket.connected) return socket;

  const token = await AsyncStorage.getItem('token'); // stored after login
  socket = io(SOCKET_URL, {
    auth: token ? { token } : undefined,
    transports: ['websocket'],
    forceNew: true
  });

  socket.on('connect', () => console.log('✅ [client] socket connected:', socket.id));
  socket.on('connect_error', (err) => console.log('❌ [client] connect_error:', err?.message));
  socket.on('disconnect', (reason) => console.log('⚠️ [client] disconnect:', reason));

  // Optional generic loggers (comment out if too chatty)
  socket.onAny((event, ...args) => {
    if (['typing:start', 'typing:stop'].includes(event)) return;
    console.log('📡 [client] event:', event, JSON.stringify(args?.[0] ?? {}));
  });

  return socket;
}

export function getSocket() {
  return socket;
}
