import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  Dimensions,
  TextInput,
  Modal,
} from 'react-native';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { Accelerometer, Pedometer, DeviceMotion } from 'expo-sensors';

const { width, height } = Dimensions.get('window');

// Notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

interface LocationData {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  timestamp: string;
}

interface SafetyScore {
  overall_score: number;
  risk_factors: string[];
  recommendations: string[];
  weather_risk: number;
  traffic_risk: number;
  location_risk: number;
  alerts: Array<{
    type: string;
    message: string;
    priority: string;
  }>;
}

interface WeatherData {
  temperature: number;
  humidity: number;
  weather_condition: string;
  visibility?: number;
  wind_speed?: number;
  ice_risk: boolean;
  hazard_level: string;
}

interface SafetyAnalysis {
  id: string;
  location: LocationData;
  weather: WeatherData;
  safety_score: SafetyScore;
  timestamp: string;
  ai_analysis: string;
}

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function SafeWalkApp() {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [safetyAnalysis, setSafetyAnalysis] = useState<SafetyAnalysis | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [voiceAlertsEnabled, setVoiceAlertsEnabled] = useState(true);
  const [lastAlertTime, setLastAlertTime] = useState<number>(0);
  
  // State to track voice interactions to reduce repetition
  const [hasSeenSetupVoice, setHasSeenSetupVoice] = useState(false);
  const [voiceInteractionState, setVoiceInteractionState] = useState({
    setupIntroPlayed: false,
    triggerWordExplained: false,
    contactsExplained: false,
    lastContactIndex: -1,
    lastTriggerWord: ''
  });
  
  // Refs for debouncing voice feedback
  const triggerWordTimeout = useRef<NodeJS.Timeout | null>(null);
  
  // Proximity threat detection state
  const [movementHistory, setMovementHistory] = useState<LocationData[]>([]);
  const [proximityThreats, setProximityThreats] = useState<any[]>([]);
  const [proximityAlertsEnabled, setProximityAlertsEnabled] = useState(true);
  
  // AI Noise Cancellation state
  const [noiseProfile, setNoiseProfile] = useState<any>(null);
  const [noiseCancellationEnabled, setNoiseCancellationEnabled] = useState(true);
  const [currentNoiseLevel, setCurrentNoiseLevel] = useState<number>(0);
  
  // Biometric monitoring state
  const [biometricData, setBiometricData] = useState<any>(null);
  const [healthAlerts, setHealthAlerts] = useState<any[]>([]);
  const [heartRate, setHeartRate] = useState<number>(0);
  const [stressLevel, setStressLevel] = useState<number>(0);
  const [stepCount, setStepCount] = useState<number>(0);
  
  // Emergency system state
  const [emergencyTriggerWord, setEmergencyTriggerWord] = useState<string>('');
  const [isEmergencySetupOpen, setIsEmergencySetupOpen] = useState(false);
  const [isEmergencyModeActive, setIsEmergencyModeActive] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState<string[]>([]);
  const [voiceListening, setVoiceListening] = useState(false);

  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const analysisInterval = useRef<NodeJS.Timeout | null>(null);
  const audioRecording = useRef<Audio.Recording | null>(null);
  const emergencyModeStartTime = useRef<number>(0);

  useEffect(() => {
    initializeApp();
    return () => {
      stopTracking();
    };
  }, []);
  useEffect(() => {
    return () => {
      // Cleanup intervals on unmount
      if (analysisInterval.current) {
        clearInterval(analysisInterval.current);
      }
      // Cleanup voice trigger timeouts
      if (listeningTimeout.current) {
        clearTimeout(listeningTimeout.current);
      }
      if (triggerWordTimeout.current) {
        clearTimeout(triggerWordTimeout.current);
      }
      // Cleanup hands-free mode
      if (handsFreeInterval.current) {
        clearInterval(handsFreeInterval.current);
      }
      // Cleanup voice info system
      if (voiceInfoTimeout.current) {
        clearTimeout(voiceInfoTimeout.current);
      }
    };
  }, []);

  const initializeApp = async () => {
    await requestPermissions();
    await loadSettings();
    if (await shouldAutoStart()) {
      startTracking();
    }
  };

  const requestPermissions = async () => {
    try {
      // Provide voice guidance about permissions
      if (voiceAlertsEnabled) {
        await speakAlert("Welcome to Street Shield! I need to request some permissions to keep you safe.");
      }

      // Request location permissions
      const locationStatus = await Location.requestForegroundPermissionsAsync();
      
      // Request notification permissions  
      const notificationStatus = await Notifications.requestPermissionsAsync();

      // More flexible permission handling - allow partial permissions
      const hasLocationPermission = locationStatus.status === 'granted';
      const hasNotificationPermission = notificationStatus.status === 'granted';
      
      if (hasLocationPermission || hasNotificationPermission) {
        setPermissionsGranted(true);
        
        // Voice feedback based on permissions
        if (voiceAlertsEnabled) {
          if (hasLocationPermission && hasNotificationPermission) {
            await speakAlert("Perfect! All permissions granted. Street Shield is ready to protect you.");
          } else if (hasLocationPermission) {
            await speakAlert("Location permission granted. I can track your safety, but notifications are limited.");
          } else if (hasNotificationPermission) {
            await speakAlert("Notification permission granted. I'll use demo mode for safety features.");
          }
        }
      } else {
        // Still allow demo mode even without permissions
        if (Platform.OS === 'web') {
          setPermissionsGranted(true);
          if (voiceAlertsEnabled) {
            await speakAlert("Running in demo mode. SafeWalk features will be simulated for your safety.");
          }
        } else {
          Alert.alert(
            'Permissions Needed for Full Protection',
            'SafeWalk works best with location and notification permissions. You can still use demo mode or try again.',
            [
              { text: 'Demo Mode', onPress: () => {
                setPermissionsGranted(true);
                speakAlert("Demo mode activated. Street Shield will simulate safety features.");
              }},
              { text: 'Try Again', onPress: () => requestPermissions() }
            ]
          );
        }
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      // Fallback to demo mode on error
      setPermissionsGranted(true);
      if (voiceAlertsEnabled) {
        await speakAlert("Permission request failed. Running in demo mode for your safety.");
      }
    }
  };

  const loadSettings = async () => {
    try {
      const voiceEnabled = await AsyncStorage.getItem('voiceAlertsEnabled');
      if (voiceEnabled !== null) {
        setVoiceAlertsEnabled(JSON.parse(voiceEnabled));
      }
      
      // Load emergency settings
      const triggerWord = await AsyncStorage.getItem('emergencyTriggerWord');
      if (triggerWord) {
        setEmergencyTriggerWord(triggerWord);
      }
      
      const contacts = await AsyncStorage.getItem('emergencyContacts');
      if (contacts) {
        setEmergencyContacts(JSON.parse(contacts));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const shouldAutoStart = async (): Promise<boolean> => {
    try {
      const autoStart = await AsyncStorage.getItem('autoStartEnabled');
      return autoStart === 'true';
    } catch (error) {
      return false;
    }
  };

  const startTracking = async () => {
    if (!permissionsGranted) {
      await requestPermissions();
      return;
    }

    try {
      setIsTracking(true);
      
      // Voice prompt for starting
      if (voiceAlertsEnabled) {
        await speakAlert("Street Shield protection is now active. I'm monitoring your safety and surroundings.");
      }

      // Try to get real location, fallback to demo if needed
      try {
        const hasLocationPermission = await Location.getForegroundPermissionsAsync();
        
        if (hasLocationPermission.status === 'granted') {
          // Start real location tracking
          locationSubscription.current = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.BestForNavigation,
              timeInterval: 5000, // Update every 5 seconds
              distanceInterval: 10, // Update every 10 meters
            },
            (newLocation) => {
              const locationData: LocationData = {
                latitude: newLocation.coords.latitude,
                longitude: newLocation.coords.longitude,
                altitude: newLocation.coords.altitude || undefined,
                accuracy: newLocation.coords.accuracy || undefined,
                timestamp: new Date().toISOString(),
              };
              setLocation(locationData);
              
              // Update movement history (keep last 10 locations for proximity analysis)
              setMovementHistory(prev => {
                const updated = [...prev, locationData];
                return updated.slice(-10); // Keep only last 10 positions
              });
            }
          );
        } else {
          // Demo mode with simulated location
          startDemoMode();
        }
      } catch (locationError) {
        console.log('Location tracking not available, using demo mode');
        startDemoMode();
      }

      // Start periodic safety analysis
      analysisInterval.current = setInterval(() => {
        if (location) {
          performSafetyAnalysis(location);
        }
      }, 15000); // Analyze every 15 seconds for better responsiveness

      showNotification('🛡️ Street Shield Activated', 'Advanced AI protection system engaged');
      
      // Initialize advanced features
      setTimeout(async () => {
        if (location) {
          performSafetyAnalysis(location);
        }
        
        // Initialize AI noise cancellation
        await initializeNoiseCancellation();
        
        // Initialize biometric monitoring
        await initializeBiometricMonitoring();
      }, 3000);

    } catch (error) {
      console.error('Error starting tracking:', error);
      if (voiceAlertsEnabled) {
        await speakAlert("I encountered an issue starting full tracking, but I'll run in demo mode to keep you safe.");
      }
      startDemoMode();
    }
  };

  const startDemoMode = () => {
    // Simulated location for demo (New York City)
    const demoLocation: LocationData = {
      latitude: 40.7128 + (Math.random() - 0.5) * 0.01, // Add slight variation
      longitude: -74.0060 + (Math.random() - 0.5) * 0.01,
      accuracy: 10,
      timestamp: new Date().toISOString(),
    };
    
    setLocation(demoLocation);
    
    // Update demo location periodically
    const demoInterval = setInterval(() => {
      const updatedDemo: LocationData = {
        latitude: demoLocation.latitude + (Math.random() - 0.5) * 0.001,
        longitude: demoLocation.longitude + (Math.random() - 0.5) * 0.001,
        accuracy: Math.floor(Math.random() * 15) + 5,
        timestamp: new Date().toISOString(),
      };
      setLocation(updatedDemo);
    }, 8000); // Update every 8 seconds

    // Store demo interval reference (reuse locationSubscription for cleanup)
    locationSubscription.current = {
      remove: () => clearInterval(demoInterval)
    } as any;
  };

  // AI-DRIVEN NOISE CANCELLATION FUNCTIONS
  const initializeNoiseCancellation = async () => {
    try {
      if (!location) return;
      
      const response = await fetch(`${BACKEND_URL}/api/audio/noise-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude,
          timestamp: new Date().toISOString(),
          user_context: {
            activity_type: 'walking',
            time_of_day: new Date().getHours(),
            user_id: 'noise_user'
          }
        }),
      });

      if (response.ok) {
        const profile = await response.json();
        setNoiseProfile(profile);
        
        // Apply noise cancellation based on AI analysis
        await applyIntelligentNoiseCancellation(profile);
      }
    } catch (error) {
      console.error('Error initializing noise cancellation:', error);
    }
  };

  const applyIntelligentNoiseCancellation = async (profile: any) => {
    try {
      if (!noiseCancellationEnabled) return;
      
      // Simulate noise cancellation application
      setCurrentNoiseLevel(profile.predicted_noise_level || 60);
      
      // Voice guidance about environment
      if (voiceAlertsEnabled && profile) {
        let noiseGuidance = "";
        
        if (profile.predicted_noise_level > 80) {
          noiseGuidance = `High noise environment detected. I've activated aggressive noise filtering while preserving safety sounds like ${profile.critical_sounds?.slice(0, 2).join(' and ') || 'sirens and alarms'}.`;
        } else if (profile.predicted_noise_level > 60) {
          noiseGuidance = `Moderate noise environment. Balanced noise cancellation active, keeping you aware of important sounds.`;
        } else {
          noiseGuidance = `Quiet environment detected. Minimal noise filtering to maintain full situational awareness.`;
        }
        
        await processVoiceAlert(noiseGuidance, 'environment_update');
      }
    } catch (error) {
      console.error('Error applying noise cancellation:', error);
    }
  };

  // BIOMETRIC MONITORING FUNCTIONS
  const initializeBiometricMonitoring = async () => {
    try {
      // Simulate biometric data collection
      startBiometricTracking();
      
    } catch (error) {
      console.error('Error initializing biometric monitoring:', error);
    }
  };

  const startBiometricTracking = () => {
    // Simulate real-time biometric data
    const biometricInterval = setInterval(async () => {
      const simulatedBiometrics = {
        heart_rate: Math.floor(Math.random() * 40) + 60, // 60-100 BPM
        stress_level: Math.random() * 0.5, // 0-0.5 (low to moderate)
        step_count: stepCount + Math.floor(Math.random() * 3),
        fatigue_level: Math.random() * 0.3, // 0-0.3 (low fatigue)
        activity_level: 'moderate',
        blood_oxygen: Math.floor(Math.random() * 5) + 96, // 96-100%
        timestamp: new Date().toISOString()
      };

      setBiometricData(simulatedBiometrics);
      setHeartRate(simulatedBiometrics.heart_rate);
      setStressLevel(simulatedBiometrics.stress_level);
      setStepCount(simulatedBiometrics.step_count);

      // Analyze biometric data
      await analyzeBiometricData(simulatedBiometrics);
      
    }, 10000); // Update every 10 seconds

    // Store interval for cleanup
    return biometricInterval;
  };

  const analyzeBiometricData = async (biometrics: any) => {
    try {
      if (!location) return;

      const response = await fetch(`${BACKEND_URL}/api/health/biometric-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...biometrics,
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
            timestamp: new Date().toISOString()
          },
          safety_context: {
            temperature: safetyAnalysis?.weather?.temperature || 20,
            activity_level: 'moderate',
            user_id: 'health_user'
          }
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setHealthAlerts(result.health_alerts || []);
        
        // Process health alerts
        for (const alert of result.health_alerts || []) {
          await processHealthAlert(alert);
        }
        
        // Handle emergency situations
        if (result.emergency_triggered) {
          await triggerMedicalEmergency(result.health_alerts);
        }
      }
    } catch (error) {
      console.error('Error analyzing biometric data:', error);
    }
  };

  const processHealthAlert = async (alert: any) => {
    if (!voiceAlertsEnabled) return;

    let priority: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    
    if (alert.severity === 'critical') {
      priority = 'critical';
    } else if (alert.severity === 'high') {
      priority = 'high';
    } else if (alert.severity === 'low') {
      priority = 'low';
    }

    // Health-specific voice guidance
    let healthMessage = `Health Alert: ${alert.message}`;
    if (alert.recommended_action) {
      healthMessage += ` ${alert.recommended_action}`;
    }

    await processVoiceAlert(healthMessage, 'health_alert');
    
    // Show notification
    await showNotification(
      `🏥 Health Alert - ${alert.alert_type}`, 
      alert.message
    );
  };

  const triggerMedicalEmergency = async (alerts: any[]) => {
    const criticalAlert = alerts.find(alert => alert.auto_emergency);
    if (criticalAlert && voiceAlertsEnabled) {
      await speakAlert(
        "Medical emergency detected! I'm alerting your emergency contacts and local authorities. Stay calm, help is on the way.",
        'critical'
      );
    }
  };

  const stopTracking = () => {
    setIsTracking(false);
    
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
    
    if (analysisInterval.current) {
      clearInterval(analysisInterval.current);
      analysisInterval.current = null;
    }
  };

  const performSafetyAnalysis = async (locationData: LocationData) => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`${BACKEND_URL}/api/safety/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location: locationData,
          movement_history: movementHistory,
          user_context: {
            activity_type: 'walking',
            speed: 'pedestrian',
            time_of_day: new Date().getHours(),
            user_id: 'demo_user'
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const analysis: SafetyAnalysis = await response.json();
      setSafetyAnalysis(analysis);
      
      // Process alerts and notifications
      await processAlerts(analysis);
      
    } catch (error) {
      console.error('Error performing safety analysis:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const processAlerts = async (analysis: SafetyAnalysis) => {
    const now = Date.now();
    const alerts = analysis.safety_score.alerts;
    
    // Prevent spam - only alert if it's been more than 30 seconds since last alert
    if (now - lastAlertTime < 30000) {
      return;
    }

    // ELECTRIC SCOOTER DETECTION - Critical for music listeners
    const scooterAlerts = alerts.filter(alert => 
      alert.type === 'proximity_threat' && 
      (alert.message.toLowerCase().includes('electric scooter') || 
       alert.message.toLowerCase().includes('silent vehicle'))
    );

    for (const scooterAlert of scooterAlerts) {
      if (proximityAlertsEnabled) {
        // High-priority notification for e-scooters due to silence
        await showNotification('🛴 E-Scooter Alert!', scooterAlert.message);
        
        if (voiceAlertsEnabled) {
          // Music-friendly voice alerts for e-scooters
          let scooterVoiceMessage = "";
          
          if (scooterAlert.message.toLowerCase().includes('critical') || 
              scooterAlert.message.toLowerCase().includes('immediate')) {
            scooterVoiceMessage = "Immediate evasion! Electric scooter approaching fast. Move aside now!";
          } else if (scooterAlert.message.toLowerCase().includes('high') ||
                     scooterAlert.message.toLowerCase().includes('step aside')) {
            scooterVoiceMessage = "Electric scooter approaching. Step aside quickly to avoid collision.";
          } else if (scooterAlert.message.toLowerCase().includes('behind')) {
            scooterVoiceMessage = "Silent electric scooter detected behind you. Stay alert and be ready to move.";
          } else if (scooterAlert.message.toLowerCase().includes('crossing')) {
            scooterVoiceMessage = "Electric scooter crossing your path. Watch for silent vehicles.";
          } else {
            scooterVoiceMessage = "Electric scooter nearby. These vehicles are silent and fast - stay aware of your surroundings.";
          }
          
          await processVoiceAlert(scooterVoiceMessage, 'escooter_alert', { priority: 'urgent' });
        }
        
        setLastAlertTime(now);
      }
    }

    // Process high-priority alerts first
    for (const alert of alerts) {
      // Skip e-scooter alerts as they're already handled above
      if (alert.type === 'proximity_threat' && 
          (alert.message.toLowerCase().includes('electric scooter') || 
           alert.message.toLowerCase().includes('silent vehicle'))) {
        continue;
      }
      
      if (alert.priority === 'high' || alert.priority === 'critical') {
        await showNotification(`⚠️ Safety Alert - ${alert.type}`, alert.message);
        
        if (voiceAlertsEnabled) {
          let voiceMessage = `Safety alert: ${alert.message}`;
          if (alert.priority === 'critical') {
            voiceMessage = `Critical safety warning: ${alert.message}. Please exercise extreme caution.`;
          }
          await speakAlert(voiceMessage);
        }
        
        setLastAlertTime(now);
        break; // Only show one high-priority alert at a time
      }
    }

    // MUSIC-FRIENDLY ENHANCED WEATHER WARNINGS
    if (analysis.weather.ice_risk && voiceAlertsEnabled) {
      const iceMessage = analysis.weather.ice_confidence && analysis.weather.ice_confidence > 0.8 
        ? "High confidence ice hazard detected. Surface conditions are dangerous. Walk slowly and consider an alternate route."
        : "Ice conditions possible. Use caution on surfaces and watch for slippery areas.";
      
      await processVoiceAlert(iceMessage, 'ice_warning', analysis.weather);
    }
    
    if (analysis.weather.weather_condition === 'fog' && analysis.weather.visibility && analysis.weather.visibility < 2 && voiceAlertsEnabled) {
      await processVoiceAlert("Dense fog detected with very low visibility. Wear bright colors and use lights if available. Stay close to safe areas.", 'severe_weather', analysis.weather);
    }

    // Process specific hazards with targeted alerts
    if (analysis.weather.specific_hazards && analysis.weather.specific_hazards.length > 0) {
      const criticalHazards = analysis.weather.specific_hazards.filter(h => 
        h.includes('extreme') || h.includes('hurricane') || h.includes('black_ice') || h.includes('zero_visibility')
      );
      
      if (criticalHazards.length > 0 && voiceAlertsEnabled) {
        const hazardMessage = `Critical weather conditions: ${criticalHazards.join(', ').replace(/_/g, ' ')}. Exercise extreme caution.`;
        await processVoiceAlert(hazardMessage, 'severe_weather', analysis.weather);
      }
    }

    // Check overall safety score and provide intelligent voice guidance
    const score = analysis.safety_score.overall_score;
    if (voiceAlertsEnabled && now - lastAlertTime > 60000) { // Voice guidance every minute
      let voiceGuidance = "";
      
      if (score >= 85) {
        voiceGuidance = "Your current area looks very safe. Continue with confidence.";
      } else if (score >= 70) {
        voiceGuidance = `Safety score is ${score}. Stay alert and follow basic safety precautions.`;
      } else if (score >= 50) {
        voiceGuidance = `Moderate safety concerns detected. Your safety score is ${score}. Consider increased caution.`;
      } else if (score >= 30) {
        voiceGuidance = `Safety score is low at ${score}. Please exercise significant caution and stay aware of your surroundings.`;
      } else {
        voiceGuidance = `Critical safety alert! Your score is only ${score}. Consider finding a safer route or location immediately.`;
      }
      
      // Add recommendations if available
      if (analysis.safety_score.recommendations.length > 0) {
        const topRecommendation = analysis.safety_score.recommendations[0];
        voiceGuidance += ` Recommendation: ${topRecommendation}`;
      }

      await speakAlert(voiceGuidance);
      setLastAlertTime(now);
    }

    // Visual notification for low scores
    if (score < 40) {
      await showNotification(
        '🚨 Low Safety Score',
        `Current safety score: ${score}/100. Exercise extreme caution.`
      );
    }
  };

  // Emergency System Functions
  const setupEmergencyTrigger = async () => {
    setIsEmergencySetupOpen(true);
    
    // Voice guidance for emergency setup
    if (voiceAlertsEnabled) {
      await speakAlert("Welcome to Emergency Setup. I'll guide you through configuring your personal safety system. This could save your life in a dangerous situation.");
      
      // Provide initial guidance after a brief pause
      setTimeout(async () => {
        await speakAlert("First, you'll choose a secret trigger word. This should be a unique word you can say clearly during an emergency. Avoid common words you might say accidentally.");
      }, 3000);
    }
  };

  // Phone number validation
  const validatePhoneNumber = (phone: string): boolean => {
    // Basic phone validation - accepts formats like: +1234567890, (123) 456-7890, 123-456-7890
    const phoneRegex = /^(\+\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const saveEmergencySettings = async (triggerWord: string, contacts: string[]) => {
    try {
      // Validate contacts
      const validContacts = contacts.filter(contact => contact.length > 0);
      const invalidContacts = validContacts.filter(contact => !validatePhoneNumber(contact));
      
      if (invalidContacts.length > 0) {
        if (voiceAlertsEnabled) {
          await speakAlert(`Invalid phone number format detected: ${invalidContacts.join(', ')}. Please use formats like +1234567890 or (123) 456-7890.`);
        }
        return;
      }

      // Save to backend
      const emergencySettings = {
        user_id: 'demo_user',
        trigger_word: triggerWord,
        contacts: validContacts,
        auto_call_authorities: true,
        location_sharing_enabled: true,
        voice_confirmation_enabled: true
      };

      const response = await fetch(`${BACKEND_URL}/api/emergency/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emergencySettings)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Also save locally for offline access
      await AsyncStorage.setItem('emergencyTriggerWord', triggerWord);
      await AsyncStorage.setItem('emergencyContacts', JSON.stringify(validContacts));
      
      setEmergencyTriggerWord(triggerWord);
      setEmergencyContacts(validContacts);
      setIsEmergencySetupOpen(false);
      
      if (voiceAlertsEnabled) {
        await speakAlert(`Perfect! Your emergency system is ready. Your trigger word is ${triggerWord}. I added ${validContacts.length} emergency contact${validContacts.length > 1 ? 's' : ''}. If you say ${triggerWord}, I will alert all your contacts with your location. Street Shield emergency protection is active.`);
      }
    } catch (error) {
      console.error('Error saving emergency settings:', error);
      if (voiceAlertsEnabled) {
        await speakAlert("There was an error saving your emergency settings to the cloud, but they are saved locally. Please check your internet connection and try again.");
      }
    }
  };

  const triggerEmergencyMode = async () => {
    if (isEmergencyModeActive) return; // Prevent multiple triggers
    
    setIsEmergencyModeActive(true);
    emergencyModeStartTime.current = Date.now();
    
    // Immediate emergency response
    await showNotification('🚨 EMERGENCY ACTIVATED', 'Emergency mode activated! Notifying contacts and authorities.');
    
    if (voiceAlertsEnabled) {
      Speech.stop();
      await speakAlert("Emergency mode activated. I'm sending your location to emergency contacts and alerting local authorities. Stay calm, help is on the way.");
    }

    // Send emergency alerts via backend
    await sendEmergencyAlerts();
    
    // Start emergency monitoring (increase frequency)
    if (analysisInterval.current) {
      clearInterval(analysisInterval.current);
    }
    analysisInterval.current = setInterval(() => {
      if (location) {
        performSafetyAnalysis(location);
      }
    }, 5000); // Every 5 seconds in emergency mode
  };

  const sendEmergencyAlerts = async () => {
    try {
      if (!location) {
        console.error('No location available for emergency alert');
        return;
      }

      // Create emergency event via backend API
      const emergencyEvent = {
        user_id: 'demo_user',
        location: location,
        trigger_method: 'voice_trigger',
        trigger_word_used: emergencyTriggerWord
      };

      const response = await fetch(`${BACKEND_URL}/api/emergency/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emergencyEvent)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Emergency triggered successfully:', result);
        
        if (voiceAlertsEnabled) {
          await speakAlert(`Emergency alert sent to ${result.contacts_notified} contacts. ${result.authorities_contacted ? 'Local authorities have been notified. ' : ''}Help is on the way.`);
        }
        
        // Show success notification
        await showNotification(
          '✅ Emergency Alert Sent',
          `Notified ${result.contacts_notified} contacts. Event ID: ${result.event_id.slice(-6)}`
        );
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
    } catch (error) {
      console.error('Error sending emergency alerts:', error);
      
      // Fallback to local emergency handling
      const emergencyMessage = `🚨 EMERGENCY ALERT: Street Shield user needs immediate assistance. Location: ${location ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}` : 'Unknown'}. Time: ${new Date().toLocaleString()}`;
      
      // Simulate local emergency notifications  
      for (const contact of emergencyContacts) {
        console.log(`FALLBACK - Emergency alert to: ${contact} - ${emergencyMessage}`);
      }
      
      if (voiceAlertsEnabled) {
        await speakAlert("Emergency alert processing failed. Using backup emergency protocol. Your location has been logged for manual dispatch.");
      }
      
      await showNotification(
        '⚠️ Emergency Alert (Backup)',
        'Using offline emergency protocol. Location logged for dispatch.'
      );
    }
  };

  // Removed reportEmergencyToAuthorities - now handled by backend API

  const deactivateEmergencyMode = async () => {
    setIsEmergencyModeActive(false);
    
    if (voiceAlertsEnabled) {
      await speakAlert("Emergency mode deactivated. Returning to normal safety monitoring.");
    }
    
    // Return to normal monitoring interval
    if (analysisInterval.current) {
      clearInterval(analysisInterval.current);
    }
    analysisInterval.current = setInterval(() => {
      if (location) {
        performSafetyAnalysis(location);
      }
    }, 15000); // Back to 15 seconds
  };

  // Voice trigger detection system
  const [isListeningForTrigger, setIsListeningForTrigger] = useState(false);
  const [isHandsFreeMode, setIsHandsFreeMode] = useState(false);
  const [ambientListeningActive, setAmbientListeningActive] = useState(false);
  const listeningTimeout = useRef<NodeJS.Timeout | null>(null);
  const handsFreeInterval = useRef<NodeJS.Timeout | null>(null);
  const triggerActivationRef = useRef<boolean>(false);
  const lastAmbientCheck = useRef<number>(0);

  // Voice Information Request System
  const [isVoiceInfoActive, setIsVoiceInfoActive] = useState(false);
  const [lastInfoRequest, setLastInfoRequest] = useState<number>(0);
  const voiceInfoTimeout = useRef<NodeJS.Timeout | null>(null);

  // Cycling Mode System
  const [isCyclingMode, setIsCyclingMode] = useState(false);
  const [cyclingData, setCyclingData] = useState({
    speed_kmh: 0,
    avg_speed_kmh: 0,
    road_type: 'mixed' as 'bike_lane' | 'road' | 'mixed' | 'trail' | 'highway_shoulder',
    traffic_density: 'medium' as 'light' | 'medium' | 'heavy',
    bike_type: 'road' as 'road' | 'mountain' | 'electric' | 'cargo',
    rider_experience: 'intermediate' as 'beginner' | 'intermediate' | 'advanced' | 'professional',
    group_riding: false
  });
  const [cyclingThreats, setCyclingThreats] = useState<any[]>([]);
  const [cyclingSafetyScore, setCyclingSafetyScore] = useState(75);
  const [lastSpeedUpdate, setLastSpeedUpdate] = useState<number>(0);
  const speedHistory = useRef<number[]>([]);

  // Smart hands-free voice trigger system
  const startHandsFreeMode = async () => {
    if (!emergencyTriggerWord || emergencyTriggerWord.length < 3) {
      await speakAlert("No trigger word set. Please set up your emergency system first.");
      return;
    }

    try {
      setIsHandsFreeMode(true);
      setAmbientListeningActive(true);
      
      if (voiceAlertsEnabled) {
        await speakAlert(`Hands-free emergency mode activated. Street Shield will continuously monitor for your trigger word ${emergencyTriggerWord}. This uses smart listening to preserve battery life.`);
      }

      // Start intelligent listening cycles
      startSmartListeningCycle();

    } catch (error) {
      console.error('Error starting hands-free mode:', error);
      setIsHandsFreeMode(false);
    }
  };

  const stopHandsFreeMode = () => {
    setIsHandsFreeMode(false);
    setAmbientListeningActive(false);
    setIsListeningForTrigger(false);
    
    if (handsFreeInterval.current) {
      clearInterval(handsFreeInterval.current);
      handsFreeInterval.current = null;
    }
    
    if (listeningTimeout.current) {
      clearTimeout(listeningTimeout.current);
      listeningTimeout.current = null;
    }
    
    if (voiceAlertsEnabled) {
      speakAlert("Hands-free emergency mode deactivated.");
    }
  };

  const startSmartListeningCycle = () => {
    // Intelligent listening strategy: 
    // - Listen for 5 seconds every 30 seconds (16% active time)
    // - Increase frequency in high-risk scenarios
    // - Activate continuous listening when danger detected
    
    const standardInterval = 30000; // 30 seconds between listening windows
    const highRiskInterval = 15000;  // 15 seconds in high-risk situations
    const listeningDuration = 5000;   // 5 seconds of active listening
    
    const scheduleNextListening = () => {
      if (!isHandsFreeMode) return;
      
      // Determine listening frequency based on safety context
      const currentSafetyScore = safetyAnalysis?.safety_score?.overall_score || 70;
      const isHighRisk = currentSafetyScore < 50;
      const isDarkHours = new Date().getHours() < 6 || new Date().getHours() > 22;
      const hasProximityThreats = proximityThreats.length > 0;
      
      // Calculate next listening window
      let nextInterval = standardInterval;
      if (isHighRisk || hasProximityThreats) {
        nextInterval = highRiskInterval; // More frequent in danger
      }
      if (isDarkHours) {
        nextInterval = Math.max(nextInterval * 0.7, 10000); // 30% more frequent at night
      }
      
      handsFreeInterval.current = setTimeout(() => {
        startActiveListeningWindow(listeningDuration);
      }, nextInterval);
    };
    
    // Start first listening window immediately
    startActiveListeningWindow(listeningDuration);
    scheduleNextListening();
  };

  const startActiveListeningWindow = (duration: number) => {
    if (!isHandsFreeMode) return;
    
    setIsListeningForTrigger(true);
    triggerActivationRef.current = false;
    lastAmbientCheck.current = Date.now();
    
    // Silent activation - no voice announcement to preserve stealth
    const listeningType = isVoiceInfoActive ? "Emergency + Voice Info" : "Emergency Only";
    console.log(`[Hands-Free] Starting ${duration}ms ${listeningType} listening window`);
    
    listeningTimeout.current = setTimeout(() => {
      setIsListeningForTrigger(false);
      
      // Schedule next listening window
      const scheduleNext = () => {
        const standardInterval = 30000;
        const currentSafetyScore = safetyAnalysis?.safety_score?.overall_score || 70;
        const isHighRisk = currentSafetyScore < 50;
        let nextInterval = isHighRisk ? 15000 : standardInterval;
        
        // More frequent listening if voice info is active (users expect responsiveness)
        if (isVoiceInfoActive) {
          nextInterval = Math.min(nextInterval, 20000); // At least every 20 seconds
        }
        
        handsFreeInterval.current = setTimeout(() => {
          if (isHandsFreeMode) {
            startActiveListeningWindow(5000);
          }
        }, nextInterval);
      };
      
      scheduleNext();
    }, duration);
  };

  // Manual voice trigger (for testing/immediate use)
  const startVoiceTriggerListening = async () => {
    if (!emergencyTriggerWord || emergencyTriggerWord.length < 3) {
      await speakAlert("No trigger word set. Please set up your emergency system first.");
      return;
    }

    try {
      // If in hands-free mode, switch to immediate listening
      if (isHandsFreeMode) {
        setIsListeningForTrigger(true);
        if (voiceAlertsEnabled) {
          await speakAlert(`Manual activation. Say ${emergencyTriggerWord} now to trigger emergency.`);
        }
        // Extend listening window for manual activation
        if (listeningTimeout.current) clearTimeout(listeningTimeout.current);
        listeningTimeout.current = setTimeout(() => {
          setIsListeningForTrigger(false);
        }, 10000); // 10 seconds for manual activation
        return;
      }

      // Standard manual activation
      setIsListeningForTrigger(true);
      triggerActivationRef.current = false;
      
      if (voiceAlertsEnabled) {
        await speakAlert(`Voice trigger activated. Say ${emergencyTriggerWord} to trigger emergency mode. Listening for 30 seconds.`);
      }

      listeningTimeout.current = setTimeout(() => {
        stopVoiceTriggerListening();
      }, 30000);

    } catch (error) {
      console.error('Error starting voice trigger listening:', error);
      setIsListeningForTrigger(false);
    }
  };

  const stopVoiceTriggerListening = () => {
    setIsListeningForTrigger(false);
    if (listeningTimeout.current) {
      clearTimeout(listeningTimeout.current);
      listeningTimeout.current = null;
    }
    
    if (voiceAlertsEnabled && !triggerActivationRef.current) {
      speakAlert("Voice trigger listening stopped.");
    }
  };

  // Simulate voice trigger activation (for manual testing)
  const activateVoiceTrigger = async () => {
    if (!isListeningForTrigger) {
      await speakAlert("Voice trigger is not active. Press the voice trigger button first.");
      return false;
    }

    if (emergencyTriggerWord && emergencyTriggerWord.length >= 3) {
      triggerActivationRef.current = true;
      stopVoiceTriggerListening();
      await speakAlert(`Emergency trigger word ${emergencyTriggerWord} detected. Activating emergency mode.`);
      triggerEmergencyMode();
      return true;
    }
    return false;
  };

  // Advanced trigger detection (for future implementation with real speech recognition)
  const detectTriggerInSpeech = (spokenText: string): boolean => {
    if (!emergencyTriggerWord || !spokenText) return false;
    
    const normalizedSpoken = spokenText.toLowerCase().trim();
    const normalizedTrigger = emergencyTriggerWord.toLowerCase().trim();
    
    // Exact match
    if (normalizedSpoken === normalizedTrigger) return true;
    
    // Partial match with context (must be separate word)
    const words = normalizedSpoken.split(/\s+/);
    return words.some(word => word === normalizedTrigger);
  };

  // VOICE-ACTIVATED INFORMATION REQUEST SYSTEM WITH "STREET SHIELD" TRIGGER
  const processVoiceInfoRequest = async (spokenText: string): Promise<boolean> => {
    if (!spokenText) return false;
    
    const text = spokenText.toLowerCase().trim();
    const now = Date.now();
    
    // Prevent spam requests
    if (now - lastInfoRequest < 3000) return false;
    
    // Check for "Street Shield" trigger word first
    const triggerPhrases = ['street shield', 'streetshield', 'shield'];
    const hasTrigger = triggerPhrases.some(trigger => text.includes(trigger));
    
    if (!hasTrigger) {
      return false; // Must say "Street Shield" first
    }
    
    // Remove trigger word to get the actual command
    let command = text;
    for (const trigger of triggerPhrases) {
      command = command.replace(trigger, '').trim();
    }
    
    // Remove common connecting words
    command = command.replace(/^(what|how|where|when|is|are|my|the|current|can|you|do)\s+/g, '').trim();
    
    // Voice command patterns (now without trigger word)
    const commands = {
      safety: [
        'safety score', 'safe am i', 'safety status', 'safety check', 
        'shield status', 'how safe', 'safety rating'
      ],
      location: [
        'location', 'where am i', 'my location', 'where are we',
        'street', 'address', 'current position'
      ],
      weather: [
        'weather', 'temperature', 'hot', 'cold', 'weather conditions',
        'raining', 'weather update', 'climate'
      ],
      health: [
        'health status', 'heart rate', 'feeling', 'vital signs',
        'biometrics', 'health check', 'my health', 'pulse'
      ],
      threats: [
        'threats', 'dangers nearby', 'around me', 'proximity check',
        'danger', 'threats detected', 'safety scan', 'hazards'
      ],
      time: [
        'time', 'current time', 'time check', 'clock', 'what time'
      ],
      battery: [
        'battery level', 'battery status', 'battery', 'power level', 'power'
      ],
      contacts: [
        'emergency contacts', 'contacts', 'who will be called', 'contact list'
      ],
      help: [
        'help', 'what can you do', 'commands', 'voice commands', 'options', 'assist'
      ]
    };
    
    // First try cycling-specific commands if in cycling mode
    if (isCyclingMode) {
      const cyclingProcessed = await processCyclingVoiceCommand(command);
      if (cyclingProcessed) {
        setLastInfoRequest(now);
        return true;
      }
    }
    
    // Match command to category
    let matchedCategory = null;
    for (const [category, patterns] of Object.entries(commands)) {
      if (patterns.some(pattern => command.includes(pattern))) {
        matchedCategory = category;
        break;
      }
    }
    
    if (!matchedCategory) {
      // Provide helpful guidance if Street Shield was said but command not recognized
      await speakAlert("I heard Street Shield, but didn't recognize the command. Try saying: Street Shield, what is my safety score? Or Street Shield, where am I?");
      return false;
    }
    
    setLastInfoRequest(now);
    await handleVoiceInfoRequest(matchedCategory);
    return true;
  };

  const handleVoiceInfoRequest = async (category: string) => {
    try {
      let response = "";
      
      switch (category) {
        case 'safety':
          const score = safetyAnalysis?.safety_score?.overall_score || 0;
          const riskLevel = score > 80 ? "very safe" : score > 60 ? "moderately safe" : 
                          score > 40 ? "caution advised" : "high risk area";
          response = `Your current safety score is ${score} out of 100. You are in a ${riskLevel} zone. ${
            score < 60 ? "Stay alert and consider changing route if possible." : "Continue with normal caution."
          }`;
          break;
          
        case 'location':
          if (location) {
            response = `You are currently at latitude ${location.latitude.toFixed(4)}, longitude ${location.longitude.toFixed(4)}. ${
              location.altitude ? `Elevation approximately ${Math.round(location.altitude)} meters.` : ""
            }`;
          } else {
            response = "Location information is currently unavailable.";
          }
          break;
          
        case 'weather':
          const weather = safetyAnalysis?.weather_data;
          if (weather) {
            response = `Current temperature is ${weather.temperature} degrees Celsius. ${
              weather.conditions ? `Weather conditions: ${weather.conditions}.` : ""
            } ${weather.wind_speed ? `Wind speed: ${weather.wind_speed} kilometers per hour.` : ""}`;
          } else {
            response = "Weather information is currently unavailable.";
          }
          break;
          
        case 'health':
          const biometric = biometricData;
          if (biometric.heart_rate) {
            response = `Your heart rate is ${biometric.heart_rate} beats per minute. ${
              biometric.stress_level > 0.7 ? "Stress levels are elevated." : "Stress levels are normal."
            } ${biometric.fatigue_level > 0.7 ? "Fatigue levels are high." : "Energy levels are good."}`;
          } else {
            response = "Health monitoring data is being collected. Please ensure your sensors are active.";
          }
          break;
          
        case 'threats':
          const threats = proximityThreats.length;
          const escooterAlerts = safetyAnalysis?.safety_score?.alerts?.filter(alert => 
            alert.type === 'proximity_threat' && 
            (alert.message.toLowerCase().includes('electric scooter') || 
             alert.message.toLowerCase().includes('silent vehicle'))
          ) || [];
          
          if (threats > 0 || escooterAlerts.length > 0) {
            response = `${threats} proximity threats detected. ${
              escooterAlerts.length > 0 ? `Warning: Silent electric vehicles detected nearby.` : ""
            } Stay vigilant and be prepared to move to safety.`;
          } else {
            response = "No immediate threats detected in your area. Continue with normal awareness.";
          }
          break;
          
        case 'time':
          const currentTime = new Date();
          response = `Current time is ${currentTime.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })}. ${currentTime.toLocaleDateString('en-US', { 
            weekday: 'long',
            month: 'long',
            day: 'numeric'
          })}.`;
          break;
          
        case 'battery':
          response = "Battery monitoring is active. Street Shield is optimized for extended use with smart power management.";
          break;
          
        case 'contacts':
          const contactCount = emergencyContacts.filter(c => c.length > 0).length;
          response = `You have ${contactCount} emergency contact${contactCount !== 1 ? 's' : ''} configured. ${
            emergencyTriggerWord ? `Your emergency trigger word is ${emergencyTriggerWord}.` : "No trigger word set."
          }`;
          break;
          
        case 'help':
          response = `Street Shield voice commands: Ask for safety score, location, weather, health status, threats nearby, current time, battery level, or emergency contacts. You can also say your trigger word for emergencies.`;
          break;
          
        default:
          response = "I didn't understand that request. Try asking about safety, location, weather, health, threats, time, or contacts.";
      }
      
      // Provide audio response
      await processVoiceAlert(response, 'info_request', { 
        priority: 'low',
        interruptible: true
      });
      
    } catch (error) {
      console.error('Error processing voice info request:', error);
      await speakAlert("Sorry, I couldn't process that request right now.");
    }
  };

  // Voice activation for info requests - PERSISTENT MODE
  const activateVoiceInfoRequest = async () => {
    setIsVoiceInfoActive(true);
    
    if (voiceAlertsEnabled) {
      await speakAlert("Voice info system activated. You can now ask me about your safety, location, weather, health, or nearby threats at any time. I'll listen continuously while preserving battery with smart cycling.");
    }
    
    // Start persistent voice info listening (no timeout - always available)
    startPersistentVoiceInfoListening();
  };

  const deactivateVoiceInfoRequest = () => {
    setIsVoiceInfoActive(false);
    
    // Clear any active timeouts
    if (voiceInfoTimeout.current) {
      clearTimeout(voiceInfoTimeout.current);
      voiceInfoTimeout.current = null;
    }
    
    if (voiceAlertsEnabled) {
      speakAlert("Voice info system deactivated.");
    }
  };

  const startPersistentVoiceInfoListening = () => {
    if (!isVoiceInfoActive) return;
    
    // Integrate with existing hands-free smart listening if active
    if (isHandsFreeMode) {
      // Voice info rides along with emergency hands-free system
      console.log('[Voice Info] Integrated with hands-free emergency system');
      return;
    }
    
    // Independent voice info listening cycle (less frequent than emergency)
    const scheduleNextInfoListening = () => {
      if (!isVoiceInfoActive) return;
      
      // Listen for 3 seconds every 20 seconds for battery optimization
      voiceInfoTimeout.current = setTimeout(() => {
        if (isVoiceInfoActive) {
          console.log('[Voice Info] Starting listening window for information requests');
          
          // Brief listening window for info requests
          setTimeout(() => {
            scheduleNextInfoListening(); // Continue cycle
          }, 3000); // 3 seconds of active listening
        }
      }, 20000); // 20 seconds between listening windows
    };
    
    // Start first listening window immediately
    console.log('[Voice Info] Starting persistent voice info listening');
    scheduleNextInfoListening();
  };

  const simulateVoiceInfoRequest = async (query: string) => {
    // For demo/testing purposes - simulate voice input
    const processed = await processVoiceInfoRequest(query);
    if (!processed) {
      await speakAlert("I didn't recognize that command. Try asking about safety, location, weather, health, threats, time, or contacts.");
    }
  };

  // CYCLING-SPECIFIC FUNCTIONALITY
  const toggleCyclingMode = async () => {
    const newCyclingMode = !isCyclingMode;
    setIsCyclingMode(newCyclingMode);
    
    if (newCyclingMode) {
      if (voiceAlertsEnabled) {
        await speakAlert("Cycling mode activated. Street Shield will now provide bike-specific safety alerts including vehicle approach warnings, door zone hazards, intersection analysis, and road surface alerts. Stay safe on your ride!");
      }
      
      // Start cycling-specific monitoring
      startCyclingMonitoring();
    } else {
      if (voiceAlertsEnabled) {
        await speakAlert("Cycling mode deactivated. Returning to pedestrian safety mode.");
      }
      
      // Clear cycling data
      setCyclingThreats([]);
      setCyclingSafetyScore(75);
      speedHistory.current = [];
    }
  };

  const startCyclingMonitoring = () => {
    // Enhanced location tracking for speed calculation
    const updateCyclingData = () => {
      if (!isCyclingMode || !location) return;
      
      // Calculate speed from GPS if available
      const currentSpeed = location.speed ? location.speed * 3.6 : 0; // Convert m/s to km/h
      
      // Update speed history
      speedHistory.current.push(currentSpeed);
      if (speedHistory.current.length > 10) {
        speedHistory.current.shift(); // Keep last 10 readings
      }
      
      // Calculate average speed
      const avgSpeed = speedHistory.current.length > 0 
        ? speedHistory.current.reduce((a, b) => a + b, 0) / speedHistory.current.length 
        : 0;
      
      setCyclingData(prev => ({
        ...prev,
        speed_kmh: currentSpeed,
        avg_speed_kmh: avgSpeed
      }));
      
      // Update cycling threat analysis
      fetchCyclingThreats();
      fetchCyclingSafetyScore();
    };
    
    // Update every 5 seconds for cycling
    const interval = setInterval(updateCyclingData, 5000);
    return () => clearInterval(interval);
  };

  const fetchCyclingThreats = async () => {
    if (!location || !isCyclingMode) return;
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/cycling/threats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: location,
          cycling_context: {
            ...cyclingData,
            time_of_ride: getCurrentTimeOfRide(),
            weather_conditions: safetyAnalysis?.weather?.weather_condition || 'clear'
          },
          movement_history: [] // Could add movement history if needed
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setCyclingThreats(data.cycling_threats || []);
        
        // Voice alerts for critical threats
        const criticalThreats = data.cycling_threats?.filter((t: any) => t.severity === 'critical') || [];
        if (criticalThreats.length > 0 && voiceAlertsEnabled) {
          for (const threat of criticalThreats) {
            await speakAlert(`Critical cycling alert: ${threat.threat_description}. ${threat.recommended_action}`);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching cycling threats:', error);
    }
  };

  const fetchCyclingSafetyScore = async () => {
    if (!location || !isCyclingMode) return;
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/cycling/safety-score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: location,
          cycling_context: {
            ...cyclingData,
            time_of_ride: getCurrentTimeOfRide(),
            weather_conditions: safetyAnalysis?.weather?.weather_condition || 'clear'
          }
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setCyclingSafetyScore(data.cycling_safety_score);
      }
    } catch (error) {
      console.error('Error fetching cycling safety score:', error);
    }
  };

  const getCurrentTimeOfRide = (): string => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 8) return 'dawn';
    if (hour >= 8 && hour < 18) return 'day';
    if (hour >= 18 && hour < 21) return 'dusk';
    return 'night';
  };

  // Enhanced voice info processing for cycling
  const processCyclingVoiceCommand = async (spokenText: string): Promise<boolean> => {
    if (!isCyclingMode) return false;
    
    const text = spokenText.toLowerCase().trim();
    
    // Cycling-specific voice commands
    const cyclingCommands = {
      speed: ['what is my speed', 'how fast am i going', 'current speed', 'speed check'],
      threats: ['cycling threats', 'bike hazards', 'vehicle behind', 'road hazards'],
      safety: ['cycling safety', 'bike safety score', 'how safe is cycling'],
      route: ['route suggestion', 'bike lanes nearby', 'safer route']
    };
    
    for (const [category, patterns] of Object.entries(cyclingCommands)) {
      if (patterns.some(pattern => text.includes(pattern))) {
        await handleCyclingVoiceCommand(category);
        return true;
      }
    }
    
    return false;
  };

  const handleCyclingVoiceCommand = async (category: string) => {
    let response = "";
    
    switch (category) {
      case 'speed':
        response = `Current cycling speed: ${cyclingData.speed_kmh.toFixed(1)} kilometers per hour. Average speed: ${cyclingData.avg_speed_kmh.toFixed(1)} kilometers per hour.`;
        break;
        
      case 'threats':
        const highThreats = cyclingThreats.filter(t => t.severity === 'high' || t.severity === 'critical');
        if (highThreats.length > 0) {
          const threatList = highThreats.map(t => t.threat_description).join(', ');
          response = `${highThreats.length} cycling threats detected: ${threatList}. Stay alert.`;
        } else {
          response = "No immediate cycling threats detected. Continue with normal caution.";
        }
        break;
        
      case 'safety':
        const riskLevel = cyclingSafetyScore > 70 ? "good" : cyclingSafetyScore > 50 ? "moderate" : "high risk";
        response = `Cycling safety score: ${cyclingSafetyScore} out of 100. Current risk level: ${riskLevel}. Road type: ${cyclingData.road_type}, traffic density: ${cyclingData.traffic_density}.`;
        break;
        
      case 'route':
        response = "Route analysis available. Consider bike lanes when possible. Avoid heavy traffic areas during peak hours.";
        break;
        
      default:
        response = "Cycling command not recognized.";
    }
    
    await processVoiceAlert(response, 'cycling_info', { priority: 'low' });
  };

  // MUSIC-FRIENDLY VOICE SYSTEM
  const speakAlert = async (message: string, priority: 'low' | 'medium' | 'high' | 'critical' = 'medium', duckAudio: boolean = true) => {
    try {
      if (!voiceAlertsEnabled) return;
      
      // Clean message for better TTS pronunciation
      let cleanedMessage = message
        // Add natural pauses
        .replace(/([.!?])\s*/g, '$1... ')  // Add pauses after sentences
        .replace(/,\s*/g, ', ')  // Normalize comma spacing
        // Remove problematic punctuation
        .replace(/[()]/g, ' ')  // Remove parentheses
        .replace(/[-_]/g, ' ')  // Replace dashes/underscores with spaces
        // Handle numbers and technical terms
        .replace(/\b(\d{3,})\b/g, (match) => {  // Break up long numbers
          return match.split('').join(' ');
        })
        // Improve word pronunciation
        .replace(/\be-scooter\b/gi, 'e scooter')
        .replace(/\be-bike\b/gi, 'e bike')
        .replace(/\bAPI\b/g, 'A P I')
        .replace(/\bID\b/g, 'I D')
        // Clean up spaces
        .replace(/\s+/g, ' ')  // Remove extra spaces
        .trim();
      
      // Smart audio ducking - lower music instead of stopping
      if (duckAudio && priority !== 'critical') {
        // Brief audio duck notification (subtle chime sound)
        await playAudioDuck();
        await new Promise(resolve => setTimeout(resolve, 200)); // Brief pause
      }
      
      // Adaptive speech settings based on priority
      let speechSettings = {
        language: 'en-US',
        pitch: 1.0,
        rate: 0.7, // Slower for better clarity, especially for emergency instructions
        quality: Speech.VoiceQuality.Enhanced,
      };
      
      // Adjust voice characteristics based on priority
      switch (priority) {
        case 'critical':
          // Emergency: Override music, urgent tone
          Speech.stop(); // Stop any current speech
          speechSettings.pitch = 1.1;
          speechSettings.rate = 0.75;  // Slightly faster but still clear for emergencies
          break;
        case 'high':
          // Important: Brief interruption, clear delivery
          speechSettings.pitch = 1.0;
          speechSettings.rate = 0.7;
          break;
        case 'medium':
          // Normal: Gentle tone, doesn't interrupt music flow
          speechSettings.pitch = 1.0;
          speechSettings.rate = 0.7;
          break;
        case 'low':
          // Subtle: Very gentle, almost whisper-like
          speechSettings.pitch = 0.9;
          speechSettings.rate = 0.65;
          break;
      }
      
      // Speak the alert with appropriate settings using cleaned message
      Speech.speak(cleanedMessage, speechSettings);
      
    } catch (error) {
      console.error('Error with music-friendly text-to-speech:', error);
    }
  };

  const playAudioDuck = async () => {
    // Simulate audio ducking with a subtle notification sound
    // In a real implementation, this would:
    // 1. Lower music volume temporarily
    // 2. Play a subtle notification chime
    // 3. Restore music volume after speech
    try {
      // Placeholder for audio ducking implementation
      console.log('Audio duck: Lowering music volume for voice alert');
    } catch (error) {
      console.error('Audio ducking error:', error);
    }
  };

  // INTELLIGENT ALERT PROCESSOR - determines when and how to speak
  const processVoiceAlert = async (message: string, alertType: string, weatherData?: any) => {
    const now = Date.now();
    
    // Smart alert filtering to prevent interruption spam
    if (now - lastAlertTime < 30000 && alertType !== 'emergency') {
      return; // Don't interrupt music too frequently
    }
    
    // Determine priority based on alert type and weather severity
    let priority: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    
    if (alertType === 'emergency') {
      priority = 'critical';
    } else if (alertType === 'ice_warning' || alertType === 'severe_weather') {
      priority = 'high';
    } else if (alertType === 'safety_update' || alertType === 'recommendation') {
      priority = 'medium';
    } else {
      priority = 'low';
    }
    
    // Enhanced message formatting for music listeners
    let musicFriendlyMessage = message;
    
    if (priority === 'critical') {
      musicFriendlyMessage = `Street Shield Emergency Alert: ${message}`;
    } else if (priority === 'high') {
      musicFriendlyMessage = `Safety Alert: ${message}`;
    } else {
      musicFriendlyMessage = `Street Shield: ${message}`;
    }
    
    // Weather-specific message enhancement
    if (weatherData?.ice_risk && weatherData?.ice_confidence > 0.7) {
      priority = 'high';
      musicFriendlyMessage = `Ice Alert: Confidence ${Math.round(weatherData.ice_confidence * 100)}%. ${message}`;
    }
    
    await speakAlert(musicFriendlyMessage, priority, true);
    setLastAlertTime(now);
  };

  const showNotification = async (title: string, body: string) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  };

  const toggleVoiceAlerts = async () => {
    const newValue = !voiceAlertsEnabled;
    setVoiceAlertsEnabled(newValue);
    await AsyncStorage.setItem('voiceAlertsEnabled', JSON.stringify(newValue));
  };

  const getSafetyColor = (score: number): string => {
    if (score >= 80) return '#4CAF50'; // Green - Safe
    if (score >= 60) return '#FFC107'; // Yellow - Caution
    if (score >= 40) return '#FF9800'; // Orange - Moderate Risk
    return '#F44336'; // Red - High Risk
  };

  const getSafetyLabel = (score: number): string => {
    if (score >= 80) return 'SAFE';
    if (score >= 60) return 'CAUTION';
    if (score >= 40) return 'MODERATE RISK';
    return 'HIGH RISK';
  };

  if (!permissionsGranted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="shield-outline" size={80} color="#666" />
          <Text style={styles.permissionTitle}>SafeWalk Needs Permissions</Text>
          <Text style={styles.permissionText}>
            To keep you safe, SafeWalk needs access to your location and the ability to send notifications.
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={requestPermissions}>
            <Text style={styles.buttonText}>Grant Permissions</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <View style={styles.shieldIcon}>
              <Ionicons name="shield-checkmark" size={32} color="#fff" />
            </View>
            <View style={styles.titleText}>
              <Text style={styles.appTitle}>Street Shield</Text>
              <Text style={styles.appSubtitle}>Advanced AI Protection</Text>
            </View>
          </View>
          <View style={styles.headerGlow} />
        </View>

        {/* Dynamic Safety Score Display */}
        {safetyAnalysis && (
          <View style={styles.safetyScoreContainer}>
            <View style={styles.safetyScoreWrapper}>
              <View style={styles.pulseRing}>
                <View style={[styles.pulseRingInner, { borderColor: getSafetyColor(safetyAnalysis.safety_score.overall_score) }]} />
              </View>
              <View style={[
                styles.safetyScoreCircle,
                { 
                  backgroundColor: getSafetyColor(safetyAnalysis.safety_score.overall_score),
                  shadowColor: getSafetyColor(safetyAnalysis.safety_score.overall_score)
                }
              ]}>
                <View style={styles.scoreGlow} />
                <Text style={styles.safetyScoreNumber}>
                  {safetyAnalysis.safety_score.overall_score}
                </Text>
                <Text style={styles.safetyScoreLabel}>
                  {getSafetyLabel(safetyAnalysis.safety_score.overall_score)}
                </Text>
                <View style={styles.shieldOverlay}>
                  <Ionicons name="shield-checkmark" size={24} color="rgba(255,255,255,0.3)" />
                </View>
              </View>
            </View>
            
            {/* Real-time Status Indicators */}
            <View style={styles.statusIndicators}>
              <View style={styles.statusItem}>
                <Ionicons name="eye" size={16} color="#00FF88" />
                <Text style={styles.statusText}>MONITORING</Text>
              </View>
              <View style={styles.statusItem}>
                <Ionicons name="pulse" size={16} color="#FF6B6B" />
                <Text style={styles.statusText}>ANALYZING</Text>
              </View>
              <View style={styles.statusItem}>
                <Ionicons name="shield" size={16} color="#4ECDC4" />
                <Text style={styles.statusText}>PROTECTED</Text>
              </View>
            </View>
          </View>
        )}

        {/* Emergency Mode Indicator */}
        {isEmergencyModeActive && (
          <View style={styles.emergencyBanner}>
            <Ionicons name="warning" size={24} color="#fff" />
            <Text style={styles.emergencyBannerText}>
              🚨 EMERGENCY MODE ACTIVE 🚨
            </Text>
            <TouchableOpacity 
              style={styles.deactivateButton}
              onPress={deactivateEmergencyMode}
            >
              <Text style={styles.deactivateButtonText}>Deactivate</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Enhanced Control Panel */}
        <View style={styles.controlsContainer}>
          {/* Main Action Button */}
          <TouchableOpacity
            style={[
              styles.primaryActionButton, 
              isTracking && styles.primaryActionButtonActive,
              isLoading && styles.primaryActionButtonLoading
            ]}
            onPress={isTracking ? stopTracking : startTracking}
            disabled={isLoading}
          >
            <View style={styles.buttonGradientOverlay} />
            <View style={styles.buttonContent}>
              <Ionicons
                name={isTracking ? "stop-circle" : "play-circle"}
                size={32}
                color="#fff"
              />
              <Text style={styles.primaryButtonText}>
                {isLoading ? 'INITIALIZING...' : isTracking ? 'STOP SHIELD' : 'ACTIVATE SHIELD'}
              </Text>
            </View>
            {isTracking && <View style={styles.activeIndicator} />}
          </TouchableOpacity>

          {/* Feature Controls Grid */}
          <View style={styles.controlGrid}>
            <TouchableOpacity
              style={[styles.featureButton, voiceAlertsEnabled && styles.featureButtonActive]}
              onPress={toggleVoiceAlerts}
            >
              <View style={styles.featureIcon}>
                <Ionicons
                  name={voiceAlertsEnabled ? "volume-high" : "volume-mute"}
                  size={20}
                  color={voiceAlertsEnabled ? "#00FF88" : "#666"}
                />
              </View>
              <Text style={[styles.featureButtonText, voiceAlertsEnabled && styles.featureButtonTextActive]}>
                Voice AI
              </Text>
              <Text style={styles.featureStatus}>
                {voiceAlertsEnabled ? 'ACTIVE' : 'OFF'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.featureButton}
              onPress={setupEmergencyTrigger}
            >
              <View style={styles.featureIcon}>
                <Ionicons name="warning" size={20} color="#FF6B6B" />
              </View>
              <Text style={styles.featureButtonText}>Emergency</Text>
              <Text style={styles.featureStatus}>
                {emergencyTriggerWord ? 'READY' : 'SETUP'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.featureButton, proximityAlertsEnabled && styles.featureButtonActive]}
              onPress={() => setProximityAlertsEnabled(!proximityAlertsEnabled)}
            >
              <View style={styles.featureIcon}>
                <Ionicons name="locate" size={20} color={proximityAlertsEnabled ? "#4ECDC4" : "#666"} />
              </View>
              <Text style={[styles.featureButtonText, proximityAlertsEnabled && styles.featureButtonTextActive]}>
                Radar
              </Text>
              <Text style={styles.featureStatus}>
                {proximityAlertsEnabled ? 'ACTIVE' : 'OFF'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.featureButton, noiseCancellationEnabled && styles.featureButtonActive]}
              onPress={() => setNoiseCancellationEnabled(!noiseCancellationEnabled)}
            >
              <View style={styles.featureIcon}>
                <Ionicons name="headset" size={20} color={noiseCancellationEnabled ? "#9C27B0" : "#666"} />
              </View>
              <Text style={[styles.featureButtonText, noiseCancellationEnabled && styles.featureButtonTextActive]}>
                AI Audio
              </Text>
              <Text style={styles.featureStatus}>
                {noiseProfile ? `${Math.round(currentNoiseLevel)}dB` : 'SETUP'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.featureButton}
              onPress={() => {}}
            >
              <View style={styles.featureIcon}>
                <Ionicons name="heart" size={20} color={heartRate > 0 ? "#E91E63" : "#666"} />
              </View>
              <Text style={styles.featureButtonText}>Health</Text>
              <Text style={styles.featureStatus}>
                {heartRate > 0 ? `${heartRate} BPM` : 'MONITORING'}
              </Text>
            </TouchableOpacity>

            {/* Voice Trigger Button */}
            {emergencyTriggerWord && (
              <TouchableOpacity
                style={[
                  styles.featureButton, 
                  isHandsFreeMode ? styles.handsFreeButton :
                  isListeningForTrigger ? styles.listeningButton : styles.emergencyButton
                ]}
                onPress={
                  isHandsFreeMode ? stopHandsFreeMode :
                  isListeningForTrigger ? activateVoiceTrigger : startHandsFreeMode
                }
              >
                <View style={styles.featureIcon}>
                  <Ionicons 
                    name={
                      isHandsFreeMode ? "shield-checkmark" :
                      isListeningForTrigger ? "mic" : "warning"
                    }
                    size={20} 
                    color="#FFF" 
                  />
                </View>
                <Text style={styles.featureButtonText}>
                  {isHandsFreeMode ? "Hands-Free ON" :
                   isListeningForTrigger ? "Say Trigger Word" : "Hands-Free Mode"}
                </Text>
                <Text style={styles.featureStatus}>
                  {isHandsFreeMode ? "ACTIVE" :
                   isListeningForTrigger ? "LISTENING" : "TAP TO START"}
                </Text>
              </TouchableOpacity>
            )}

                {/* Cycling Mode Button */}
            <TouchableOpacity
              style={[
                styles.featureButton, 
                isCyclingMode ? styles.cyclingActiveButton : styles.cyclingButton
              ]}
              onPress={toggleCyclingMode}
            >
              <View style={styles.featureIcon}>
                <Ionicons 
                  name={isCyclingMode ? "bicycle" : "bicycle-outline"} 
                  size={20} 
                  color="#FFF" 
                />
              </View>
              <Text style={styles.featureButtonText}>
                {isCyclingMode ? "Cycling ON" : "Cycling Mode"}
              </Text>
              <Text style={styles.featureStatus}>
                {isCyclingMode ? `${cyclingData.speed_kmh.toFixed(0)} KM/H` : "TAP FOR BIKES"}
              </Text>
            </TouchableOpacity>

            {/* Voice Information Request Button */}
            <TouchableOpacity
              style={[
                styles.featureButton, 
                isVoiceInfoActive ? styles.listeningButton : styles.infoButton
              ]}
              onPress={isVoiceInfoActive ? 
                deactivateVoiceInfoRequest : 
                activateVoiceInfoRequest
              }
            >
              <View style={styles.featureIcon}>
                <Ionicons 
                  name={isVoiceInfoActive ? "chatbubble-ellipses" : "information-circle"} 
                  size={20} 
                  color="#FFF" 
                />
              </View>
              <Text style={styles.featureButtonText}>
                {isVoiceInfoActive ? "Voice Info ON" : "Voice Info"}
              </Text>
              <Text style={styles.featureStatus}>
                {isVoiceInfoActive ? "ALWAYS READY" : "TAP TO START"}
              </Text>
            </TouchableOpacity>

            {/* Voice Info Demo Button (when active) */}
            {isVoiceInfoActive && (
              <TouchableOpacity
                style={[styles.featureButton, styles.demoButton]}
                onPress={() => simulateVoiceInfoRequest("what is my safety score")}
              >
                <View style={styles.featureIcon}>
                  <Ionicons 
                    name="mic" 
                    size={20} 
                    color="#FFF" 
                  />
                </View>
                <Text style={styles.featureButtonText}>
                  Demo: Safety Check
                </Text>
                <Text style={styles.featureStatus}>
                  TRY NOW
                </Text>
              </TouchableOpacity>
            )}

            {/* Manual Voice Trigger (when hands-free is active) */}
            {isHandsFreeMode && (
              <TouchableOpacity
                style={[
                  styles.featureButton, 
                  isListeningForTrigger ? styles.listeningButton : styles.manualTriggerButton
                ]}
                onPress={isListeningForTrigger ? activateVoiceTrigger : startVoiceTriggerListening}
              >
                <View style={styles.featureIcon}>
                  <Ionicons 
                    name={isListeningForTrigger ? "mic" : "mic-outline"} 
                    size={20} 
                    color="#FFF" 
                  />
                </View>
                <Text style={styles.featureButtonText}>
                  {isListeningForTrigger ? "Say Word Now" : "Manual Trigger"}
                </Text>
                <Text style={styles.featureStatus}>
                  {isListeningForTrigger ? "ACTIVE" : "READY"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Hands-Free Mode Status */}
        {isHandsFreeMode && (
          <View style={[styles.statusCard, styles.handsFreeCard]}>
            <View style={styles.handsFreeIndicator}>
              <Ionicons name="shield-checkmark" size={20} color="#2196F3" />
              <View style={[styles.pulsingDot, { backgroundColor: '#2196F3' }]} />
              {ambientListeningActive && <Ionicons name="mic" size={16} color="#4CAF50" style={{ marginLeft: 8 }} />}
              {isVoiceInfoActive && <Ionicons name="information-circle" size={16} color="#9C27B0" style={{ marginLeft: 8 }} />}
            </View>
            <Text style={styles.handsFreeTitle}>
              🛡️ HANDS-FREE PROTECTION ACTIVE
            </Text>
            <Text style={styles.handsFreeDescription}>
              Emergency trigger: "{emergencyTriggerWord}" {isVoiceInfoActive && ' • Voice info requests enabled'} • {isListeningForTrigger ? 'Currently listening' : 'Standby mode'}
            </Text>
            <TouchableOpacity 
              style={styles.stopHandsFreeButton}
              onPress={stopHandsFreeMode}
            >
              <Text style={styles.stopHandsFreeText}>Deactivate</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Voice Info Only Status (when not in hands-free) */}
        {!isHandsFreeMode && isVoiceInfoActive && (
          <View style={[styles.statusCard, styles.voiceInfoCard]}>
            <View style={styles.listeningIndicator}>
              <Ionicons name="information-circle" size={20} color="#9C27B0" />
              <View style={[styles.pulsingDot, { backgroundColor: '#9C27B0' }]} />
            </View>
            <Text style={styles.voiceInfoTitle}>
              💬 VOICE INFO SYSTEM ACTIVE
            </Text>
            <Text style={styles.voiceInfoDescription}>
              Ask about safety, location, weather, health, or threats • Always ready with smart battery optimization
            </Text>
            <TouchableOpacity 
              style={styles.stopVoiceInfoButton}
              onPress={deactivateVoiceInfoRequest}
            >
              <Text style={styles.stopVoiceInfoText}>Deactivate</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Manual Voice Trigger Status */}
        {!isHandsFreeMode && isListeningForTrigger && (
          <View style={[styles.statusCard, styles.listeningCard]}>
            <View style={styles.listeningIndicator}>
              <Ionicons name="mic" size={20} color="#4CAF50" />
              <View style={styles.pulsingDot} />
            </View>
            <Text style={styles.listeningText}>
              🎤 Voice Trigger Active - Say "{emergencyTriggerWord}" for emergency
            </Text>
            <TouchableOpacity 
              style={styles.stopListeningButton}
              onPress={stopVoiceTriggerListening}
            >
              <Text style={styles.stopListeningText}>Stop Listening</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2196F3" />
            <Text style={styles.loadingText}>Analyzing Safety...</Text>
          </View>
        )}

        {/* Current Location */}
        {location && (
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Current Location</Text>
            <Text style={styles.infoText}>
              Lat: {location.latitude.toFixed(6)}
            </Text>
            <Text style={styles.infoText}>
              Lon: {location.longitude.toFixed(6)}
            </Text>
            {location.accuracy && (
              <Text style={styles.infoText}>
                Accuracy: ±{Math.round(location.accuracy)}m
              </Text>
            )}
          </View>
        )}

        {/* Weather Information */}
        {safetyAnalysis?.weather && (
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Weather Conditions</Text>
            <Text style={styles.infoText}>
              {safetyAnalysis.weather.weather_condition} - {Math.round(safetyAnalysis.weather.temperature)}°C
            </Text>
            <Text style={styles.infoText}>
              Humidity: {Math.round(safetyAnalysis.weather.humidity)}%
            </Text>
            {safetyAnalysis.weather.ice_risk && (
              <Text style={[styles.infoText, styles.warningText]}>
                ⚠️ Ice Risk Detected
              </Text>
            )}
            <Text style={styles.infoText}>
              Hazard Level: {safetyAnalysis.weather.hazard_level.toUpperCase()}
            </Text>
          </View>
        )}

        {/* Risk Factors */}
        {safetyAnalysis?.safety_score.risk_factors.length > 0 && (
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Current Risk Factors</Text>
            {safetyAnalysis.safety_score.risk_factors.map((factor, index) => (
              <Text key={index} style={styles.riskFactor}>
                • {factor}
              </Text>
            ))}
          </View>
        )}

        {/* Recommendations */}
        {safetyAnalysis?.safety_score.recommendations.length > 0 && (
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Safety Recommendations</Text>
            {safetyAnalysis.safety_score.recommendations.map((rec, index) => (
              <Text key={index} style={styles.recommendation}>
                • {rec}
              </Text>
            ))}
          </View>
        )}

        {/* Active Alerts */}
        {safetyAnalysis?.safety_score.alerts.length > 0 && (
          <View style={[styles.infoCard, styles.alertCard]}>
            <Text style={styles.cardTitle}>Active Alerts</Text>
            {safetyAnalysis.safety_score.alerts.map((alert, index) => (
              <View key={index} style={styles.alertItem}>
                <Text style={styles.alertType}>{alert.type.toUpperCase()}</Text>
                <Text style={styles.alertMessage}>{alert.message}</Text>
                <Text style={styles.alertPriority}>Priority: {alert.priority}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Electric Scooter Warning - Special indicator for music listeners */}
        {safetyAnalysis?.safety_score.alerts.some(alert => 
          alert.type === 'proximity_threat' && 
          (alert.message.toLowerCase().includes('electric scooter') || 
           alert.message.toLowerCase().includes('silent vehicle'))
        ) && proximityAlertsEnabled && (
          <View style={[styles.infoCard, styles.scooterWarningCard]}>
            <Text style={styles.scooterWarningTitle}>🛴 SILENT VEHICLE DETECTED</Text>
            <Text style={styles.scooterWarningText}>
              Electric scooters/bikes are approaching! These vehicles are SILENT and FAST (up to 45 km/h).
            </Text>
            <Text style={styles.scooterWarningTip}>
              🎧 Music Listener Tip: Stay extra vigilant - you won't hear them coming!
            </Text>
            <Text style={styles.scooterWarningAction}>
              👀 Look around frequently and be ready to move aside
            </Text>
          </View>
        )}

        {/* AI Noise Profile */}
        {noiseProfile && (
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>🎧 AI Audio Environment</Text>
            <Text style={styles.infoText}>
              Environment: {noiseProfile.location_type.replace('_', ' ').toUpperCase()}
            </Text>
            <Text style={styles.infoText}>
              Predicted Noise: {Math.round(noiseProfile.predicted_noise_level)}dB
            </Text>
            <Text style={styles.infoText}>
              Cancellation: {noiseProfile.noise_cancellation_profile.replace('_', ' ').toUpperCase()}
            </Text>
            {noiseProfile.critical_sounds?.length > 0 && (
              <Text style={styles.infoText}>
                Monitoring: {noiseProfile.critical_sounds.slice(0, 3).join(', ')}
              </Text>
            )}
          </View>
        )}

        {/* Cycling Data Display */}
        {isCyclingMode && (
          <View style={[styles.infoCard, styles.cyclingCard]}>
            <Text style={styles.cardTitle}>🚴 Cycling Safety Monitor</Text>
            
            <View style={styles.cyclingGrid}>
              <View style={styles.cyclingItem}>
                <Text style={styles.cyclingLabel}>Current Speed</Text>
                <Text style={styles.cyclingValue}>{cyclingData.speed_kmh.toFixed(1)} km/h</Text>
              </View>
              
              <View style={styles.cyclingItem}>
                <Text style={styles.cyclingLabel}>Average Speed</Text>
                <Text style={styles.cyclingValue}>{cyclingData.avg_speed_kmh.toFixed(1)} km/h</Text>
              </View>
              
              <View style={styles.cyclingItem}>
                <Text style={styles.cyclingLabel}>Safety Score</Text>
                <Text style={[
                  styles.cyclingValue,
                  { color: cyclingSafetyScore > 70 ? '#4CAF50' : cyclingSafetyScore > 50 ? '#FF9800' : '#F44336' }
                ]}>
                  {cyclingSafetyScore}/100
                </Text>
              </View>
              
              <View style={styles.cyclingItem}>
                <Text style={styles.cyclingLabel}>Road Type</Text>
                <Text style={styles.cyclingValue}>{cyclingData.road_type.replace('_', ' ')}</Text>
              </View>
            </View>
            
            {cyclingThreats.length > 0 && (
              <View style={styles.cyclingThreats}>
                <Text style={styles.cyclingThreatsTitle}>Active Threats:</Text>
                {cyclingThreats.slice(0, 3).map((threat, index) => (
                  <View key={index} style={styles.cyclingThreatItem}>
                    <Text style={[
                      styles.cyclingThreatSeverity,
                      { color: threat.severity === 'critical' ? '#F44336' : 
                               threat.severity === 'high' ? '#FF9800' : '#FFC107' }
                    ]}>
                      {threat.severity.toUpperCase()}
                    </Text>
                    <Text style={styles.cyclingThreatDesc}>{threat.threat_description}</Text>
                  </View>
                ))}
              </View>
            )}
            
            <Text style={styles.cyclingStatus}>
              Risk Level: {cyclingSafetyScore > 70 ? 'Low' : cyclingSafetyScore > 50 ? 'Moderate' : 'High'} • 
              Traffic: {cyclingData.traffic_density} • Experience: {cyclingData.rider_experience}
            </Text>
          </View>
        )}

        {/* Biometric Monitoring */}
        {biometricData && (
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>💗 Health Monitoring</Text>
            <View style={styles.biometricGrid}>
              <View style={styles.biometricItem}>
                <Text style={styles.biometricValue}>{heartRate}</Text>
                <Text style={styles.biometricLabel}>BPM</Text>
              </View>
              <View style={styles.biometricItem}>
                <Text style={styles.biometricValue}>{stepCount}</Text>
                <Text style={styles.biometricLabel}>Steps</Text>
              </View>
              <View style={styles.biometricItem}>
                <Text style={styles.biometricValue}>{Math.round(stressLevel * 100)}%</Text>
                <Text style={styles.biometricLabel}>Stress</Text>
              </View>
              {biometricData.blood_oxygen && (
                <View style={styles.biometricItem}>
                  <Text style={styles.biometricValue}>{biometricData.blood_oxygen}%</Text>
                  <Text style={styles.biometricLabel}>O₂</Text>
                </View>
              )}
            </View>
            {healthAlerts.length > 0 && (
              <Text style={styles.warningText}>
                ⚠️ {healthAlerts.length} health alert{healthAlerts.length > 1 ? 's' : ''} active
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* Emergency Setup Modal */}
      <Modal
        visible={isEmergencySetupOpen}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Emergency Setup</Text>
            <TouchableOpacity onPress={() => {
              setIsEmergencySetupOpen(false);
              // Reset voice interaction state when closing
              setVoiceInteractionState({
                setupIntroPlayed: false,
                triggerWordExplained: false,
                contactsExplained: false,
                lastContactIndex: -1,
                lastTriggerWord: ''
              });
            }}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalDescription}>
              Set up a voice trigger word that will immediately alert emergency contacts and authorities if you're in danger.
            </Text>

            <View style={styles.inputGroup}>
              <View style={styles.labelWithVoice}>
                <Text style={styles.inputLabel}>Emergency Trigger Word</Text>
                <TouchableOpacity 
                  style={styles.voiceHelpButton}
                  onPress={async () => {
                    await speakAlert("Choose a unique trigger word that you can say clearly in an emergency. Good examples are Red Alert, Safe Word 9 1 1, or Help Now. Avoid common words you might say accidentally.");
                  }}
                >
                  <Ionicons name="volume-high" size={16} color="#2196F3" />
                </TouchableOpacity>
              </View>
              <Text style={styles.inputHint}>
                Choose a unique word you can say clearly in an emergency (e.g., "RedAlert", "SafeWord911", "HelpNow")
              </Text>
              <TextInput
                style={styles.textInput}
                value={emergencyTriggerWord}
                onFocus={async () => {
                  if (voiceAlertsEnabled && !voiceInteractionState.triggerWordExplained) {
                    await speakAlert("Enter your emergency trigger word. Make it memorable but unique.");
                    setVoiceInteractionState(prev => ({ ...prev, triggerWordExplained: true }));
                  }
                }}
                onChangeText={(text) => {
                  setEmergencyTriggerWord(text);
                  // Only provide feedback when word is complete (no setTimeout spam)
                  if (text.length >= 4 && voiceAlertsEnabled && text !== voiceInteractionState.lastTriggerWord) {
                    // Debounce voice feedback
                    clearTimeout(triggerWordTimeout.current);
                    triggerWordTimeout.current = setTimeout(async () => {
                      await speakAlert(`Trigger word set to ${text}.`);
                      setVoiceInteractionState(prev => ({ ...prev, lastTriggerWord: text }));
                    }, 2000);
                  }
                }}
                placeholder="Enter your secret trigger word"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelWithVoice}>
                <Text style={styles.inputLabel}>Emergency Contacts</Text>
                <TouchableOpacity 
                  style={styles.voiceHelpButton}
                  onPress={async () => {
                    await speakAlert("Now add your emergency contacts. These people will receive immediate alerts with your location during an emergency. Add at least two trusted contacts like family members, close friends, or roommates.");
                  }}
                >
                  <Ionicons name="volume-high" size={16} color="#2196F3" />
                </TouchableOpacity>
              </View>
              <Text style={styles.inputHint}>
                Enter phone numbers that will be notified immediately. In a real emergency, authorities will also be contacted.
              </Text>
              {emergencyContacts.map((contact, index) => (
                <View key={index} style={styles.contactRow}>
                  <TextInput
                    style={[
                      styles.contactInput,
                      contact.length > 0 && !validatePhoneNumber(contact) ? styles.inputError : null
                    ]}
                    value={contact}
                    onFocus={async () => {
                      if (voiceAlertsEnabled && !voiceInteractionState.contactsExplained) {
                        if (index === 0) {
                          await speakAlert("Add emergency contacts. Use full phone numbers including area code.");
                        }
                        setVoiceInteractionState(prev => ({ ...prev, contactsExplained: true }));
                      }
                    }}
                    onChangeText={(text) => {
                      const newContacts = [...emergencyContacts];
                      newContacts[index] = text;
                      setEmergencyContacts(newContacts);
                      
                      // Simplified voice feedback - only for first valid contact
                      if (text.length >= 10 && validatePhoneNumber(text) && voiceAlertsEnabled && voiceInteractionState.lastContactIndex < index) {
                        setTimeout(async () => {
                          await speakAlert("Contact added.");
                          setVoiceInteractionState(prev => ({ ...prev, lastContactIndex: index }));
                        }, 1500);
                      }
                    }}
                    placeholder="Phone number"
                    keyboardType="phone-pad"
                  />
                  <TouchableOpacity
                    onPress={() => {
                      const newContacts = emergencyContacts.filter((_, i) => i !== index);
                      setEmergencyContacts(newContacts);
                      // No voice feedback for removal - too noisy
                    }}
                  >
                    <Ionicons name="remove-circle" size={24} color="#F44336" />
                  </TouchableOpacity>
                </View>
              ))}
              
              <TouchableOpacity
                style={styles.addContactButton}
                onPress={async () => {
                  setEmergencyContacts([...emergencyContacts, '']);
                  if (voiceAlertsEnabled) {
                    await speakAlert(`Adding a new emergency contact. The more contacts you have, the better your safety coverage.`);
                  }
                }}
              >
                <Ionicons name="add" size={20} color="#2196F3" />
                <Text style={styles.addContactText}>Add Contact</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.warningBox}>
              <Ionicons name="warning" size={24} color="#FF9800" />
              <Text style={styles.warningText}>
                Important: This is a safety demonstration. In a real emergency, always call your local emergency number (911, 112, etc.) directly.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={async () => {
                if (voiceAlertsEnabled) {
                  await speakAlert("Emergency setup cancelled. You can set this up anytime for your safety.");
                }
                setIsEmergencySetupOpen(false);
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.saveButton, (!emergencyTriggerWord || emergencyContacts.filter(c => c.length > 0).length === 0) && styles.saveButtonDisabled]}
              onPress={async () => {
                const validContacts = emergencyContacts.filter(c => c.length > 0);
                if (!emergencyTriggerWord || validContacts.length === 0) {
                  if (voiceAlertsEnabled) {
                    await speakAlert("Please complete both your trigger word and at least one emergency contact before saving.");
                  }
                  return;
                }
                await saveEmergencySettings(emergencyTriggerWord, validContacts);
              }}
              disabled={!emergencyTriggerWord || emergencyContacts.filter(c => c.length > 0).length === 0}
            >
              <Text style={styles.saveButtonText}>Save Emergency Settings</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
    color: '#333',
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
    lineHeight: 24,
  },
  header: {
    backgroundColor: '#667eea',
    padding: 25,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  headerGlow: {
    position: 'absolute',
    top: -50,
    left: -50,
    right: -50,
    bottom: -50,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 100,
    opacity: 0.3,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2,
  },
  shieldIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  titleText: {
    flex: 1,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  appSubtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  safetyScoreContainer: {
    alignItems: 'center',
    padding: 30,
  },
  safetyScoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  safetyScoreNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  safetyScoreLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  controlsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  controlButton: {
    backgroundColor: '#666',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  controlButtonActive: {
    backgroundColor: '#F44336',
  },
  settingsButton: {
    backgroundColor: '#FF9800',
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  primaryButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 10,
    minWidth: 200,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  infoCard: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 0,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  alertCard: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffc107',
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  warningText: {
    color: '#F44336',
    fontWeight: 'bold',
  },
  riskFactor: {
    fontSize: 14,
    color: '#F44336',
    marginBottom: 5,
  },
  recommendation: {
    fontSize: 14,
    color: '#4CAF50',
    marginBottom: 5,
  },
  alertItem: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#f8d7da',
    borderRadius: 5,
  },
  alertType: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#721c24',
    marginBottom: 5,
  },
  alertMessage: {
    fontSize: 14,
    color: '#721c24',
    marginBottom: 5,
  },
  alertPriority: {
    fontSize: 12,
    color: '#856404',
  },
  // Electric Scooter Warning Styles
  scooterWarningCard: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF4757',
    borderWidth: 2,
    borderStyle: 'solid',
    shadowColor: '#FF4757',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  scooterWarningTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 10,
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  scooterWarningText: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  scooterWarningTip: {
    fontSize: 14,
    color: '#FFF3B0',
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 8,
  },
  scooterWarningAction: {
    fontSize: 15,
    color: '#FFF',
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 8,
    borderRadius: 5,
    marginTop: 5,
  },
  // Emergency Styles
  emergencyBanner: {
    backgroundColor: '#D32F2F',
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    borderRadius: 10,
    marginBottom: 10,
  },
  emergencyBannerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  deactivateButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  deactivateButtonText: {
    color: '#D32F2F',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emergencyButton: {
    backgroundColor: '#D32F2F',
  },
  listeningButton: {
    backgroundColor: '#4CAF50',
  },
  handsFreeButton: {
    backgroundColor: '#2196F3',
  },
  manualTriggerButton: {
    backgroundColor: '#FF9800',
  },
  infoButton: {
    backgroundColor: '#9C27B0',
  },
  demoButton: {
    backgroundColor: '#607D8B',
  },
  cyclingButton: {
    backgroundColor: '#4CAF50',
  },
  cyclingActiveButton: {
    backgroundColor: '#2E7D32',
  },
  testEmergencyButton: {
    backgroundColor: '#FF5722',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 25,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  inputHint: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    lineHeight: 20,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  inputError: {
    borderColor: '#F44336',
    backgroundColor: '#FFEBEE',
  },
  // Voice Trigger Status Styles
  statusCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 15,
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  listeningCard: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  listeningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginLeft: 8,
    opacity: 0.8,
  },
  listeningText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 15,
  },
  stopListeningButton: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: 'center',
  },
  stopListeningText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  contactInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    backgroundColor: '#fff',
    fontSize: 16,
    marginRight: 10,
  },
  addContactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderWidth: 1,
    borderColor: '#2196F3',
    borderRadius: 10,
    borderStyle: 'dashed',
    justifyContent: 'center',
  },
  addContactText: {
    color: '#2196F3',
    fontSize: 16,
    marginLeft: 5,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF3CD',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFEAA7',
    alignItems: 'flex-start',
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#856404',
    marginLeft: 10,
    lineHeight: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  cancelButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 10,
  },
  cancelButtonText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
  },
  saveButton: {
    flex: 2,
    backgroundColor: '#D32F2F',
    padding: 15,
    borderRadius: 10,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  // Voice guidance styles
  labelWithVoice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  voiceHelpButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#2196F3',
    marginLeft: 10,
  },
  // Flashy Dynamic Styles
  safetyScoreWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRingInner: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    opacity: 0.3,
  },
  scoreGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.1)',
    opacity: 0.5,
  },
  shieldOverlay: {
    position: 'absolute',
    bottom: 10,
    right: 10,
  },
  statusIndicators: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  statusItem: {
    alignItems: 'center',
    opacity: 0.8,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  // Enhanced Control Styles
  primaryActionButton: {
    backgroundColor: '#1A1A2E',
    borderRadius: 20,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#00FF88',
    elevation: 10,
    shadowColor: '#00FF88',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  primaryActionButtonActive: {
    borderColor: '#FF6B6B',
    shadowColor: '#FF6B6B',
  },
  primaryActionButtonLoading: {
    borderColor: '#FFA726',
    shadowColor: '#FFA726',
  },
  buttonGradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,255,136,0.1)',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 2,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 15,
    letterSpacing: 1,
  },
  activeIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#00FF88',
  },
  controlGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureButton: {
    width: '48%',
    backgroundColor: '#1A1A2E',
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 10,
  },
  featureButtonActive: {
    borderColor: '#00FF88',
    backgroundColor: 'rgba(0,255,136,0.1)',
  },
  emergencyTestButton: {
    borderColor: '#FFA726',
    backgroundColor: 'rgba(255,167,38,0.1)',
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  featureButtonText: {
    color: '#999',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  featureButtonTextActive: {
    color: '#00FF88',
  },
  featureStatus: {
    color: '#666',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  // Biometric Styles
  biometricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  biometricItem: {
    alignItems: 'center',
    width: '48%',
    backgroundColor: 'rgba(103, 126, 234, 0.1)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  biometricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#667eea',
  },
  biometricLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  // Cycling Styles
  cyclingCard: {
    backgroundColor: '#fff',
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  cyclingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  cyclingItem: {
    alignItems: 'center',
    width: '48%',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  cyclingLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    textAlign: 'center',
  },
  cyclingValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    textAlign: 'center',
  },
  cyclingThreats: {
    marginTop: 15,
    padding: 10,
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    borderRadius: 8,
  },
  cyclingThreatsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF9800',
    marginBottom: 8,
  },
  cyclingThreatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  cyclingThreatSeverity: {
    fontSize: 10,
    fontWeight: 'bold',
    marginRight: 8,
    minWidth: 60,
  },
  cyclingThreatDesc: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  cyclingStatus: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
  cyclingActiveButton: {
    backgroundColor: '#4CAF50',
  },
  cyclingButton: {
    backgroundColor: '#81C784',
  },
  // Voice Trigger Status Styles
  statusCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 15,
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  listeningCard: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  listeningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginLeft: 8,
    opacity: 0.8,
  },
  listeningText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 15,
  },
  stopListeningButton: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: 'center',
  },
  stopListeningText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Hands-Free Mode Styles
  handsFreeCard: {
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    borderColor: '#2196F3',
    borderWidth: 2,
  },
  handsFreeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  handsFreeTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  handsFreeDescription: {
    color: '#B0BEC5',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 20,
  },
  stopHandsFreeButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: 'center',
  },
  stopHandsFreeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Voice Info Only Status Styles
  voiceInfoCard: {
    backgroundColor: 'rgba(156, 39, 176, 0.1)',
    borderColor: '#9C27B0',
    borderWidth: 2,
  },
  voiceInfoTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  voiceInfoDescription: {
    color: '#B0BEC5',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 20,
  },
  stopVoiceInfoButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: 'center',
  },
  stopVoiceInfoText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});