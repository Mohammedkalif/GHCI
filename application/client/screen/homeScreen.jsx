// screen/HomeScreen.jsx — FINAL WITH PERFECT LOANS/INSURANCE/INVESTMENTS LAYOUT
import React, { useEffect, useRef, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  StatusBar,
  Animated,
  Easing,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg';
import api from "../api/api.jsx";
import { useRoute } from '@react-navigation/native';

import { Send, ArrowDownToLine, Wallet, History } from 'lucide-react-native';

const { width } = Dimensions.get('window');

const VoiceWaveAnimation = () => {
  const anims = Array(12).fill().map(() => useRef(new Animated.Value(8)).current);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.stagger(80, anims.map(anim =>
        Animated.sequence([
          Animated.timing(anim, { toValue: Math.random() * 50 + 20, duration: 350, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 8, duration: 350, useNativeDriver: true }),
        ])
      ))
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <View style={styles.waveContainer}>
      {anims.map((anim, i) => (
        <Animated.View key={i} style={[styles.waveBar, { height: anim, backgroundColor: i % 2 === 0 ? '#8B5CF6' : '#C4B5FD' }]} />
      ))}
    </View>
  );
};

export default function HomeScreen() {

  const route = useRoute();
  const { email, phone } = route.params || {};

  const navigation = useNavigation();
  const floatAnim = useRef(new Animated.Value(0)).current;
  const blinkAnim = useRef(new Animated.Value(1)).current;
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [spokenText, setSpokenText] = useState('');

  // const [email, setEmail] = useState("bhadri@gmail.com");
  const [accountNum, setAccountNum] = useState("");
  const [upiId, setUpiId] = useState("");
  // const [phone, setPhone] = useState("9876543210");
  const [recentTransaction, setRecentTransaction] = useState({});


  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -20, duration: 3200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 3200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    const startBlinking = () => {
      const delay = Math.random() * 6000 + 4000;
      setTimeout(() => {
        Animated.sequence([
          Animated.timing(blinkAnim, { toValue: 0.1, duration: 100, useNativeDriver: true }),
          Animated.timing(blinkAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
        ]).start(startBlinking);
      }, delay);
    };
    startBlinking();
  }, []);

  const startListening = () => {
    setIsListening(true);
    setSpokenText('');
    setTimeout(() => {
      const cmds = ["check balance", "send money", "show transactions", "hello bhadri"];
      const cmd = cmds[Math.floor(Math.random() * cmds.length)];
      setSpokenText(cmd);
      setIsListening(false);
      if (cmd.includes('balance')) navigation.navigate('PinScreen');
      else if (cmd.includes('transaction')) navigation.navigate('Transactions');
    }, 2000);
  };

  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await api.post("/users/getUser", { email, phone });
        const account_num = await api.post("/account/getAccountNumber", { email, phone });
        setAccountNum(account_num.data[0]);
        const rec = await api.post("/transaction/getRecentTransactionsDetails", { account_no: account_num.data[0].account_no });
        setRecentTransaction(rec.data[0])
        setUpiId(res.data[0].upi_id);
        setUser(res.data[0]);
        setLoading(false);
      } catch (err) {
        console.log("Error:", err);
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  if (loading || !user) {
    return (
      <LinearGradient colors={['#FAFAFA', '#F5F7FB', '#E8F0FE']} style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontFamily: 'Poppins-Medium', fontSize: 20, color: '#6B46C1' }}>Loading...</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const qrData = `upi://pay?pa=${user.upi_id}&pa=${encodeURIComponent(user.name)}&cu=INR`;

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
      <LinearGradient colors={['#FAFAFA', '#F5F7FB', '#E8F0FE']} style={styles.background}>
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>

            {/* AI ORB */}
            <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate('ChatScreen')} style={styles.hero}>
              <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
                <View style={styles.orb}>
                  <View style={styles.innerGlow} />
                  <View style={styles.eyes}>
                    <Animated.View style={[styles.eye, { opacity: blinkAnim }]} />
                    <Animated.View style={[styles.eye, { opacity: blinkAnim }]} />
                  </View>
                  {isListening && <VoiceWaveAnimation />}
                </View>
              </Animated.View>

              <Text style={styles.greeting}>Hello, {user.name.split(' ')[0]}!</Text>
              <Text style={styles.subtitle}>Tap orb to speak</Text>
              {isListening && <Text style={styles.listeningText}>Listening...</Text>}
              {spokenText && <Text style={styles.spokenText}>"{spokenText}"</Text>}
            </TouchableOpacity>

            {/* 2x2 Cards */}
            <View style={styles.gridContainer}>
              <View style={styles.gridRow}>
                <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('SendMoneySearchScreen', { email, phone, upiId })}>
                  <Send color="#6B46C1" size={28} strokeWidth={2.3} />
                  <Text style={styles.cardTitle}>Send Money</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('SelfBankSelectScreen', { email, phone, upiId })}>
                  <ArrowDownToLine color="#10B981" size={28} strokeWidth={2.3} />
                  <Text style={styles.cardTitle}>To Self Bank</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.gridRow}>
                <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('PinScreen', { email, phone, accountNumber: accountNum })}>
                  <Wallet color="#F59E0B" size={28} strokeWidth={2.3} />
                  <Text style={styles.cardTitle}>Check Balance</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Transactions', { accountNumber: accountNum })}>
                  <History color="#8B5CF6" size={28} strokeWidth={2.3} />
                  <Text style={styles.cardTitle}>Transactions</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Recent Transactions Preview — NOW WITH REAL DATA & BEAUTIFUL UI */}
            <View style={styles.section}>
              <View style={styles.transactionCard}>
                <View style={styles.transactionHeader}>
                  <Text style={styles.transactionTitle}>Recent Transactions</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Transactions', { accountNumber: accountNum })}>
                    <Text style={styles.viewAllText}>View All →</Text>
                  </TouchableOpacity>
                </View>

                {recentTransaction && recentTransaction.id ? (
                  <View style={styles.recentTxnItem}>
                    <View style={styles.txnLeft}>
                      <Text style={styles.txnName}>{recentTransaction.name || 'Transaction'}</Text>
                      <Text style={styles.txnDate}>
                        {new Date(recentTransaction.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        {' • '}
                        {recentTransaction.time?.split('.')[0].slice(0, 5) || 'Time'} |{" "}
                        <Text style={styles.txnMethod}>{recentTransaction.method} • {recentTransaction.type}</Text>
                      </Text>

                    </View>

                    <View style={styles.txnRight}>
                      <Text style={[
                        styles.txnAmount,
                        { color: recentTransaction.type === 'Credit' ? '#10B981' : '#EF4444' }
                      ]}>
                        {recentTransaction.type === 'Credit' ? '+' : '-'}₹{parseFloat(recentTransaction.amount).toLocaleString('en-IN')}
                      </Text>
                      <Text style={styles.txnStatusSuccess}>Success</Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.noTxnText}>No recent transactions</Text>
                )}
              </View>
            </View>

            {/* My QR Code */}
            <View style={styles.qrSection}>
              <Text style={styles.qrTitle}>My QR Code</Text>
              <View style={styles.qrContainer}>
                <QRCode value={qrData} size={200} color="#111" backgroundColor="white" />
                <Text style={styles.qrText}>Scan to pay {user.name}</Text>
                <Text style={styles.qrUpi}>{user.upi_id}</Text>
              </View>
            </View>

            {/* Loans (Full Width) + Insurance & Investments (50% each) */}
            <View style={styles.serviceSection}>
              {/* Loans - Full Width */}
              <TouchableOpacity style={styles.fullWidthCard} onPress={() => navigation.navigate('LoansScreen', { accountNumber: accountNum })}>
                <View style={styles.serviceSubCard}>
                  <Text style={styles.serviceIcon}>Loan</Text>
                  <Text style={styles.serviceTitle}>My Loans & Offers</Text>
                </View>
                <Text style={styles.serviceArrow}>→</Text>
              </TouchableOpacity>

              {/* Insurance & Investments - Side by Side */}
              <View style={styles.halfRow}>
                <TouchableOpacity style={styles.halfCard} onPress={() => navigation.navigate('InsuranceScreen', { accountNumber: accountNum })}>
                  <View style={styles.serviceSubCard}>
                    <Text style={styles.serviceIcon}>Insurance</Text>
                    <Text style={styles.serviceTitle1}>My Insurance & Policies</Text>
                  </View>
                  {/* <Text style={styles.serviceArrow}>→</Text> */}
                </TouchableOpacity>

                <TouchableOpacity style={styles.halfCard} onPress={() => navigation.navigate('InvestmentsScreen', { accountNumber: accountNum })}>
                  <View style={styles.serviceSubCard}>
                    <Text style={styles.serviceIcon}>Invest</Text>
                    <Text style={styles.serviceTitle1}>My Investments & Mutual Funds</Text>
                  </View>
                  {/* <Text style={styles.serviceArrow}>→</Text> */}
                </TouchableOpacity>
              </View>
            </View>

            {/* About You */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About You</Text>
              <View style={styles.aboutCard}>
                <View style={styles.aboutRow}><Text style={styles.label}>Name</Text><Text style={styles.value}>{user.name}</Text></View>
                <View style={styles.aboutRow}><Text style={styles.label}>UPI ID</Text><Text style={styles.value}>{user.upi_id}</Text></View>
                <View style={styles.aboutRow}><Text style={styles.label}>Phone</Text><Text style={styles.value}>{user.phone_no}</Text></View>
              </View>
            </View>

          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </>
  );
};

