// screen/SendMoneyAmountScreen.jsx — FINAL 2025 PREMIUM + MULTIPLE ACCOUNTS SUPPORT
import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import api from '../api/api';

export default function SendMoneyAmountScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { recipient, email, phone, upiId } = route.params;
  const [amount, setAmount] = useState('');
  const [primaryAccount, setPrimaryAccount] = useState(null);
  const [receiverPrimaryAccount, setReceiverPrimaryAccount] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load sender's PRIMARY account + balance
  useEffect(() => {
    const loadPrimaryAccount = async () => {
      try {
        const body = {
          email: recipient.email,
          phone: recipient.phone_no
        }
        const res = await api.post("/account/getPrimaryAccount", { email, phone });
        const res1 = await api.post("/account/getPrimaryAccount", body);
        // Expecting response: { account_no, balance, bank_name, ifsc_code, ... }
        setPrimaryAccount(res.data);
        setReceiverPrimaryAccount(res1.data);
      } catch (err) {
        console.log("Primary Account Error:", err);
        Alert.alert("Error", "Could not load your account");
      } finally {
        setLoading(false);
      }
    };
    loadPrimaryAccount();
  }, []);

  const handleContinue = () => {
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount");
      return;
    }

    // CREATE PAYLOAD HERE
    const payload = {
      email,
      phone,
      account_no: primaryAccount.account_no,
      name: `Money Transfer to ${recipient.name}`,
      from_acc: primaryAccount.account_no,
      to_acc: receiverPrimaryAccount.account_no || "ACC1002",
      amount: numAmount,
      sender_details: primaryAccount.account_owner,
      type: "Debit",
      description: "Sent via app",
      from_upi: upiId,
      to_upi: recipient.upi_id,
    };

    // PASS TO PinScreen
    navigation.navigate('PinScreen', {
      transferPayload: payload,
      amount: numAmount,
      recipient,
      email: primaryAccount.email,
      phone: primaryAccount.phone_no,
    });
  };

  return (
    <LinearGradient colors={['#FAFAFA', '#F5F7FB', '#E8F0FE']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.container}>
          <Text style={styles.title}>Send Money</Text>

          {/* Recipient Card */}
          <View style={styles.recipientCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{recipient.name.charAt(0)}</Text>
            </View>
            <View style={styles.recipientInfo}>
              <Text style={styles.recipientName}>{recipient.name}</Text>
              <Text style={styles.recipientPhone}>{recipient.phone_no}</Text>
              <Text style={styles.recipientUpi}>{recipient.upi_id}</Text>
            </View>
          </View>

          {/* Amount Input */}
          <View style={styles.amountSection}>
            <Text style={styles.rupee}>₹</Text>
            <TextInput
              style={styles.amountInput}
              keyboardType="numeric"
              placeholder="0"
              value={amount}
              onChangeText={setAmount}
              autoFocus
            />
          </View>

          {/* From Primary Account */}
          {loading ? (
            <ActivityIndicator color="#6B46C1" size="small" />
          ) : primaryAccount ? (
            <View style={styles.accountInfo}>
              <Text style={styles.accountLabel}>From</Text>
              <Text style={styles.accountName}>{primaryAccount.bank_name} ••••{primaryAccount.account_no.slice(-4)}</Text>
              <Text style={styles.balanceText}>
                Available: <Text style={styles.balanceAmount}>₹{Number(primaryAccount.balance).toLocaleString('en-IN')}</Text>
              </Text>
            </View>
          ) : (
            <Text style={styles.noAccount}>No primary account found</Text>
          )}

          {/* Quick Amounts */}
          <View style={styles.quickAmounts}>
            {['100', '500', '1000', '5000'].map((val) => (
              <TouchableOpacity
                key={val}
                style={styles.quickBtn}
                onPress={() => setAmount(val)}
              >
                <Text style={styles.quickText}>₹{val}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Continue Button */}
          <TouchableOpacity style={styles.continueBtn} onPress={handleContinue} disabled={loading}>
            <Text style={styles.continueText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: 30, fontFamily: 'Poppins-Bold', color: '#1E293B', textAlign: 'center', marginBottom: 40 },

  recipientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 28,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 25,
    elevation: 15,
    marginBottom: 10,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 36,
    backgroundColor: '#6B46C1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  avatarText: { color: 'white', fontSize: 30, fontFamily: 'Poppins-Bold' },
  recipientInfo: { flex: 1 },
  recipientName: { fontSize: 22, fontFamily: 'Poppins-SemiBold', color: '#1E293B', lineHeight: 28 },
  recipientPhone: { fontSize: 15, color: '#64748B', fontFamily: 'Poppins-Medium', lineHeight: 20 },
  recipientUpi: { fontSize: 15, color: '#6B46C1', fontFamily: 'Poppins-Medium', lineHeight: 20 },

  amountSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  rupee: { fontSize: 56, color: '#6B46C1', fontFamily: 'Poppins-Bold' },
  amountInput: { fontSize: 64, fontFamily: 'Poppins-Bold', color: '#1E293B', minWidth: 300, textAlign: 'center' },

  accountInfo: { backgroundColor: 'white', borderRadius: 24, padding: 16, alignItems: 'center', marginBottom: 40, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 20, elevation: 10 },
  accountLabel: { fontSize: 14, color: '#64748B', fontFamily: 'Poppins-Medium', lineHeight: 20 },
  accountName: { fontSize: 18, fontFamily: 'Poppins-SemiBold', color: '#1E293B', marginVertical: 4, lineHeight: 24 },
  balanceText: { fontSize: 17, color: '#64748B', fontFamily: 'Poppins-Medium', lineHeight: 24 },
  balanceAmount: { fontFamily: 'Poppins-SemiBold', color: '#1E293B' },
  noAccount: { fontSize: 16, color: '#EF4444', textAlign: 'center', marginBottom: 30 },

  quickAmounts: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, paddingHorizontal: 10, flexWrap: "wrap" },
  quickBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: 4
  },
  quickText: { fontSize: 16, fontFamily: 'Poppins-SemiBold', color: '#475569' },

  continueBtn: {
    backgroundColor: '#6B46C1',
    paddingVertical: 14,
    borderRadius: 28,
    alignItems: 'center',
    shadowColor: '#6B46C1',
    shadowOpacity: 0.4,
    shadowRadius: 25,
    elevation: 15,
  },
  continueText: { color: 'white', fontSize: 18, fontFamily: 'Poppins-SemiBold' },
});