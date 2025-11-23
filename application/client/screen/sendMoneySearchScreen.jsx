// screen/SendMoneySearchScreen.jsx — FINAL PERFECT 2025 VERSION
import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import api from '../api/api';
import { useRoute } from '@react-navigation/native';

export default function SendMoneySearchScreen() {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const route = useRoute();
  const { email, phone, upiId } = route.params || {};

  const searchUsers = async (query) => {
    if (query.length < 1) {
      setUsers([]);
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/users/searchUser", { query });
      setUsers(res.data || []);
    } catch (err) {
      console.log("Search Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const selectUser = (user) => {
    navigation.navigate('SendMoneyAmountScreen', { recipient: user, email, phone, upiId });
    console.log("User", user)
  };

  return (
    <LinearGradient colors={['#FAFAFA', '#F5F7FB', '#E8F0FE']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.container}>
          <Text style={styles.title}>Send Money</Text>
          <Text style={styles.subtitle}>Enter phone number or UPI ID</Text>

          {/* Floating Label Input (PhonePe Style) */}
          <View style={styles.inputContainer}>
            {!searchQuery && (<Text style={[styles.floatingLabel]}>
              Search by phone or UPI ID
            </Text>)}
            <TextInput
              style={styles.input}
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                searchUsers(text);
              }}
              autoFocus
            />
            {loading && <ActivityIndicator style={styles.loader} color="#6B46C1" />}
          </View>

          {/* Results */}
          <FlatList
            data={users}
            keyExtractor={(item) => item.phone_no}
            contentContainerStyle={{ paddingBottom: 20 }}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.userItem} onPress={() => selectUser(item)}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{item.name}</Text>
                  <Text style={styles.userPhone}>{item.phone_no}</Text>
                  <Text style={styles.userUpi}>{item.upi_id}</Text>
                </View>
                <Text style={styles.arrow}>›</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              searchQuery.length > 2 && !loading ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No users found</Text>
                </View>
              ) : null
            }
          />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 32, fontFamily: 'Poppins-Bold', color: '#1E293B', },
  subtitle: { fontSize: 18, color: '#64748B', fontFamily: 'Poppins-Medium', marginBottom: 4 },

  // Floating Label Input (PhonePe Style)
  inputContainer: {
    backgroundColor: 'white',
    borderRadius: 24,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 25,
    elevation: 15,
    marginBottom: 20,
  },
  floatingLabel: {
    position: 'absolute',
    left: 24,
    top: 10,
    fontSize: 20,
    color: '#94A3B8',
    fontFamily: 'Poppins-Medium',
    zIndex: 1,
  },
  floatingLabelActive: {
    top: 8,
    fontSize: 13,
    color: '#6B46C1',
  },
  input: {
    fontSize: 18,
    fontFamily: 'Poppins-Medium',
    color: '#1E293B',
  },
  loader: { position: 'absolute', right: 20, top: 20 },

  // User Item
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 18,
    marginBottom: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 24,
    backgroundColor: '#6B46C1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: { color: 'white', fontSize: 24, fontFamily: 'Poppins-Bold' },
  userInfo: { flex: 1 },
  userName: { fontSize: 18, fontFamily: 'Poppins-SemiBold', color: '#1E293B', lineHeight: 20 },
  userPhone: { fontSize: 14, color: '#64748B', fontFamily: 'Poppins-Medium', lineHeight: 20 },
  userUpi: { fontSize: 14, color: '#6B46C1', fontFamily: 'Poppins-Medium', lineHeight: 20 },
  arrow: { fontSize: 28, color: '#94A3B8' },

  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: 17, color: '#94A3B8', fontFamily: 'Poppins-Medium' },
});