const styles = StyleSheet.create({
  background: { flex: 1 },
  hero: { alignItems: 'center', paddingTop: 60, paddingBottom: 40 },
  orb: { width: 260, height: 260, borderRadius: 130, backgroundColor: '#6f1aa8ff', justifyContent: 'center', alignItems: 'center', borderWidth: 18, borderColor: 'rgba(255,255,255,0.7)', shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 30 }, shadowOpacity: 0.9, shadowRadius: 80, elevation: 70, marginBottom: 40 },
  innerGlow: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 130, top: -110, left: -110, right: -110, bottom: -110 },
  eyes: { position: 'absolute', flexDirection: 'row', gap: 60, top: 96 },
  eye: { width: 34, height: 56, backgroundColor: 'white', borderRadius: 17 },
  greeting: { fontSize: 34, fontFamily: 'Poppins-Bold', color: '#1E293B' },
  subtitle: { fontSize: 18, fontFamily: 'Poppins-Medium', color: '#64748B', marginTop: 8 },
  listeningText: { fontSize: 18, color: '#6B46C1', fontFamily: 'Poppins-SemiBold', marginTop: 16 },
  spokenText: { fontSize: 16, color: '#1E293B', fontFamily: 'Poppins-Medium', marginTop: 10, textAlign: 'center', paddingHorizontal: 40 },

  recentTxnItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 8
  },
  txnLeft: { flex: 1 },
  txnName: { fontSize: 17, fontFamily: 'Poppins-SemiBold', color: '#1E293B', lineHeight: 24 },
  txnDate: { fontSize: 13, color: '#64748B', fontFamily: 'Poppins-Regular', lineHeight: 18 },
  txnMethod: { fontSize: 13, color: '#6B46C1', fontFamily: 'Poppins-Medium', lineHeight: 18 },
  txnRight: { alignItems: 'flex-end', justifyContent: "flex-start" },
  txnAmount: { fontSize: 18, fontFamily: 'Poppins-Bold', lineHeight: 20 },
  txnStatusSuccess: { fontSize: 12, color: '#10B981', fontFamily: 'Poppins-Medium' },

  waveContainer: { position: 'absolute', flexDirection: 'row', alignItems: 'flex-end', gap: 5, bottom: 40 },
  waveBar: { width: 8, borderRadius: 4 },

  gridContainer: { paddingHorizontal: 20 },
  gridRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  card: { width: (width - 60) / 2, backgroundColor: 'white', borderRadius: 32, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.12, shadowRadius: 35, elevation: 20 },
  cardTitle: { marginTop: 10, fontSize: 16.5, fontFamily: 'Poppins-SemiBold', color: '#1E293B' },

  qrSection: { paddingHorizontal: 20, marginVertical: 10 },
  qrTitle: { fontSize: 22, fontFamily: 'Poppins-SemiBold', color: '#0F172A', marginBottom: 4 },
  qrContainer: { backgroundColor: 'white', borderRadius: 28, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.08, shadowRadius: 25, elevation: 15 },
  qrText: { marginTop: 12, fontSize: 16, fontFamily: 'Poppins-Medium', color: '#64748B' },
  qrUpi: { fontSize: 16, fontFamily: 'Poppins-SemiBold', color: '#6B46C1', lineHeight: 18 },

  serviceSection: { paddingHorizontal: 20, marginVertical: 10 },
  fullWidthCard: { backgroundColor: 'white', borderRadius: 24, padding: 18, marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 12 },
  halfRow: { flexDirection: 'row', justifyContent: 'space-between' },
  halfCard: { width: (width - 60) / 2, backgroundColor: 'white', borderRadius: 24, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 12 },
  serviceSubCard: { display: "flex", flexDirection: "column", alignItems: "flex-start" },
  serviceIcon: { fontSize: 20, fontFamily: "Poppins-SemiBold", lineHeight: 30 },
  serviceTitle: { fontSize: 14, fontFamily: 'Poppins-Medium', color: '#1E293B', width: 250 },
  serviceTitle1: { fontSize: 14, fontFamily: 'Poppins-Medium', color: '#1E293B', width: 140 },
  serviceArrow: { fontSize: 28, color: '#64748B' },

  section: { paddingHorizontal: 20, marginTop: 20 },
  transactionCard: { backgroundColor: 'white', borderRadius: 28, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.08, shadowRadius: 25, elevation: 15 },
  transactionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  transactionTitle: { fontSize: 20, fontFamily: 'Poppins-SemiBold', color: '#1E293B', lineHeight: 20 },
  viewAllText: { fontSize: 15, fontFamily: 'Poppins-Medium', color: '#6B46C1' },
  noTxnText: { fontSize: 16, color: '#94A3B8', textAlign: 'center', fontFamily: 'Poppins-Regular' },

  section: { paddingHorizontal: 20 },
  sectionTitle: { fontSize: 24, fontFamily: 'Poppins-SemiBold', color: '#0F172A', },
  aboutCard: { backgroundColor: 'white', borderRadius: 28, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.08, shadowRadius: 25, elevation: 15 },
  aboutRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  label: { fontSize: 15, color: '#64748B', fontFamily: 'Poppins-Medium' },
  value: { fontSize: 15, color: '#1E293B', fontFamily: 'Poppins-SemiBold', textAlign: 'right', flex: 1, marginLeft: 20 },
});