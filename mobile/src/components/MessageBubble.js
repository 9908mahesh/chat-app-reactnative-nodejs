import React from 'react';
import { View, Text } from 'react-native';

export default function MessageBubble({ text, fromMe, status }) {
  return (
    <View style={{
      alignSelf: fromMe ? 'flex-end' : 'flex-start',
      backgroundColor: '#e6f0ff',
      padding: 8,
      margin: 6,
      borderRadius: 8,
      maxWidth: '80%'
    }}>
      <Text>{text}</Text>
      {status ? <Text style={{ fontSize: 10, marginTop: 4, alignSelf: 'flex-end' }}>{status}</Text> : null}
    </View>
  );
}
