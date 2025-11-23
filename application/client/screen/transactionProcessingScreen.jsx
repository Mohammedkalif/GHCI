// screen/TransactionProcessingScreen.jsx
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';

export default function TransactionProcessingScreen() {
  const navigation = useNavigation();

  useEffect(() => {
    setTimeout(() => {
      navigation.replace('TransactionSuccessScreen');
    }, 3000);
  }, []);

  return (
    <LinearGradient colors={['#6B46C1', '#9F7AEA']} style={{ flex: 1 }}>
      <View style={styles.container}>
        <ActivityIndicator size="large" color="white" />
        <Text style={styles.text}>Processing your payment...</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { marginTop: 30, fontSize: 20, color: 'white', fontFamily: 'Poppins-Medium' },
});