// LoginScreen_updated.jsx
// Replaces react-native-audio-recorder-player (problematic) with react-native-audio-record
// Keeps ReactNativeBiometrics + react-native-image-picker

import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

// Packages to install (run in your project):
// npm install react-native-biometrics react-native-image-picker react-native-audio-record
// then run pod install inside ios if needed

import ReactNativeBiometrics from 'react-native-biometrics';
import { launchCamera } from 'react-native-image-picker';
import AudioRecord from 'react-native-audio-record';

import { FingerprintPattern, ScanFace, AudioWaveform, Mic } from 'lucide-react-native';
import api from '../api/api';

const rnBiometrics = new ReactNativeBiometrics();

export default function LoginScreen() {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioFile, setAudioFile] = useState('');

  // === BACKEND URL ===
  const BACKEND_URL = 'http://10.210.4.27:8000';

  useEffect(() => {
    // configure AudioRecord once
    AudioRecord.init({
      sampleRate: 16000,
      channels: 1,
      bitsPerSample: 16,
      wavFile: 'voice_record.wav',
    });
  }, []);

  // ===== Email / Phone login =====
  const loginWithEmailPhone = async () => {
    if (!email.trim() || !phone.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email, phone and password');
      return;
    }

    try {
      const res = await api.post("/users/login", { email, phone, password })
      const res1 = res.data;
      if (res1.success) {
        Alert.alert('Success', 'Logged in!');
        navigation.replace('Home', { email: res1.user.email, phone: res1.user.phone });
      } else {
        Alert.alert('Failed', data.message || 'Login failed');
      }
    } catch (err) {
      Alert.alert('Login Failed');
      console.error(err);
    }
  };

  // ===== Fingerprint =====
  const loginWithFingerprint = async () => {
    try {
      const { available, biometryType } = await rnBiometrics.isSensorAvailable();
      if (!available) {
        Alert.alert('Error', 'No biometric sensor found');
        return;
      }
      console.log("BIO", biometryType);
      const { success } = await rnBiometrics.simplePrompt({ promptMessage: 'Authenticate' });
      if (success) {
        // Send verification to backend
        navigation.replace('Home', { email: "bhadri@gmail.com", phone: "9876543210" });
        // try {
        //   const resp = await fetch(`${BACKEND_URL}/auth/verify-biometric`, {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({ email: email.trim(), phone: phone.trim(), biometryType, verified: true }),
        //   });
        //   const data = await resp.json();
        //   if (data.success || data.verified) {
        //     Alert.alert('Success', `${biometryType} verified`);

        //   } else {
        //     Alert.alert('Failed', 'Biometric verification failed');
        //   }
        // } catch (err) {
        //   Alert.alert('Error', 'Failed to send verification to backend');
        // }
      } else {
        Alert.alert('Failed', 'Authentication cancelled');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Biometric error: ' + (err.message || err));
    }
  };

  // ===== Face capture =====
  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  };

  const captureAndSendFace = async () => {
    const ok = await requestCameraPermission();
    if (!ok) { Alert.alert('Error', 'Camera permission required'); return; }

    launchCamera({ mediaType: 'photo', cameraType: 'front', quality: 0.8 },
      async (response) => {
        if (response.didCancel) return;
        if (response.errorCode) {
          Alert.alert('Error', response.errorMessage || 'Camera error');
          return;
        }

        const asset = response.assets?.[0];
        if (!asset) return;

        const form = new FormData();
        form.append("image", {
          uri: asset.uri,
          type: asset.type || "image/jpeg",
          name: asset.fileName || "face.jpg",
        });
        form.append("email", email.trim());
        form.append("phone", phone.trim());

        try {
          const uploadResp = await fetch(`${BACKEND_URL}/auth/verify-face`, {
            method: 'POST',
            headers: {
              Accept: "application/json",
              "Content-Type": "multipart/form-data",
            },
            body: form,
          });

          const data = await uploadResp.json();
          if (data.verified || data.success) {
            Alert.alert("Success", "Face verified");
            navigation.replace("Home", { email: "bhadri@gmail.com", phone: "9876543210" });
          } else {
            Alert.alert("Failed", data.message || "Face not recognized");
          }
        } catch (err) {
          console.error(err);
          Alert.alert("Error", "Failed to upload face");
        }
      }
    );
  };

  // ===== Voice using react-native-audio-record =====
  const requestMicPermission = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  };

  const startVoiceRecording = async () => {
    const ok = await requestMicPermission();
    if (!ok) { Alert.alert('Error', 'Microphone permission required'); return; }

    try {
      setIsRecording(true);
      AudioRecord.start();
      console.log('Recording started');
    } catch (err) {
      console.error(err);
      setIsRecording(false);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopVoiceRecording = async () => {
    if (!isRecording) return;

    try {
      const audioPath = await AudioRecord.stop();
      setIsRecording(false);
      setAudioFile(audioPath);

      console.log("Recording saved to", audioPath);

      const form = new FormData();
      form.append("audio", {
        uri: Platform.OS === "android" ? `file://${audioPath}` : audioPath,
        name: `voice_${Date.now()}.wav`,
        type: "audio/wav",
      });
      form.append("email", email.trim());
      form.append("phone", phone.trim());

      const resp = await fetch(`${BACKEND_URL}/auth/verify-voice`, {
        method: "POST",
        headers: { "Content-Type": "multipart/form-data" },
        body: form,
      });

      const data = await resp.json();
      if (data.verified || data.success) {
        Alert.alert("Success", "Voice verified");
        navigation.replace("Home", { email: "bhadri@gmail.com", phone: "9876543210" });
      } else {
        Alert.alert("Failed", data.message || "Voice not recognized");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to upload audio");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Secure Login</Text>
          <Text style={styles.subtitle}>Advanced Biometric Authentication</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Credentials</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>EMAIL</Text>
            {!email && (<Text style={{ position: "absolute", top: 35, zIndex: 20, fontSize: 18, left: 14, fontFamily: 'Poppins-Medium' }}>Enter your Email</Text>)}
            <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>PHONE</Text>
            {!phone && (<Text style={{ position: "absolute", top: 35, zIndex: 20, fontSize: 18, left: 14, fontFamily: 'Poppins-Medium' }}>Enter your Phone No.</Text>)}
            <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>PASSWORD</Text>
            {!password && (<Text style={{ position: "absolute", top: 35, zIndex: 20, fontSize: 18, left: 14, fontFamily: 'Poppins-Medium' }}>Enter your Password</Text>)}
            <TextInput style={styles.input} value={password} onChangeText={setPassword} keyboardType="number-pad" secureTextEntry />
          </View>
          <TouchableOpacity style={styles.primaryBtn} onPress={loginWithEmailPhone}><Text style={styles.primaryBtnText}>Login with Credentials</Text></TouchableOpacity>
        </View>

        <View style={styles.dividerContainer}><View style={styles.dividerLine} /><Text style={styles.dividerText}>BIOMETRIC OPTIONS</Text><View style={styles.dividerLine} /></View>

        <View style={styles.biometricGrid}>
          <TouchableOpacity style={styles.bioCard} onPress={loginWithFingerprint}>
            <FingerprintPattern color="black" size={32} strokeWidth={2} />
            <Text style={styles.bioTitle}>Fingerprint</Text>
            <Text style={styles.bioSubtitle}>Touch sensor</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.bioCard} onPress={captureAndSendFace}>
            <ScanFace color="black" size={32} strokeWidth={2} />
            <Text style={styles.bioTitle}>Face ID</Text>
            <Text style={styles.bioSubtitle}>Take selfie</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.bioCard, isRecording && styles.bioCardRecording]} onPressIn={startVoiceRecording} onPressOut={stopVoiceRecording}>
            <AudioWaveform color="black" size={32} strokeWidth={2} />

            <Text style={styles.bioTitle}>{isRecording ? 'Recording...' : 'Voice ID'}</Text>
            <Text style={styles.bioSubtitle}>{isRecording ? 'Release to stop' : 'Hold to record'}</Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { flex: 1, padding: 20, justifyContent: 'center' },
  header: { marginBottom: 10 },
  title: { fontSize: 34, color: '#0F172A', textAlign: 'center', fontFamily: 'Poppins-Bold', marginTop: 30, lineHeight: 46 },
  subtitle: { fontSize: 14, color: '#64748B', textAlign: 'center', fontFamily: 'Poppins-SemiBold' },
  card: { backgroundColor: 'white', borderRadius: 20, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
  cardTitle: { fontSize: 16, color: '#0F172A', marginBottom: 6, fontFamily: 'Poppins-SemiBold' },
  inputGroup: { marginBottom: 8 },
  label: { fontSize: 12, color: '#64748B', marginBottom: 2, letterSpacing: 1, fontFamily: 'Poppins-Medium' },
  input: { backgroundColor: '#F1F5F9', borderRadius: 12, padding: 12, fontSize: 16, color: '#0F172A', borderWidth: 1.5, borderColor: '#E2E8F0', fontFamily: 'Poppins-Medium' },
  primaryBtn: { backgroundColor: '#6366F1', padding: 12, borderRadius: 12, alignItems: 'center', marginTop: 8, },
  primaryBtnText: { color: 'white', fontSize: 16, fontFamily: 'Poppins-SemiBold' },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#CBD5E1' },
  dividerText: { marginHorizontal: 16, fontSize: 10, color: '#94A3B8', fontFamily: 'Poppins-Medium', letterSpacing: 1.5 },
  biometricGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  bioCard: { backgroundColor: 'white', borderRadius: 16, padding: 8, width: '31%', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6, borderWidth: 2, borderColor: '#E2E8F0' },
  bioCardRecording: { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' },
  bioIconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  bioIconRecording: { backgroundColor: '#FEE2E2' },
  bioIcon: { fontSize: 28 },
  bioTitle: { fontSize: 14, fontFamily: 'Poppins-SemiBold', color: '#0F172A', textAlign: 'center', lineHeight: 20 },
  bioSubtitle: { fontSize: 12, color: '#64748B', fontFamily: 'Poppins-Medium', textAlign: 'center', lineHeight: 20 },
  infoBox: { backgroundColor: '#EEF2FF', padding: 16, borderRadius: 12, flexDirection: 'row', marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#6366F1' },
  infoEmoji: { fontSize: 20, marginRight: 12 },
  infoTextContainer: { flex: 1 },
  infoTitle: { fontSize: 13, fontWeight: '700', color: '#1E293B', marginBottom: 6 },
  infoText: { fontSize: 11, color: '#475569', lineHeight: 17 },
  settingsBtn: { padding: 12, alignItems: 'center' },
  settingsBtnText: { fontSize: 13, color: '#6366F1', fontWeight: '600' },
});
