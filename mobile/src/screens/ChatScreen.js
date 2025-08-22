import React, { useEffect, useState, useRef } from 'react';
import { View, FlatList, TextInput, Button, KeyboardAvoidingView, Platform } from 'react-native';
import api from '../api';
import { getSocket } from '../services/socket';
import MessageBubble from '../components/MessageBubble';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ChatScreen({ route }) {
  const { conversation, otherUser, currentUser } = route.params;
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [me, setMe] = useState(currentUser);
  const socketRef = useRef(null);

  useEffect(() => {
    (async () => {
      const meStr = me ? JSON.stringify(me) : await AsyncStorage.getItem('user');
      if (!me && meStr) setMe(typeof meStr === 'string' ? JSON.parse(meStr) : meStr);

      const res = await api.get(`/conversations/${conversation._id}/messages`);
      setMessages(res.data);
    })();

    const socket = getSocket();
    socketRef.current = socket;

    function onNew(msg) {
      // ensure it's for this conversation
      if (msg.conversationId === conversation._id) {
        setMessages(prev => [...prev, msg]);
        // send delivered ack back to server
        socket.emit('message:delivered', { messageId: msg._id });
      }
    }
    function onDelivered({ messageId }) {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, status: 'delivered' } : m));
    }
    function onRead({ messageId }) {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, status: 'read' } : m));
    }

    socket.on('message:new', onNew);
    socket.on('message:delivered', onDelivered);
    socket.on('message:read', onRead);

    return () => {
      socket.off('message:new', onNew);
      socket.off('message:delivered', onDelivered);
      socket.off('message:read', onRead);
    };
  }, []);

  async function send() {
    if (!text.trim()) return;
    const payload = { conversationId: conversation._id, toUserId: otherUser._id || otherUser.id, text };
    socketRef.current.emit('message:send', payload, ({ ok, message, error }) => {
      if (ok) {
        // mark sent locally
        setMessages(prev => [...prev, { ...message, status: 'sent' }]);
      } else {
        alert('send failed: ' + error);
      }
    });
    setText('');
  }

  function renderItem({ item }) {
    const fromMe = (item.senderId?.toString() || item.senderId) === (me?.id || me?._id);
    return <MessageBubble text={item.text} fromMe={fromMe} status={item.status} />;
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList data={messages} keyExtractor={m => m._id} renderItem={renderItem} />
      <View style={{ flexDirection: 'row', padding: 8 }}>
        <TextInput value={text} onChangeText={setText} style={{ flex: 1, borderWidth: 1, padding: 8 }} />
        <Button title="Send" onPress={send} />
      </View>
    </KeyboardAvoidingView>
  );
}
