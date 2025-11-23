// screen/ChatScreen.jsx — FINAL REAL VOICE + CAMERA + FACE VERIFY FLOW + TTS
import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Animated,
  Platform,
  Alert,
  PermissionsAndroid,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Mic, Trash2, MessagesSquare } from 'lucide-react-native';
import AudioRecord from 'react-native-audio-record';
import { launchCamera } from "react-native-image-picker";
import Tts from 'react-native-tts';

const API_URL = "http://10.210.4.27:8000";

export default function ChatScreen() {
  const navigation = useNavigation();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef(null);
  
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello! I am your AI assistant. How can I help you?", sender: 'bot', time: 'Now' }
  ]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const formatTime = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  // ==================== TTS SETUP ====================
  useEffect(() => {
    // Initialize TTS
    Tts.setDefaultRate(0.5);
    Tts.setDefaultPitch(1.0);
    
    // Set default language (will be changed dynamically based on response)
    Tts.setDefaultLanguage('en-US');

    // TTS Events
    Tts.addEventListener('tts-start', () => console.log('TTS Started'));
    Tts.addEventListener('tts-finish', () => console.log('TTS Finished'));
    Tts.addEventListener('tts-cancel', () => console.log('TTS Cancelled'));

    return () => {
      Tts.removeAllListeners('tts-start');
      Tts.removeAllListeners('tts-finish');
      Tts.removeAllListeners('tts-cancel');
      Tts.stop();
    };
  }, []);

  // Detect language from text and speak
  const speakText = (text) => {
    if (!text || text.trim() === '') return;

    // Stop any ongoing speech
    Tts.stop();

    // Detect language and set appropriate voice
    const language = detectLanguage(text);
    console.log('Detected language:', language, 'for text:', text);
    
    Tts.setDefaultLanguage(language);
    Tts.speak(text);
  };

  // Simple language detection based on Unicode ranges
  const detectLanguage = (text) => {
    // Tamil Unicode range: 0x0B80-0x0BFF
    if (/[\u0B80-\u0BFF]/.test(text)) return 'ta-IN';
    
    // Hindi Unicode range: 0x0900-0x097F
    if (/[\u0900-\u097F]/.test(text)) return 'hi-IN';
    
    // Telugu Unicode range: 0x0C00-0x0C7F
    if (/[\u0C00-\u0C7F]/.test(text)) return 'te-IN';
    
    // Kannada Unicode range: 0x0C80-0x0CFF
    if (/[\u0C80-\u0CFF]/.test(text)) return 'kn-IN';
    
    // Malayalam Unicode range: 0x0D00-0x0D7F
    if (/[\u0D00-\u0D7F]/.test(text)) return 'ml-IN';
    
    // Arabic Unicode range: 0x0600-0x06FF
    if (/[\u0600-\u06FF]/.test(text)) return 'ar-SA';
    
    // Chinese Unicode range: 0x4E00-0x9FFF
    if (/[\u4E00-\u9FFF]/.test(text)) return 'zh-CN';
    
    // Japanese Unicode ranges: Hiragana, Katakana, Kanji
    if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(text)) return 'ja-JP';
    
    // Korean Unicode range: 0xAC00-0xD7AF
    if (/[\uAC00-\uD7AF]/.test(text)) return 'ko-KR';
    
    // Default to English
    return 'en-US';
  };

  // ==================== MIC PERMISSION ====================
  const requestMicPermission = async () => {
    if (Platform.OS === "android") {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  };

  // ==================== CAMERA CAPTURE ====================
  const openCameraAndCapture = () => {
    return new Promise((resolve, reject) => {
      launchCamera(
        {
          mediaType: "photo",
          cameraType: "front",
          includeBase64: false,
          saveToPhotos: false,
        },
        (response) => {
          if (response.didCancel) return reject("Cancelled");
          if (response.errorCode) return reject(response.errorMessage);

          const asset = response.assets?.[0];
          resolve({
            uri: asset.uri,
            type: asset.type || "image/jpeg",
            name: asset.fileName || "face.jpg",
          });
        }
      );
    });
  };

  // ==================== START RECORDING ====================
  const startVoiceRecording = async () => {
    const ok = await requestMicPermission();
    if (!ok) {
      Alert.alert("Error", "Microphone permission required");
      return;
    }

    try {
      // Stop any ongoing TTS before recording
      Tts.stop();
      
      setIsRecording(true);

      AudioRecord.init({
        sampleRate: 16000,
        channels: 1,
        bitsPerSample: 16,
        wavFile: `voice_${Date.now()}.wav`,
      });

      AudioRecord.start();
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to start recording");
      setIsRecording(false);
    }
  };

  // ==================== STOP RECORDING + SEND TO BACKEND + HANDLE FACE-AUTH ====================
  const stopVoiceRecording = async () => {
    if (!isRecording) return;

    try {
      const audioPath = await AudioRecord.stop();
      setIsRecording(false);

      // Add user message
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: "Voice message...",
        sender: 'user',
        time: 'Now'
      }]);

      // ---- SEND AUDIO FIRST ----
      const form = new FormData();
      form.append("audio", {
        uri: Platform.OS === "android" ? `file://${audioPath}` : audioPath,
        type: "audio/wav",
        name: `voice_${Date.now()}.wav`,
      });
      form.append("session_id", "user123");

      const response = await fetch(`${API_URL}/agent/voice`, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: form,
      });

      const data = await response.json();
      console.log("VOICE RESPONSE:", data);

      // Update user message with transcribed text
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1].text = data.transcribed_text || "Voice message...";
        return updated;
      });

      // ---- SAFE QUERY → DIRECT REPLY ----
      if (!data.requires_face_auth) {
        const botMessage = data.response || "Unauthorized";
        setMessages(prev => [...prev, {
          id: Date.now(),
          text: botMessage,
          sender: "bot",
          time: "Now"
        }]);
        
        // Speak the response
        speakText(botMessage);
        return;
      }

      // ---- SENSITIVE QUERY ----
      const facePrompt = "Sensitive action detected. Please verify your face.";
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: facePrompt,
        sender: "bot",
        time: "Now"
      }]);
      
      // Speak the prompt
      speakText(facePrompt);

      // ---- OPEN CAMERA ----
      let faceImage = null;
      try {
        faceImage = await openCameraAndCapture();
      } catch (err) {
        const cancelMsg = "Face verification cancelled.";
        setMessages(prev => [...prev, {
          id: Date.now(),
          text: cancelMsg,
          sender: "bot",
          time: "Now"
        }]);
        speakText(cancelMsg);
        return;
      }

      // ---- SEND FACE IMAGE ----
      const vForm = new FormData();
      vForm.append("request_id", data.request_id);
      vForm.append("face_image", {
        uri: faceImage.uri,
        type: faceImage.type || "image/jpeg",
        name: faceImage.name || "face.jpg",
      });

      const verifyRes = await fetch(`${API_URL}/agent/verify-face`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "multipart/form-data",
        },
        body: vForm,
      });

      const finalData = await verifyRes.json();
      console.log("FACE VERIFY:", finalData);

      // Final message
      const finalMsg = finalData.response || finalData.error || "Verification failed";
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: finalMsg,
        sender: "bot",
        time: "Now"
      }]);
      
      // Speak the final response
      speakText(finalMsg);

    } catch (err) {
      console.error("Error", err);
      const errorMsg = "Sorry, something went wrong.";
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: errorMsg,
        sender: "bot",
        time: "Now"
      }]);
      speakText(errorMsg);
    }
  };

  // ==================== PULSE + TIMER ====================
  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      pulseAnim.setValue(1);
      setRecordingTime(0);
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => timerRef.current && clearInterval(timerRef.current);
  }, [isRecording]);

  // ==================== RENDER MESSAGE ====================
  const renderMessage = ({ item }) => (
    <View style={[
      styles.messageBubble,
      item.sender === 'user' ? styles.userBubble : styles.botBubble
    ]}>
      <Text style={[
        styles.messageText,
        item.sender === 'user' ? styles.userText : styles.botText
      ]}>
        {item.text}
      </Text>
      <Text style={styles.messageTime}>{item.time}</Text>
    </View>
  );

  // ==================== UI ====================
  return (
    <LinearGradient colors={['#FAFAFA', '#F5F7FB', '#E8F0FE']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ArrowLeft color="#6B46C1" size={28} strokeWidth={2.5} />
          </TouchableOpacity>

          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>V</Text>
          </View>

          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Variance AI Assistant</Text>
            <Text style={styles.headerStatus}>Online • Ready to help</Text>
          </View>
        </View>

        {/* Messages */}
        <FlatList
          data={messages}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={[styles.messageList, { paddingBottom: isRecording ? 200 : 180 }]}
          renderItem={renderMessage}
          showsVerticalScrollIndicator={false}
        />

        {/* Bottom bar */}
        <View style={[styles.bottomBar, { height: isRecording ? 150 : 110 }]}>
          <View>
            {/* Recording Bar */}
            {isRecording && (
              <View style={styles.recordingBar}>
                <View style={styles.recordingPulse}>
                  <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }] }]} />
                  <View style={styles.redDot} />
                </View>
                <Text style={styles.recordingTime}>{formatTime(recordingTime)}</Text>
              </View>
            )}
          </View>
          <View style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", gap: 20, alignItems: "center" }}>
            <TouchableOpacity style={styles.iconLeft} onPress={() => speakText("என்னோட ட்ரான்சாக்ஷன் ஹிஸ்டரியை எடுத்துக்காட்டு")}>
              <MessagesSquare color="#94A3B8" size={28} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.centerMic}
              onPressIn={startVoiceRecording}
              onPressOut={stopVoiceRecording}
            >
              <Animated.View style={[
                styles.micPulse,
                isRecording && { transform: [{ scale: pulseAnim }] }
              ]} />
              <Mic color="white" size={32} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.iconRight} 
              onPress={() => {
                Tts.stop();
                setMessages([messages[0]]);
              }}
            >
              <Trash2 color="#94A3B8" size={28} />
            </TouchableOpacity>
          </View>
        </View>

      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#6B46C1',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 12,
    marginTop: 10
  },
  headerAvatarText: { color: 'white', fontSize: 24, fontFamily: 'Poppins-Bold', lineHeight: 20 },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 19, fontFamily: 'Poppins-SemiBold', color: '#1E293B', lineHeight: 28, marginTop: 10 },
  headerStatus: { fontSize: 14, color: '#10B981', fontFamily: 'Poppins-Medium', },

  messageList: { padding: 16, },

  messageBubble: {
    maxWidth: '78%',
    padding: 12,
    borderRadius: 24,
    marginVertical: 6,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#6B46C1',
    borderBottomRightRadius: 6,
  },
  botBubble: {
    alignSelf: 'flex-start',
    backgroundColor: 'white',
    borderBottomLeftRadius: 6,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 10,
  },
  userText: { color: 'white', fontSize: 16, fontFamily: 'Poppins-Medium', lineHeight: 20 },
  botText: { color: '#1E293B', fontSize: 16, fontFamily: 'Poppins-Medium', lineHeight: 20 },
  messageTime: { fontSize: 12, opacity: 0.7, marginTop: 6, alignSelf: 'flex-end', fontFamily: 'Poppins-Medium' },

  recordingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6B46C1',
    padding: 6,
    borderRadius: 32,
    gap: 6,
    margin: 10
  },
  pulseCircle: {
    width: 30,
    height: 30,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  redDot: {
    width: 15,
    height: 15,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    position: 'absolute',
    top: 7.5,
    left: 7.5,
  },
  recordingTime: { color: 'white', fontSize: 18, fontFamily: 'Poppins-SemiBold', lineHeight: 20 },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 150,
    backgroundColor: 'white',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    paddingBottom: Platform.OS === 'ios' ? 30 : 10,
    borderTopLeftRadius: 80,
    borderTopRightRadius: 80,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 20,
    marginBottom: 50
  },
  iconLeft: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerMic: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#9F7AEA',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#9F7AEA',
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 25,
  },
  micPulse: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#9F7AEA',
    opacity: 0.3,
  },
  iconRight: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
});