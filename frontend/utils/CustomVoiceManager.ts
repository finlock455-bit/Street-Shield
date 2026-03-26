import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Voice signature categories matching the folder structure
export const VOICE_CATEGORIES = {
  CHECKIN_REASSURANCE: 'checkin',
  AWARENESS_GEOFENCE: 'geofence',
  EMERGENCY_ALERTS: 'emergency',
  POSITIVE_ENCOURAGEMENT: 'positive',
  VARIATION_LINES: 'variation',
  GLUE_TRANSITIONS: 'glue',
  PARAGRAPH_FLOW: 'flow',
};

export class CustomVoiceManager {
  private static soundCache: Map<string, Audio.Sound> = new Map();
  private static recordings: Map<string, string[]> = new Map();
  private static lastUsedIndex: Map<string, number> = new Map();

  // Voice signature mapping - organized by categories
  private static phraseMap: {[key: string]: {category: string, variations: number}} = {
    // Check-in / Reassurance (6 variations)
    'checking in': { category: 'checkin', variations: 6 },
    'made it safely': { category: 'checkin', variations: 6 },
    'arrived': { category: 'checkin', variations: 6 },
    'everything okay': { category: 'checkin', variations: 6 },
    
    // Awareness / Geofence (3 variations)
    'unusual route': { category: 'geofence', variations: 3 },
    'outside usual area': { category: 'geofence', variations: 3 },
    'different location': { category: 'geofence', variations: 3 },
    
    // Emergency Alerts (5 variations)
    'emergency': { category: 'emergency', variations: 5 },
    'alert received': { category: 'emergency', variations: 5 },
    'help is coming': { category: 'emergency', variations: 5 },
    'stay there': { category: 'emergency', variations: 5 },
    
    // Positive Encouragement (5 variations)
    'nice': { category: 'positive', variations: 5 },
    'well done': { category: 'positive', variations: 5 },
    'have a great': { category: 'positive', variations: 5 },
    'made it': { category: 'positive', variations: 5 },
    
    // Variation Lines (4 variations)
    'all good': { category: 'variation', variations: 4 },
    'looks fine': { category: 'variation', variations: 4 },
    'everything fine': { category: 'variation', variations: 4 },
    
    // Glue Transitions (4 variations)
    'okay': { category: 'glue', variations: 4 },
    'hang on': { category: 'glue', variations: 4 },
    'let me check': { category: 'glue', variations: 4 },
    
    // Paragraph Flow (2 long-form variations)
    'complete_update': { category: 'flow', variations: 2 },
  };

  // Initialize and load saved recordings
  static async initialize() {
    try {
      const savedRecordings = await AsyncStorage.getItem('voiceSignatures');
      if (savedRecordings) {
        const recordings = JSON.parse(savedRecordings);
        this.recordings = new Map(Object.entries(recordings));
        console.log(`✅ Loaded ${this.recordings.size} voice signature categories`);
      }
    } catch (error) {
      console.error('Failed to load voice signatures:', error);
    }
  }

  // Save recordings by category and variation number
  static async saveRecording(category: string, variationIndex: number, uri: string) {
    const key = `${category}_${variationIndex}`;
    
    let categoryRecordings = this.recordings.get(category) || [];
    categoryRecordings[variationIndex] = uri;
    this.recordings.set(category, categoryRecordings);
    
    await this.persistRecordings();
    console.log(`✅ Saved: ${category} variation ${variationIndex + 1}`);
  }

  // Persist recordings to storage
  private static async persistRecordings() {
    try {
      const recordingsObj: {[key: string]: string[]} = {};
      this.recordings.forEach((value, key) => {
        recordingsObj[key] = value;
      });
      await AsyncStorage.setItem('voiceSignatures', JSON.stringify(recordingsObj));
    } catch (error) {
      console.error('Failed to save recordings:', error);
    }
  }

  // Check if custom voice is available
  static async isCustomVoiceEnabled(): Promise<boolean> {
    const enabled = await AsyncStorage.getItem('voiceCloneEnabled');
    return enabled === 'true' && this.recordings.size > 0;
  }

