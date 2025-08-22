import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const TypingIndicator = ({ isTyping }) => {
  if (!isTyping) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Typing...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  text: {
    fontStyle: 'italic',
    color: '#888',
    fontSize: 14,
  },
});

export default TypingIndicator;
