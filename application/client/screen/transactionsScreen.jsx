// screen/TransactionsScreen.jsx
import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import api from '../api/api.jsx';
import { useRoute } from '@react-navigation/native';

export default function TransactionsScreen() {
  const route = useRoute();
  const { accountNumber } = route.params || {};
  const accNo = typeof accountNumber === "object" ? accountNumber.account_no : accountNumber;

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accountNumber) return;

    const loadTransactions = async () => {
      try {
        const res = await api.post("/transaction/getTransactionsDetails", { account_no: accNo });
        
        setTransactions(res.data || []);
      } catch (err) {
        console.log("Error loading transactions:", err);
      } finally {
        setLoading(false);
      }
    };

    loadTransactions();
  }, [accountNumber]);

  const formatDate = (dateString) => {
    if (!dateString) return "Unknown Date";
    const date = new Date(dateString);
    return date.toDateString(); // Example: "Mon Jan 10 2025"
  };

  const renderItem = ({ item }) => {
    const amountColor = item.amount > 0 ? "#10B981" : "#EF4444";

    return (
      <View style={styles.transactionItem}>
        <View>
          <Text style={styles.txnName}>{item.description || item.name}</Text>
          <Text style={styles.txnStatus}>{formatDate(item.date)}</Text>
        </View>

        <Text style={[styles.txnAmount, { color: amountColor }]}>
          {item.amount > 0 ? "+₹" : "-₹"}{Math.abs(item.amount)}
        </Text>
      </View>
    );
  };

  return (
    <LinearGradient colors={['#FAFAFA', '#F5F7FB']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Transaction History</Text>
          <Text style={styles.accText}>Account: {accNo || "N/A"}</Text>
        </View>

        {/* Loading State */}
        {loading ? (
          <View style={styles.centerView}>
            <ActivityIndicator size="large" color="#6B46C1" />
            <Text style={styles.loadingText}>Loading transactions...</Text>
          </View>
        ) : transactions.length === 0 ? (
          <View style={styles.centerView}>
            <Text style={styles.noTxns}>No transactions found</Text>
          </View>
        ) : (
          <FlatList
            data={transactions}
            keyExtractor={(item, index) => String(index)}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 20,
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0'
  },
  title: {
    fontSize: 26,
    fontFamily: 'Poppins-Bold',
    color: '#1E293B',
    marginTop: 2
  },
  accText: {
    fontSize: 14,
    color: '#6B46C1',
    marginTop: 4,
    fontFamily: 'Poppins-SemiBold',
    lineHeight: 10
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8,
  },
  txnName: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#1E293B',
    lineHeight: 24
  },
  txnStatus: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    fontFamily: 'Poppins-Medium'
  },
  txnAmount: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold'
  },
  centerView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 10,
    color: '#6B7280',
    fontFamily: "Poppins-Medium"
  },
  noTxns: {
    fontSize: 16,
    color: '#94A3B8'
  }
});
