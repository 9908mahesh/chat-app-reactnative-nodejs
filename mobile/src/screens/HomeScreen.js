import React, { useEffect, useState } from 'react';
import { View, FlatList, Text, TouchableOpacity } from 'react-native';
import api from '../api';
import { createSocket, getSocket } from '../services/socket';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HomeScreen({ navigation }) {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    (async () => {
      const userStr = await AsyncStorage.getItem('user');
      const u = userStr ? JSON.parse(userStr) : null;
      setCurrentUser(u);

      await createSocket();
      const res = await api.get('/users');
      setUsers(res.data);
    })();

    const socket = getSocket();
    if (socket) {
      socket.on('user:online', ({ userId }) => console.log('user online', userId));
      socket.on('user:offline', ({ userId }) => console.log('user offline', userId));
    }

    return () => {
      const s = getSocket();
      if (s) {
        s.off('user:online');
        s.off('user:offline');
      }
    };
  }, []);

  async function startChat(otherUser) {
    const res = await api.post('/conversations/start', { otherUserId: otherUser._id || otherUser.id });
    navigation.navigate('Chat', { conversation: res.data, otherUser, currentUser });
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={users}
        keyExtractor={(u) => u._id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => startChat(item)} style={{ padding: 16, borderBottomWidth: 1 }}>
            <Text style={{ fontWeight: 'bold' }}>{item.name}</Text>
            <Text>{item.email}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
