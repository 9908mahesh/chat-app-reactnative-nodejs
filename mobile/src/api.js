import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Replace with your server host (e.g. http://192.168.1.10:4000 or https://your-deploy-url)
//const API_URL = 'http://<YOUR_SERVER_HOST>:4000';
const API_URL = "https://your-app.onrender.com";


const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
