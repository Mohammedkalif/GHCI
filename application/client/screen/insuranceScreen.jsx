// screen/InsuranceScreen.jsx — FINAL NEAT & PREMIUM 2025 VERSION
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

export default function InsuranceScreen() {
  const route = useRoute();
  const { accountNumber } = route.params || {};
  const accNo = typeof accountNumber === "object" ? accountNumber.account_no : accountNumber;

  const [myInsurances, setMyInsurances] = useState([]);
  const [availInsurances, setAvailInsurances] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [myRes, availRes] = await Promise.all([
          api.post("/insurance/getMyInsuranceDetails", { account_no: accNo }),
          api.post("/insurance/getAvailInsuranceDetails", { account_no: accNo })
        ]);
        setMyInsurances(myRes.data || []);
        setAvailInsurances(availRes.data || []);
      } catch (err) {
        console.log("Insurance Error:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [accNo]);

  if (loading) {
    return (
      <LinearGradient colors={['#FAFAFA', '#F5F7FB', '#E8F0FE']} style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#6B46C1" />
          <Text style={{ marginTop: 20, fontSize: 18, color: '#6B46C1', fontFamily: 'Poppins-Medium' }}>
            Loading insurance...
          </Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#FAFAFA', '#F5F7FB', '#E8F0FE']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

          {/* My Insurance */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Insurance</Text>
            {myInsurances.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No active insurance</Text>
              </View>
            ) : (
              myInsurances.map((ins) => (
                <View key={ins.id} style={styles.myCard}>
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.insName}>{ins.ins_name}</Text>
                      <Text style={styles.insType}>{ins.insurance_type}</Text>
                    </View>
                    <View style={[styles.statusBadge, 
                      ins.claim_status === 'Approved' ? styles.approvedBadge : 
                      ins.claim_status === 'Pending' ? styles.pendingBadge : styles.activeBadge
                    ]}>
                      <Text style={styles.statusText}>{ins.claim_status || 'Active'}</Text>
                    </View>
                  </View>

                  <Text style={styles.insDesc}>Description: {ins.description}</Text>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Premium Due - <Text style={styles.detailValue}>Every {ins.premium_due_day}</Text></Text>
                    
                  </View>

                  {ins.claim_history && ins.claim_history.length > 0 && (
                    <View style={styles.claimSection}>
                      <Text style={styles.claimLabel}>Recent Claim</Text>
                      <Text style={styles.claimDate}>
                        {new Date(ins.claim_history[0].date).toLocaleDateString('en-IN')}
                      </Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>

          {/* Available Insurance */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Available Insurance</Text>
            {availInsurances.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No offers available</Text>
              </View>
            ) : (
              availInsurances.map((ins) => (
                <TouchableOpacity key={ins.id} style={styles.offerCard}>
                  <Text style={styles.offerTitle}>{ins.ins_name}</Text>
                  <Text style={styles.offerType}>{ins.insurance_type}</Text>
                  <Text style={styles.offerDesc}>{ins.description}</Text>

                  <View style={styles.offerRow}>
                    <Text style={styles.offerLabel}>Premium Due - <Text style={styles.offerValue}>Every {ins.premium_due_day}</Text></Text>
                    
                  </View>

                  <TouchableOpacity style={styles.exploreBtn}>
                    <Text style={styles.exploreText}>Explore Plan</Text>
                  </TouchableOpacity>
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
  sectionTitle: { fontSize: 24, fontFamily: 'Poppins-SemiBold', color: '#0F172A', marginBottom: 12 },

  // My Insurance Card — SUPER TIGHT & CLEAN
  myCard: {
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  insName: { fontSize: 19, fontFamily: 'Poppins-SemiBold', color: '#1E293B', lineHeight: 28 },
  insType: { fontSize: 14, color: '#6B46C1', fontFamily: 'Poppins-Medium' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  activeBadge: { backgroundColor: '#10B981' },
  approvedBadge: { backgroundColor: '#10B981' },
  pendingBadge: { backgroundColor: '#F59E0B' },
  statusText: { color: 'white', fontSize: 12, fontFamily: 'Poppins-SemiBold' },

  insDesc: { fontSize: 14.5, color: '#64748B', lineHeight: 20, fontFamily: 'Poppins-Medium' },

  detailRow: { flexDirection: 'row', justifyContent: 'space-between', },
  detailLabel: { fontSize: 14.5, color: '#64748B', fontFamily: 'Poppins-Medium' },
  detailValue: { fontSize: 14, fontFamily: 'Poppins-SemiBold', color: '#1E293B' },

  claimSection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  claimLabel: { fontSize: 14.5, fontFamily: 'Poppins-SemiBold', color: '#1E293B' },
  claimDate: { fontSize: 14, color: '#64748B', marginTop: 4 },

  // Empty State
  emptyCard: { backgroundColor: '#F8FAFC', borderRadius: 20, padding: 32, alignItems: 'center', marginBottom: 16 },
  emptyText: { fontSize: 16, color: '#94A3B8', fontFamily: 'Poppins-Medium' },

  // Available Offers — TIGHT & PREMIUM
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

  offerRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 5 },
  offerLabel: { fontSize: 14.5, color: '#64748B', fontFamily: "Poppins-Medium" },
  offerValue: { fontSize: 14, fontFamily: 'Poppins-SemiBold', color: '#1E293B' },

  exploreBtn: {
    backgroundColor: '#0369A1',
    paddingVertical: 10,
    borderRadius: 18,
    alignItems: 'center',
  },
  exploreText: { color: 'white', fontSize: 16, fontFamily: 'Poppins-SemiBold' },
});