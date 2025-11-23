// screen/BalanceScreen.jsx — FINAL 2025 PREMIUM BALANCE SCREEN
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import api from '../api/api';
import { Phone } from 'lucide-react-native';

export default function BalanceScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { accountNo, email, phone, pin } = route.params || {};

  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBalance = async () => {
      try {
        console.log("Data",accountNo)
        const res = await api.post("/account/getAccountBalance", { account_no: accountNo, email, phone });
        setBalance(res.data[0]?.balance || "0");
      } catch (err) {
        console.log("Balance Error:", err);
      } finally {
        setLoading(false);
      }
    };
    loadBalance();
  }, []);

  return (
    <LinearGradient colors={['#6B46C1', '#9F7AEA', '#C4B5FD']} style={styles.container}>
      <View style={styles.card}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6B46C1" />
            <Text style={styles.loadingText}>Fetching your balance securely...</Text>
          </View>
        ) : (
          <>
            {/* Success Checkmark */}
            <View style={styles.checkmarkCircle}>
              <Text style={styles.checkmark}>✓</Text>
            </View>

            <Text style={styles.successText}>Balance Retrieved Successfully!</Text>
            <Text style={styles.accountText}>Account ending •••• {accountNo?.slice(-4)}</Text>

            {/* Balance Amount */}
            <Text style={styles.currency}>₹</Text>
            <Text style={styles.balanceAmount}>{balance}</Text>
            <Text style={styles.availableText}>Available Balance</Text>

            {/* Action Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Transactions',{ accountNumber: accountNo})}>
                <Text style={styles.actionText}>View Transactions</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={() => navigation.goBack()}>
                <Text style={styles.actionText}>Done</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Decorative Bottom Wave */}
      <View style={styles.waveBackground}>
        <View style={styles.wave} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: 'white',
    borderRadius: 32,
    padding: 40,
    width: '88%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 40,
    elevation: 30,
  },
  loadingContainer: { alignItems: 'center' },
  loadingText: { marginTop: 20, fontSize: 18, color: '#6B46C1', fontFamily: 'Poppins-Medium' },

  checkmarkCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkmark: { fontSize: 48, color: 'white', fontWeight: 'bold' },

  successText: { fontSize: 24, fontFamily: 'Poppins-SemiBold', color: '#1E293B', textAlign: 'center', marginBottom: 8 },
  accountText: { fontSize: 15, color: '#64748B', fontFamily: 'Poppins-Medium', marginBottom: 16 },

  currency: { fontSize: 48, color: '#6B46C1', fontFamily: 'Poppins-Bold' },
  balanceAmount: { fontSize: 64, fontFamily: 'Poppins-Bold', color: '#1E293B', letterSpacing: 1, lineHeight: 50 },
  availableText: { fontSize: 16, color: '#64748B', fontFamily: 'Poppins-Medium', marginTop: 8, marginBottom: 40 },

  buttonRow: { flexDirection: 'row', gap: 16, marginTop: 20 },
  actionButton: {
    backgroundColor: '#6B46C1',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 16,
  },
  actionText: { color: 'white', fontSize: 16, fontFamily: 'Poppins-SemiBold' },

  waveBackground: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 100, overflow: 'hidden' },
  wave: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 180, backgroundColor: 'rgba(255,255,255,0.15)', borderTopLeftRadius: 80, borderTopRightRadius: 80 },
});