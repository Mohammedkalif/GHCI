// screen/TransactionSuccessScreen.jsx — FINAL PHONEPE 2025 STYLE
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';

export default function TransactionSuccessScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { transaction } = route.params || {};

  if (!transaction) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>No transaction data</Text>
      </View>
    );
  }

  return (
    <LinearGradient colors={['#10B981', '#34D399', '#6EE7B7']} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <View style={styles.container}>



          <Text style={styles.title}>Payment Successful!</Text>
          <Text style={styles.amount}>
            ₹{parseFloat(transaction.amount).toLocaleString('en-IN')} sent
          </Text>

          {/* Recipient Info */}
          <View style={styles.recipientCard}>
            <Text style={styles.toText}>To</Text>
            <Text style={styles.recipientName}>{transaction.sender_details || 'Recipient'}</Text>
            <Text style={styles.recipientUpi}>{transaction.to_upi}</Text>
          </View>

          {/* Success Checkmark */}
          <View style={styles.checkCircle}>
            <Text style={styles.check}>✓</Text>
          </View>

          {/* Transaction Details */}
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Transaction ID</Text>
              <Text style={styles.detailValue}>{transaction.transactions_id}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date & Time</Text>
              <Text style={styles.detailValue}>
                {new Date(transaction.date).toLocaleDateString('en-IN')} • {transaction.time?.slice(0, 5)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Reference No</Text>
              <Text style={styles.detailValue}>{transaction.reference_no}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Payment Method</Text>
              <Text style={styles.detailValue}>UPI</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{transaction.status}</Text>
              </View>
            </View>
          </View>

          {/* Done Button */}
          <TouchableOpacity style={styles.doneBtn} onPress={() => navigation.popToTop()}>
            <Text style={styles.doneText}>Done</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, alignItems: 'center', justifyContent: 'center' },

  checkCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 10
  },
  check: { fontSize: 68, color: '#10B981', fontWeight: 'bold' },

  title: { fontSize: 34, fontFamily: 'Poppins-Bold', color: 'white', textAlign: "center", lineHeight: 40 },
  amount: { fontSize: 30, color: 'white', fontFamily: 'Poppins-SemiBold', marginBottom: 22 },

  recipientCard: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 24,
    padding: 16,
    width: '90%',
    alignItems: 'center',
    marginBottom: 6,
  },
  toText: { fontSize: 16, color: 'white', opacity: 0.9, fontFamily: 'Poppins-Medium', lineHeight: 16 },
  recipientName: { fontSize: 24, fontFamily: 'Poppins-SemiBold', color: 'white', lineHeight: 28, marginVertical: 2 },
  recipientUpi: { fontSize: 16, color: 'white', opacity: 0.9, fontFamily: 'Poppins-Medium', lineHeight: 20 },

  detailsCard: {
    backgroundColor: 'white',
    borderRadius: 28,
    padding: 16,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 20,
    marginBottom: 30,
  },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 4 },
  detailLabel: { fontSize: 15, color: '#64748B', fontFamily: 'Poppins-Medium' },
  detailValue: { fontSize: 15, fontFamily: 'Poppins-SemiBold', color: '#1E293B', textAlign: 'right', flex: 1, marginLeft: 20 },

  statusBadge: { backgroundColor: '#10B981', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  statusText: { color: 'white', fontSize: 14, fontFamily: 'Poppins-SemiBold' },

  doneBtn: {
    backgroundColor: 'white',
    paddingHorizontal: 60,
    paddingVertical: 18,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 15,
    marginBottom: 50
  },
  doneText: { color: '#10B981', fontSize: 18, fontFamily: 'Poppins-SemiBold' },
});