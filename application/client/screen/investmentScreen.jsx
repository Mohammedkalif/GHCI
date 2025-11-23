// screen/InvestmentsScreen.jsx — FINAL (EXACT SAME COLOR THEME AS INSURANCE SCREEN)
import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useRoute } from '@react-navigation/native';
import api from '../api/api';
import { Star } from "lucide-react-native";

export default function InvestmentsScreen() {
  const route = useRoute();
  const { accountNumber } = route.params || {};
  const accNo = typeof accountNumber === "object" ? accountNumber.account_no : accountNumber;

  const [myInvestments, setMyInvestments] = useState([]);
  const [availInvestments, setAvailInvestments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadInvestments = async () => {
      try {
        const myRes = await api.post("/invest/getMyInvestDetails", { account_no: accNo });
        const availRes = await api.post("/invest/getAvailInvestDetails");
        setMyInvestments(myRes.data || []);
        setAvailInvestments(availRes.data || []);
      } catch (err) {
        console.log("Investments Error:", err);
      } finally {
        setLoading(false);
      }
    };
    loadInvestments();
  }, [accNo]);

  if (loading) {
    return (
      <LinearGradient colors={['#FAFAFA', '#F5F7FB', '#E8F0FE']} style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#6B46C1" />
          <Text style={{ marginTop: 20, fontSize: 18, color: '#6B46C1', fontFamily: 'Poppins-Medium' }}>
            Loading your investments...
          </Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#FAFAFA', '#F5F7FB', '#E8F0FE']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>

          {/* My Investments */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Investments</Text>
            {myInvestments.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No active investments</Text>
              </View>
            ) : (
              myInvestments.map((inv) => (
                <View key={inv.id} style={styles.myInvCard}>
                  <View style={styles.invHeader}>
                    <View>
                      <Text style={styles.fundName}>{inv.fund_name}</Text>
                      <Text style={styles.fundHouse}>{inv.fund_house} • {inv.investment_type}</Text>
                    </View>
                    <View style={[styles.riskBadge,
                    inv.risk_level === 'Low' ? styles.lowRisk :
                      inv.risk_level === 'Medium' ? styles.medRisk : styles.highRisk
                    ]}>
                      <Text style={styles.riskText}>{inv.risk_level}</Text>
                    </View>
                  </View>

                  <View style={styles.invDetails}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Invested</Text>
                      <Text style={styles.detailValue}>₹{Number(inv.invested_amount).toLocaleString('en-IN')}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Current Value</Text>
                      <Text style={styles.detailValue}>₹{Number(inv.current_value).toLocaleString('en-IN')}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Returns</Text>
                      <Text style={[styles.returnsValue, { color: inv.returns_percentage >= 0 ? '#10B981' : '#EF4444' }]}>
                        {inv.returns_percentage > 0 ? '+' : ''}{inv.returns_percentage}%
                      </Text>
                    </View>
                    {inv.nav && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>NAV</Text>
                        <Text style={styles.detailValue}>₹{inv.nav}</Text>
                      </View>
                    )}
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Invested On</Text>
                      <Text style={styles.detailValue}>{new Date(inv.invested_on).toLocaleDateString('en-IN')}</Text>
                    </View>
                  </View>

                  <View style={styles.statusContainer}>
                    <Text style={styles.statusActive}>{inv.status || 'Active'}</Text>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Available Investments */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Popular Investment Options</Text>
            {availInvestments.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No offers available</Text>
              </View>
            ) : (
              availInvestments.map((inv) => (
                <TouchableOpacity key={inv.id} style={styles.offerCard}>
                  <Text style={styles.offerTitle}>{inv.fund_name}</Text>
                  <Text style={styles.offerType}>{inv.investment_type} • {inv.category}</Text>
                  <Text style={styles.offerDesc}>Description: {inv.description}</Text>

                  <View style={styles.offerHighlights}>
                    <View style={styles.highlightItem}>
                      <Text style={styles.highlightLabel}>Min Investment</Text>
                      <Text style={styles.highlightValue}>₹{Number(inv.min_investment).toLocaleString('en-IN')}</Text>
                    </View>
                    <View style={styles.highlightItem}>
                      <Text style={styles.highlightLabel}>Risk</Text>
                      <Text style={styles.highlightValue}>{inv.risk_level}</Text>
                    </View>
                    <View style={styles.highlightItem}>
                      <Text style={styles.highlightLabel}>Lock-in</Text>
                      <Text style={styles.highlightValue}>{inv.lock_in_period}</Text>
                    </View>
                  </View>

                  <View style={styles.offerFooter}>
                    <View style={{display: "flex", flexDirection: "row", alignItems: "center"}}>
                      <Star size={24} color="gold" fill="gold" /><Text style={styles.rating}>{" "}{inv.rating}/5</Text>
                    </View>
                    <TouchableOpacity style={styles.investBtn}>
                      <Text style={styles.investText}>Invest Now</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>

        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionTitle: { fontSize: 24, fontFamily: 'Poppins-Bold', color: '#0F172A', marginBottom: 12 },

  // My Investments Card — EXACT SAME AS INSURANCE
  myInvCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 12,
  },
  invHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  fundName: { fontSize: 19, fontFamily: 'Poppins-SemiBold', color: '#1E293B', lineHeight: 28 },
  fundHouse: { fontSize: 14, color: '#6B46C1', fontFamily: 'Poppins-Medium' },
  riskBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  lowRisk: { backgroundColor: '#2f76faff' },
  medRisk: { backgroundColor: '#c9ae43ff' },
  highRisk: { backgroundColor: '#e84848ff' },
  riskText: { color: 'white', fontSize: 12, fontFamily: 'Poppins-SemiBold' },

  invDetails: {},
  detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailLabel: { fontSize: 14.5, color: '#64748B', fontFamily: 'Poppins-Medium' },
  detailValue: { fontSize: 15, fontFamily: 'Poppins-SemiBold', color: '#1E293B' },
  returnsValue: { fontSize: 16, fontFamily: 'Poppins-Bold' },

  statusContainer: { alignItems: 'flex-start' },
  statusActive: { backgroundColor: '#10B981', color: 'white', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 20, fontSize: 14, fontFamily: 'Poppins-SemiBold' },

  // Empty State
  emptyCard: { backgroundColor: '#F8FAFC', borderRadius: 20, padding: 32, alignItems: 'center', marginBottom: 16 },
  emptyText: { fontSize: 16, color: '#94A3B8', fontFamily: 'Poppins-Medium' },

  // Available Offers — EXACT SAME AS INSURANCE
  offerCard: {
    backgroundColor: '#E0F2FE',
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  offerTitle: { fontSize: 19, fontFamily: 'Poppins-SemiBold', color: '#0369A1', lineHeight: 20 },
  offerType: { fontSize: 14, color: '#0284C7', fontFamily: 'Poppins-Medium' },
  offerDesc: { fontSize: 14.5, color: '#64748B', lineHeight: 20, fontFamily: 'Poppins-Medium' },

  offerHighlights: { flexDirection: 'row', justifyContent: 'space-between' },
  highlightItem: { alignItems: 'center' },
  highlightLabel: { fontSize: 13, color: '#64748B', fontFamily: "Poppins-Medium" },
  highlightValue: { fontSize: 16, fontFamily: 'Poppins-SemiBold', color: '#0369A1', lineHeight: 20 },

  offerFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  rating: { fontSize: 16, fontFamily: 'Poppins-Medium' },
  investBtn: { backgroundColor: '#0369A1', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  investText: { color: 'white', fontSize: 16, fontFamily: 'Poppins-SemiBold' },
});