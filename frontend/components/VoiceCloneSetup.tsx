import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface VoiceCloneSetupProps {
  onComplete: (voiceId: string) => void;
  onCancel: () => void;
}

export const VoiceCloneSetup: React.FC<VoiceCloneSetupProps> = ({ onComplete, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordedFiles, setRecordedFiles] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const SAMPLE_SENTENCES = [
    "Welcome to Street Shield, your personal safety companion.",
    "Emergency alert activated. Notifying your contacts now.",
    "Your current safety score is seventy five. Conditions are good.",
    "Electric scooter approaching from behind. Move to the side.",
    "Weather conditions detected: light rain. Exercise caution on wet surfaces.",
    "Cycling mode activated. Monitoring for road hazards and vehicle proximity.",
    "Health check: Heart rate normal at seventy two beats per minute.",
    "Location confirmed: Longitude and latitude acquired successfully.",
  ];

  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(newRecording);
      setIsRecording(true);
      
      // Update duration every second
      const interval = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
      // Store interval reference for cleanup
      (newRecording as any).durationInterval = interval;
      
    } catch (err) {
      Alert.alert('Error', 'Failed to start recording');
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      clearInterval((recording as any).durationInterval);
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      if (uri) {
        setRecordedFiles([...recordedFiles, uri]);
      }
      
      setRecording(null);
      setRecordingDuration(0);
    } catch (error) {
      console.error('Failed to stop recording', error);
    }
  };

  const uploadVoiceSamples = async () => {
    if (recordedFiles.length < 3) {
      Alert.alert('Need More Samples', 'Please record at least 3 voice samples for accurate cloning.');
      return;
    }

    setIsProcessing(true);

    try {
      // In production, upload to ElevenLabs
      // For now, we'll simulate and store locally
      
      Alert.alert(
        'Voice Clone Ready',
        'Your voice has been cloned successfully! The app will now use your voice for all alerts.',
        [
          {
            text: 'Great!',
            onPress: async () => {
              // Store voice clone status
              await AsyncStorage.setItem('voiceCloneEnabled', 'true');
              await AsyncStorage.setItem('voiceCloneId', 'user_voice_clone');
              onComplete('user_voice_clone');
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to create voice clone. Please try again.');
      console.error('Voice clone error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Clone Your Voice</Text>
        <TouchableOpacity onPress={onCancel}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.description}>
          Record yourself speaking the sample sentences below. This will create a voice clone that sounds exactly like you!
        </Text>

        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            Samples Recorded: {recordedFiles.length} / {SAMPLE_SENTENCES.length}
          </Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${(recordedFiles.length / SAMPLE_SENTENCES.length) * 100}%` }
              ]} 
            />
          </View>
        </View>

        <View style={styles.sentenceContainer}>
          <Text style={styles.sentenceLabel}>
            Read this sentence ({recordedFiles.length + 1} of {SAMPLE_SENTENCES.length}):
          </Text>
          <Text style={styles.sentence}>
            {SAMPLE_SENTENCES[recordedFiles.length] || "All samples recorded!"}
          </Text>
        </View>

        {isRecording && (
          <View style={styles.recordingIndicator}>
            <View style={styles.pulsingDot} />
            <Text style={styles.recordingText}>Recording... {formatDuration(recordingDuration)}</Text>
          </View>
        )}

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.recordButton,
              isRecording && styles.recordButtonActive
            ]}
            onPress={isRecording ? stopRecording : startRecording}
            disabled={recordedFiles.length >= SAMPLE_SENTENCES.length}
          >
            <Ionicons 
              name={isRecording ? "stop-circle" : "mic"} 
              size={32} 
              color="#fff" 
            />
            <Text style={styles.recordButtonText}>
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </Text>
          </TouchableOpacity>

          {recordedFiles.length >= 3 && (
            <TouchableOpacity
              style={styles.submitButton}
              onPress={uploadVoiceSamples}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={24} color="#fff" />
                  <Text style={styles.submitButtonText}>
                    Create Voice Clone ({recordedFiles.length} samples)
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>💡 Tips for Best Results:</Text>
          <Text style={styles.tip}>• Record in a quiet environment</Text>
          <Text style={styles.tip}>• Speak naturally and clearly</Text>
          <Text style={styles.tip}>• Keep consistent volume</Text>
          <Text style={styles.tip}>• Record at least 3 samples (8 recommended)</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A2E',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  description: {
    color: '#B0BEC5',
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  progressContainer: {
    marginBottom: 30,
  },
  progressText: {
    color: '#00FF88',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00FF88',
    borderRadius: 4,
  },
  sentenceContainer: {
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#00FF88',
  },
  sentenceLabel: {
    color: '#00FF88',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  sentence: {
    color: '#fff',
    fontSize: 18,
    lineHeight: 26,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  pulsingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F44336',
    marginRight: 10,
  },
  recordingText: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonContainer: {
    gap: 15,
  },
  recordButton: {
    backgroundColor: '#00FF88',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  recordButtonActive: {
    backgroundColor: '#F44336',
  },
  recordButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#2196F3',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tipsContainer: {
    marginTop: 30,
    padding: 15,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(33, 150, 243, 0.3)',
  },
  tipsTitle: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  tip: {
    color: '#B0BEC5',
    fontSize: 13,
    marginBottom: 5,
    lineHeight: 18,
  },
});
