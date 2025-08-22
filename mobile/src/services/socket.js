import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

let socket = null;

// Replace host as in api.js
const SOCKET_URL = 'http://<YOUR_SERVER_HOST>:4000';

export async function createSocket() {
  if (socket && socket.connected) return socket;
  const token = await AsyncStorage.getItem('token');
  socket = io(SOCKET_URL, { auth: { token } });
  socket.on('connect', () => console.log('socket connected', socket.id));
  socket.on('connect_error', (err) => console.log('socket error', err.message));
  return socket;
}

export function getSocket() {
  return socket;
}
