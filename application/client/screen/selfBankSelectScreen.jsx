// screen/SelfBankSelectScreen.jsx — SELECT YOUR OWN ACCOUNT TO TRANSFER
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
import { useNavigation } from '@react-navigation/native';
import api from '../api/api';
import { useRoute } from '@react-navigation/native';

export default function SelfBankSelectScreen() {
    const navigation = useNavigation();
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);

    const route = useRoute();
    const { email, phone, upiId } = route.params || {};

    useEffect(() => {
        const loadAccounts = async () => {
            try {
                const res = await api.post("/account/getAccountDetails", { email, phone });
                setAccounts(res.data || []);
            } catch (err) {
                console.log("Accounts Error:", err);
            } finally {
                setLoading(false);
            }
        };
        loadAccounts();
    }, []);

    const selectAccount = (account) => {
        navigation.navigate('SendMoneyAmountScreen', {
            recipient: {
                name: "Myself",
                phone_no: phone,
                upi_id: upiId,
                account_no: account.account_no,
                bank_name: account.bank_name
            }, email, phone, upiId
        });
    };

    if (loading) {
        return (
            <LinearGradient colors={['#FAFAFA', '#F5F7FB', '#E8F0FE']} style={{ flex: 1 }}>
                <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#6B46C1" />
                    <Text style={{ marginTop: 20, fontSize: 18, color: '#6B46C1', fontFamily: 'Poppins-Medium' }}>
                        Loading your accounts...
                    </Text>
                </SafeAreaView>
            </LinearGradient>
        );
    }

    return (
        <LinearGradient colors={['#FAFAFA', '#F5F7FB', '#E8F0FE']} style={{ flex: 1 }}>
            <SafeAreaView style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={{ padding: 20 }}>
                    <Text style={styles.title}>To Self</Text>
                    <Text style={styles.subtitle}>Choose account to transfer money to</Text>

                    {accounts.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <Text style={styles.emptyText}>No accounts found</Text>
                        </View>
                    ) : (
                        accounts.map((acc) => (
                            <TouchableOpacity key={acc.account_no} style={styles.accountCard} onPress={() => selectAccount(acc)}>
                                <View style={styles.bankInfo}>
                                    <View style={styles.bankLogo}>
                                        <Text style={styles.bankLogoText}>{acc.bank_name.charAt(0)}</Text>
                                    </View>
                                    <View>
                                        <Text style={styles.bankName}>{acc.bank_name}</Text>
                                        <Text style={styles.accNumber}>•••• {acc.account_no.slice(-4)}</Text>
                                        <Text style={styles.accType}>{acc.account_type} Account</Text>
                                    </View>
                                </View>
                                <View style={{ display: "flex", flexDirection: "column" }}>
                                    {acc.is_primary_account && (
                                        <View style={styles.primaryBadge}>
                                            <Text style={styles.primaryText}>Primary</Text>
                                        </View>
                                    )}
                                    <View style={styles.balanceSection}>
                                        {/* <Text style={styles.balanceLabel}>Balance</Text> */}
                                        <Text style={styles.balanceAmount}>₹{Number(acc.balance).toLocaleString('en-IN')}</Text>
                                    </View>
                                </View>


                            </TouchableOpacity>
                        ))
                    )}
                </ScrollView>
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    title: { fontSize: 32, fontFamily: 'Poppins-Bold', color: '#1E293B', },
    subtitle: { fontSize: 18, color: '#64748B', fontFamily: 'Poppins-Medium', marginBottom: 10 },

    accountCard: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 16,
        marginBottom: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 25,
        elevation: 12,
    },
    bankInfo: { flexDirection: 'row', alignItems: 'center' },
    bankLogo: {
        width: 50,
        height: 50,
        borderRadius: 28,
        backgroundColor: '#6B46C1',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    bankLogoText: { color: 'white', fontSize: 24, fontFamily: 'Poppins-Bold', lineHeight: 20 },
    bankName: { fontSize: 18, fontFamily: 'Poppins-SemiBold', color: '#1E293B', lineHeight: 20 },
    accNumber: { fontSize: 15, color: '#64748B', fontFamily: 'Poppins-Medium', lineHeight: 20 },
    accType: { fontSize: 14, color: '#6B46C1', fontFamily: 'Poppins-Medium', lineHeight: 20 },

    balanceSection: { alignItems: 'flex-end' },
    balanceLabel: { fontSize: 14, color: '#64748B' },
    balanceAmount: { fontSize: 18, fontFamily: 'Poppins-Bold', color: '#1E293B' },

    primaryBadge: { backgroundColor: '#10B981', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    primaryText: { color: 'white', fontSize: 12, fontFamily: 'Poppins-SemiBold' },

    emptyCard: { backgroundColor: '#F8FAFC', borderRadius: 24, padding: 50, alignItems: 'center' },
    emptyText: { fontSize: 17, color: '#94A3B8', fontFamily: 'Poppins-Medium' },
});