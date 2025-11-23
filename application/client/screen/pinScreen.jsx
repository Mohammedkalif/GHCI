// screen/PinScreen.jsx — UNIVERSAL PIN SCREEN (Check Balance + Send Money)
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import api from '../api/api';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PinScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const {
    email,
    phone,
    accountNumber,
    amount,
    recipient,
    transferPayload
  } = route.params || {};

  const accNo = typeof accountNumber === "object" ? accountNumber.account_no : accountNumber;

  const [pin, setPin] = useState('');
  const [correctPin, setCorrectPin] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPin = async () => {
      try {
        const res = await api.post("/users/getPassword", { email, phone });
        setCorrectPin(res.data[0].password);
      } catch (err) {
        Alert.alert("Error", "Failed to load PIN");
        console.log(err);
      } finally {
        setLoading(false);
      }
    };
    loadPin();
  }, [email, phone]);

  const handleSubmit = async () => {
    if (pin !== correctPin) {
      Alert.alert('Wrong PIN', 'Try again', [{ text: 'OK', onPress: () => setPin('') }]);
      return;
    }

    // SUCCESS — Check if it's Send Money or Check Balance
    if (transferPayload) {
      // SEND MONEY — Add PIN to existing payload and send
      setLoading(true);
      try {
        const finalPayload = { ...transferPayload, pin };
        const res = await api.post("/transaction/transferMoney", finalPayload);
        navigation.replace('TransactionSuccessScreen', { transaction: res.data });
      } catch (err) {
        Alert.alert("Transfer Failed", err.response?.data?.error || "Try again");
      } finally {
        setLoading(false);
      }
    } else {
      // CHECK BALANCE — No API call needed
      navigation.replace('BalanceScreen',{ accountNo: accNo, email, phone, pin });
    }
  };

  if (loading) {
    return (
      <LinearGradient colors={['#FAFAFA', '#F5F7FB']} style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#6B46C1" />
          <Text style={{ marginTop: 20, fontSize: 18, color: '#6B46C1', fontFamily: "Poppins-Medium" }}>Secure verification...</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const isSendMoney = !!amount || !!recipient;

  return (
    <LinearGradient colors={['#FAFAFA', '#F5F7FB']} style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Enter Your 4-Digit PIN</Text>
        <Text style={styles.subtitle}>
          {isSendMoney ? `To send ₹${amount} to ${recipient?.name}` : "To view your balance securely"}
        </Text>

        <View style={styles.pinContainer}>
          <TextInput
            style={styles.pinInput}
            secureTextEntry
            keyboardType="number-pad"
            maxLength={4}
            value={pin}
            onChangeText={setPin}
            autoFocus
          />
          <View style={styles.dots}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={[styles.dot, pin.length > i && styles.dotFilled]} />
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitText}>Continue</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.forgotPin}>
          <Text style={styles.forgotText}>Forgot PIN?</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 40 },
  title: { fontSize: 28, fontFamily: 'Poppins-Bold', textAlign: 'center', color: '#1E293B', marginBottom: 8 },
  subtitle: { fontSize: 16, fontFamily: 'Poppins-Regular', textAlign: 'center', color: '#64748B', marginBottom: 50 },

  pinContainer: { alignItems: 'center', marginBottom: 60 },
  pinInput: { opacity: 0, position: 'absolute', width: 100, height: 60 },
  dots: { flexDirection: 'row', gap: 20 },
  dot: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#E2E8F0', borderWidth: 2, borderColor: '#CBD5E1' },
  dotFilled: { backgroundColor: '#6B46C1', borderColor: '#6B46C1' },

  submitButton: { backgroundColor: '#6B46C1', paddingVertical: 18, borderRadius: 16, alignItems: 'center', shadowColor: '#6B46C1', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 15 },
  submitText: { color: 'white', fontSize: 18, fontFamily: 'Poppins-SemiBold' },

  forgotPin: { marginTop: 30, alignItems: 'center' },
  forgotText: { fontSize: 15, fontFamily: 'Poppins-Medium', color: '#6B46C1' },
});