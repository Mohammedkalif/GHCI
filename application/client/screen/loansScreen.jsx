// screen/LoansScreen.jsx
import React, { useEffect, useState } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useRoute } from '@react-navigation/native';
import api from '../api/api';

export default function LoansScreen() {
    const route = useRoute();
    const { accountNumber } = route.params || {};
    const accNo = typeof accountNumber === "object" ? accountNumber.account_no : accountNumber;
    const [myLoans, setMyLoans] = useState([]);
    const [availLoans, setAvailLoans] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {

        const loadLoans = async () => {
            try {

                const myRes = await api.post("/loan/getMyLoanDetails", { account_no: accNo });
                const availRes = await api.post("/loan/getAvailLoanDetails", { account_no: accNo });

                setMyLoans(myRes.data || []);
                setAvailLoans(availRes.data || []);
            } catch (err) {
                console.log("Loans Error:", err);
            } finally {
                setLoading(false);
            }
        };
        loadLoans();
    }, []);

    if (loading) {
        return (
            <LinearGradient colors={['#FAFAFA', '#F5F7FB']} style={{ flex: 1 }}>
                <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#6B46C1" />
                    <Text style={{ marginTop: 20, fontSize: 18, color: '#6B46C1', fontFamily: 'Poppins-Medium' }}>
                        Loading your loans...
                    </Text>
                </SafeAreaView>
            </LinearGradient>
        );
    }

    return (
        <LinearGradient colors={['#FAFAFA', '#F5F7FB']} style={{ flex: 1 }}>
            <SafeAreaView style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={{ padding: 20 }}>

                    <Text style={styles.title}>My Loans</Text>
                    {myLoans.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <Text style={styles.emptyText}>No active loans</Text>
                        </View>
                    ) : (
                        myLoans.map((loan) => (
                            <View key={loan.id} style={styles.loanCard}>
                                <Text style={styles.loanName}>{loan.loan_name}</Text>
                                <Text style={styles.loanType}>{loan.loan_type}</Text>
                                <View style={styles.row}>
                                    <Text style={styles.label}>Amount</Text>
                                    <Text style={styles.value}>₹{loan.loan_amount.toLocaleString()}</Text>
                                </View>
                                <View style={styles.row}>
                                    <Text style={styles.label}>EMI</Text>
                                    <Text style={styles.value}>₹{loan.emi_amount}/month</Text>
                                </View>
                                <View style={styles.row}>
                                    <Text style={styles.label}>Due Date</Text>
                                    <Text style={styles.value}>{new Date(loan.due_date).toLocaleDateString()}</Text>
                                </View>
                                <View style={styles.statusBadge}>
                                    <Text style={styles.statusText}>{loan.loan_status}</Text>
                                </View>
                            </View>
                        ))
                    )}

                    <Text style={styles.title}>Available Loans</Text>
                    {availLoans.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <Text style={styles.emptyText}>No offers available</Text>
                        </View>
                    ) : (
                        availLoans.map((loan) => (
                            <TouchableOpacity key={loan.id} style={styles.offerCard}>
                                <Text style={styles.offerTitle}>{loan.loan_name}</Text>
                                <Text style={styles.offerDesc}>{loan.description}</Text>
                                <Text style={styles.offerAmount}>Up to ₹{loan.loan_amount.toLocaleString()}</Text>
                                <Text style={styles.offerRate}>{loan.percentage_rate}% p.a.</Text>
                                <TouchableOpacity style={styles.applyBtn}>
                                    <Text style={styles.applyText}>Apply Now</Text>
                                </TouchableOpacity>
                            </TouchableOpacity>
                        ))
                    )}

                </ScrollView>
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    title: { fontSize: 26, fontFamily: 'Poppins-Bold', color: '#1E293B', marginVertical: 10 },
    emptyCard: { backgroundColor: '#F8FAFC', borderRadius: 20, padding: 40, alignItems: 'center' },
    emptyText: { fontSize: 16, color: '#94A3B8', fontFamily: 'Poppins-Medium' },

    loanCard: { backgroundColor: 'white', borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 12 },
    loanName: { fontSize: 20, fontFamily: 'Poppins-SemiBold', color: '#1E293B', },
    loanType: { fontSize: 14, color: '#6B46C1', fontFamily: 'Poppins-Medium', lineHeight: 20 },
    row: { flexDirection: 'row', justifyContent: 'space-between' },
    label: { fontSize: 15, color: '#64748B', fontFamily: 'Poppins-Medium',  },
    value: { fontSize: 15, fontFamily: 'Poppins-SemiBold', color: '#1E293B' },
    statusBadge: { alignSelf: 'flex-start', backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 6 },
    statusText: { color: 'white', fontSize: 13, fontFamily: 'Poppins-SemiBold' },

    offerCard: { backgroundColor: '#f2edf8ff', borderRadius: 20, padding: 24, marginBottom: 16 },
    offerTitle: { fontSize: 20, fontFamily: 'Poppins-SemiBold', color: '#6B46C1', lineHeight: 22 },
    offerDesc: { fontSize: 14, color: '#64748B', fontFamily: 'Poppins-Medium'  },
    offerAmount: { fontSize: 22, fontFamily: 'Poppins-Bold', color: '#1E293B', lineHeight: 24 },
    offerRate: { fontSize: 16, color: '#6B46C1', fontFamily: 'Poppins-Medium'  },
    applyBtn: { backgroundColor: '#6B46C1', padding: 10, borderRadius: 16, alignItems: 'center', marginTop: 4 },
    applyText: { color: 'white', fontSize: 16, fontFamily: 'Poppins-SemiBold' },
});