  // Main speech function - finds and plays appropriate recording
  static async speak(message: string, onComplete?: () => void): Promise<boolean> {
    try {
      const match = this.findBestMatch(message);
      
      if (match) {
        await this.playRecording(match.category, match.variationIndex, onComplete);
        return true;
      }
      
      return false; // No custom voice available, use TTS fallback
    } catch (error) {
      console.error('Custom voice playback error:', error);
      return false;
    }
  }

  // Intelligent phrase matching with variation rotation
  private static findBestMatch(message: string): {category: string, variationIndex: number} | null {
    const messageLower = message.toLowerCase();
    
    // Check each phrase pattern
    for (const [keyword, config] of Object.entries(this.phraseMap)) {
      if (messageLower.includes(keyword)) {
        const categoryRecordings = this.recordings.get(config.category);
        
        if (categoryRecordings && categoryRecordings.length > 0) {
          // Rotate through variations to avoid repetition
          const lastIndex = this.lastUsedIndex.get(config.category) || 0;
          const nextIndex = (lastIndex + 1) % categoryRecordings.length;
          this.lastUsedIndex.set(config.category, nextIndex);
          
          return {
            category: config.category,
            variationIndex: nextIndex
          };
        }
      }
    }
    
    return null;
  }

  // Play a specific recording with variation
  private static async playRecording(category: string, variationIndex: number, onComplete?: () => void) {
    try {
      const categoryRecordings = this.recordings.get(category);
      if (!categoryRecordings || !categoryRecordings[variationIndex]) {
        throw new Error(`Recording not found: ${category}[${variationIndex}]`);
      }
      
      const uri = categoryRecordings[variationIndex];
      const cacheKey = `${category}_${variationIndex}`;
      
      // Check cache
      let sound = this.soundCache.get(cacheKey);
      
      if (!sound) {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: false, volume: 0.8 }
        );
        sound = newSound;
        this.soundCache.set(cacheKey, sound);
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
      console.log(`🎤 Playing: ${category} variation ${variationIndex + 1}`);
      
    } catch (error) {
      console.error('Failed to play recording:', error);
      throw error;
    }
  }

  // Get a glue word for natural transitions
  static async playGlueTransition(onComplete?: () => void): Promise<boolean> {
    try {
      const glueRecordings = this.recordings.get('glue');
      if (glueRecordings && glueRecordings.length > 0) {
        const randomIndex = Math.floor(Math.random() * glueRecordings.length);
        await this.playRecording('glue', randomIndex, onComplete);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Glue transition error:', error);
      return false;
    }
  }

  // Clear all recordings
  static async clearRecordings() {
    for (const sound of this.soundCache.values()) {
      await sound.unloadAsync();
    }
    this.soundCache.clear();
    this.recordings.clear();
    this.lastUsedIndex.clear();
    
    await AsyncStorage.removeItem('voiceSignatures');
    await AsyncStorage.removeItem('voiceCloneEnabled');
  }

  // Get recording stats
  static getStats() {
    let totalRecordings = 0;
    this.recordings.forEach(variations => {
      totalRecordings += variations.length;
    });
    
    return {
      categories: this.recordings.size,
      totalRecordings,
      cachedSounds: this.soundCache.size,
      isEnabled: totalRecordings > 0,
    };
  }

  // Get category info for UI
  static getCategoryInfo() {
    return {
      checkin: { name: 'Check-in/Reassurance', count: this.recordings.get('checkin')?.length || 0, expected: 6 },
      geofence: { name: 'Awareness/Geofence', count: this.recordings.get('geofence')?.length || 0, expected: 3 },
      emergency: { name: 'Emergency Alerts', count: this.recordings.get('emergency')?.length || 0, expected: 5 },
      positive: { name: 'Positive/Encouragement', count: this.recordings.get('positive')?.length || 0, expected: 5 },
      variation: { name: 'Variation Lines', count: this.recordings.get('variation')?.length || 0, expected: 4 },
      glue: { name: 'Glue Transitions', count: this.recordings.get('glue')?.length || 0, expected: 4 },
      flow: { name: 'Paragraph Flow', count: this.recordings.get('flow')?.length || 0, expected: 2 },
    };
  }
}


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
      'emergency': 'emergency_alert',
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
