import React, { useEffect, useState, useRef } from 'react';
import { View, FlatList, TextInput, Button, KeyboardAvoidingView, Platform } from 'react-native';
import api from '../api';
import { getSocket } from '../services/socket';
import MessageBubble from '../components/MessageBubble';
import TypingIndicator from '../components/TypingIndicator';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ChatScreen({ route }) {
  const { conversation, otherUser, currentUser } = route.params;
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [me, setMe] = useState(currentUser);
  const [isTyping, setIsTyping] = useState(false);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    (async () => {
      const meStr = me ? JSON.stringify(me) : await AsyncStorage.getItem('user');
      if (!me && meStr) setMe(typeof meStr === 'string' ? JSON.parse(meStr) : meStr);

      const res = await api.get(`/conversations/${conversation._id}/messages`);
      setMessages(res.data);
    })();

    const socket = getSocket();
    socketRef.current = socket;

    // Handle new messages
    function onNew(msg) {
      if (msg.conversationId === conversation._id) {
        setMessages(prev => [...prev, msg]);
        socket.emit('message:delivered', { messageId: msg._id });
      }
    }

    function onDelivered({ messageId }) {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, status: 'delivered' } : m));
    }

    function onRead({ messageId }) {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, status: 'read' } : m));
    }

    function onTyping({ conversationId }) {
      if (conversationId === conversation._id) {
        setIsTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 2000);
      }
    }

    function onStopTyping({ conversationId }) {
      if (conversationId === conversation._id) {
        setIsTyping(false);
      }
    }

    socket.on('message:new', onNew);
    socket.on('message:delivered', onDelivered);
    socket.on('message:read', onRead);
    socket.on('typing:start', onTyping);
    socket.on('typing:stop', onStopTyping);

    return () => {
      socket.off('message:new', onNew);
      socket.off('message:delivered', onDelivered);
      socket.off('message:read', onRead);
      socket.off('typing:start', onTyping);
      socket.off('typing:stop', onStopTyping);
    };
  }, []);

  // Handle text change and typing events
  const handleTextChange = (val) => {
    setText(val);
    if (socketRef.current) {
      if (val.length > 0) {
        socketRef.current.emit('typing:start', { conversationId: conversation._id });
      } else {
        socketRef.current.emit('typing:stop', { conversationId: conversation._id });
      }
    }
  };

  async function send() {
    if (!text.trim()) return;
    const payload = {
      conversationId: conversation._id,
      toUserId: otherUser._id || otherUser.id,
      text
    };
    socketRef.current.emit('message:send', payload, ({ ok, message, error }) => {
      if (ok) {
        setMessages(prev => [...prev, { ...message, status: 'sent' }]);
      } else {
        alert('Send failed: ' + error);
      }
    });
    setText('');
    socketRef.current.emit('typing:stop', { conversationId: conversation._id });
  }

  function renderItem({ item }) {
    const fromMe = (item.senderId?.toString() || item.senderId) === (me?.id || me?._id);
    return <MessageBubble text={item.text} fromMe={fromMe} status={item.status} />;
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList data={messages} keyExtractor={m => m._id} renderItem={renderItem} />
      <TypingIndicator isTyping={isTyping} />
      <View style={{ flexDirection: 'row', padding: 8 }}>
        <TextInput
          value={text}
          onChangeText={handleTextChange}
          style={{ flex: 1, borderWidth: 1, padding: 8 }}
          placeholder="Type a message..."
        />
        <Button title="Send" onPress={send} />
      </View>
    </KeyboardAvoidingView>
  );
}
