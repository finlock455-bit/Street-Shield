import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class CustomVoiceManager {
  private static soundCache: Map<string, Audio.Sound> = new Map();
  private static recordings: Map<string, string> = new Map();

  // Initialize and load saved recordings
  static async initialize() {
    try {
      const savedRecordings = await AsyncStorage.getItem('voiceRecordings');
      if (savedRecordings) {
        const recordings = JSON.parse(savedRecordings);
        this.recordings = new Map(Object.entries(recordings));
        console.log(`✅ Loaded ${this.recordings.size} custom voice recordings`);
      }
    } catch (error) {
      console.error('Failed to load voice recordings:', error);
    }
  }

  // Save a recording with a key
  static async saveRecording(key: string, uri: string) {
    this.recordings.set(key, uri);
    await this.persistRecordings();
  }

  // Persist recordings to storage
  private static async persistRecordings() {
    try {
      const recordingsObj = Object.fromEntries(this.recordings);
      await AsyncStorage.setItem('voiceRecordings', JSON.stringify(recordingsObj));
    } catch (error) {
      console.error('Failed to save recordings:', error);
    }
  }

  // Check if custom voice is available
  static async isCustomVoiceEnabled(): Promise<boolean> {
    const enabled = await AsyncStorage.getItem('voiceCloneEnabled');
    return enabled === 'true' && this.recordings.size > 0;
  }

  // Play custom voice or fallback to TTS
  static async speak(message: string, onComplete?: () => void): Promise<boolean> {
    try {
      // Try to find matching recording
      const recordingUri = this.findBestMatch(message);
      
      if (recordingUri) {
        await this.playRecording(recordingUri, onComplete);
        return true;
      }
      
      return false; // No custom voice available, use TTS fallback
    } catch (error) {
      console.error('Custom voice playback error:', error);
      return false;
    }
  }

  // Find best matching recording
  private static findBestMatch(message: string): string | null {
    const messageLower = message.toLowerCase();
    
    // Exact phrase matching
    const phraseMap: {[key: string]: string} = {
      'alert': 'alert_notification',
      'electric scooter': 'escooter_warning',
      'safety score': 'safety_score',
      'weather': 'weather_alert',
      'cycling': 'cycling_alert',
      'health': 'health_check',
      'location': 'location_update',
      'welcome': 'welcome',
    };
    
    for (const [keyword, recordingKey] of Object.entries(phraseMap)) {
      if (messageLower.includes(keyword)) {
        const uri = this.recordings.get(recordingKey);
        if (uri) return uri;
      }
    }
    
    return null;
  }

  // Play a recording
  private static async playRecording(uri: string, onComplete?: () => void) {
    try {
      // Check cache first
      let sound = this.soundCache.get(uri);
      
      if (!sound) {
        // Load sound
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: false, volume: 0.7 }
        );
        sound = newSound;
        this.soundCache.set(uri, sound);
      }
      
      // Set callback
      if (onComplete) {
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            onComplete();
          }
        });
      }
      
      // Play
      await sound.replayAsync();
      console.log('🎤 Playing custom voice recording');
      
    } catch (error) {
      console.error('Failed to play recording:', error);
      throw error;
    }
  }

  // Clear all recordings
  static async clearRecordings() {
    // Unload all sounds
    for (const sound of this.soundCache.values()) {
      await sound.unloadAsync();
    }
    this.soundCache.clear();
    this.recordings.clear();
    
    await AsyncStorage.removeItem('voiceRecordings');
    await AsyncStorage.removeItem('voiceCloneEnabled');
    await AsyncStorage.removeItem('voiceCloneId');
  }

  // Get recording stats
  static getStats() {
    return {
      recordingsCount: this.recordings.size,
      cachedSounds: this.soundCache.size,
      isEnabled: this.recordings.size > 0,
    };
  }
}
