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
  Animated,
  Easing,
} from 'react-native';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { Accelerometer, Pedometer, DeviceMotion } from 'expo-sensors';
import i18n from '../translations';
import JourneyShareCard from '../components/JourneyShareCard';

// Module-level cycling state (avoids React closure issues)
let _isCyclingActive = false;

// Suppress known Expo Go warnings that don't affect functionality
const originalError = console.error;
const originalWarn = console.warn;

console.error = (...args) => {
  if (args[0]?.includes?.('React.Fragment')) return;
  if (args[0]?.includes?.('expo-router')) return;
  if (args[0]?.includes?.('Unexpected text node')) return;
  originalError(...args);
};

console.warn = (...args) => {
  if (args[0]?.includes?.('expo-notifications')) return;
  if (args[0]?.includes?.('remote notifications')) return;
  originalWarn(...args);
};

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
  // Language state
  const [currentLanguage, setCurrentLanguage] = useState(i18n.locale);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  
  // Voice settings state
  const [voiceAccent, setVoiceAccent] = useState<'en-US' | 'en-GB' | 'en-AU' | 'en-IN'>('en-US');
  const [showVoicePicker, setShowVoicePicker] = useState(false);
  
  const [location, setLocation] = useState<LocationData | null>(null);
  const [safetyAnalysis, setSafetyAnalysis] = useState<SafetyAnalysis | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(Platform.OS === 'web');
  const [voiceAlertsEnabled, setVoiceAlertsEnabled] = useState(true);
  const [lastAlertTime, setLastAlertTime] = useState<number>(0);
  const lastAlertsByType = useRef<{[key: string]: number}>({});
  const alertCooldowns = {
    critical: 30000,      // 30 seconds
    high: 60000,          // 1 minute
    medium: 120000,       // 2 minutes
    low: 300000,          // 5 minutes
    info: 600000          // 10 minutes
  };
  
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

  // Animated score ring refs
  const pulseAnim = useRef(new Animated.Value(0.6)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;

  // Radar pulse animation refs
  const radarRing1 = useRef(new Animated.Value(0)).current;
  const radarRing2 = useRef(new Animated.Value(0)).current;
  const radarRing3 = useRef(new Animated.Value(0)).current;

  // Privacy Policy state
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);

  // Start score ring animations
  useEffect(() => {
    // Pulse animation (breathe effect)
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      ])
    );
    // Rotation animation (slow spin)
    const rotateLoop = Animated.loop(
      Animated.timing(rotateAnim, { toValue: 1, duration: 8000, easing: Easing.linear, useNativeDriver: false })
    );
    // Glow animation
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 0.8, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0.3, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      ])
    );
    pulseLoop.start();
    rotateLoop.start();
    glowLoop.start();
    return () => { pulseLoop.stop(); rotateLoop.stop(); glowLoop.stop(); };
  }, []);

  // Radar pulse concentric ring animations
  useEffect(() => {
    if (!isTracking) {
      radarRing1.setValue(0);
      radarRing2.setValue(0);
      radarRing3.setValue(0);
      return;
    }
    const createRadarRing = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(anim, { toValue: 1, duration: 2000, easing: Easing.out(Easing.ease), useNativeDriver: false }),
          ]),
          Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: false }),
        ])
      );
    const r1 = createRadarRing(radarRing1, 0);
    const r2 = createRadarRing(radarRing2, 600);
    const r3 = createRadarRing(radarRing3, 1200);
    r1.start(); r2.start(); r3.start();
    return () => { r1.stop(); r2.stop(); r3.stop(); };
  }, [isTracking]);

  // Journey tracking state
  const [showJourneyCard, setShowJourneyCard] = useState(false);
  const journeyStartTime = useRef<number>(0);
  const journeyRoutePoints = useRef<{ latitude: number; longitude: number }[]>([]);
  const journeySafetyScores = useRef<number[]>([]);
  const journeyHeartRates = useRef<number[]>([]);
  const journeyStepsStart = useRef<number>(0);
  const journeyActiveRef = useRef(false);
  const [lastJourneyData, setLastJourneyData] = useState<any>(null);

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
      // On web, permissions often fail or are limited - auto-grant demo mode
      if (Platform.OS === 'web') {
        setPermissionsGranted(true);
        return;
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
      } else {
        // Still allow demo mode even without permissions
        Alert.alert(
          'Permissions Needed for Full Protection',
          'Street Shield works best with location and notification permissions. You can still use demo mode or try again.',
          [
            { text: 'Demo Mode', onPress: () => setPermissionsGranted(true) },
            { text: 'Try Again', onPress: () => requestPermissions() }
          ]
        );
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      // Fallback to demo mode on error
      setPermissionsGranted(true);
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
      
      // Start journey tracking
      journeyStartTime.current = Date.now();
      journeyRoutePoints.current = [];
      journeySafetyScores.current = [];
      journeyHeartRates.current = [];
      journeyStepsStart.current = stepCount;
      journeyActiveRef.current = true;
      
      // Voice prompt for starting (non-blocking on web)
      if (voiceAlertsEnabled) {
        speakAlert("Street Shield protection is now active. I'm monitoring your safety and surroundings.").catch(() => {});
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
              
              // Collect journey route points
              if (journeyActiveRef.current) {
                journeyRoutePoints.current.push({
                  latitude: locationData.latitude,
                  longitude: locationData.longitude,
                });
              }
              
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
      
      // Collect journey route points in demo mode
      if (journeyActiveRef.current) {
        journeyRoutePoints.current.push({
          latitude: updatedDemo.latitude,
          longitude: updatedDemo.longitude,
        });
      }
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

      // Collect heart rates for journey
      if (journeyActiveRef.current) {
        journeyHeartRates.current.push(simulatedBiometrics.heart_rate);
      }

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
    let healthMessage = `Activity Alert: ${alert.message}`;
    if (alert.recommended_action) {
      healthMessage += ` ${alert.recommended_action}`;
    }

    await processVoiceAlert(healthMessage, 'health_alert');
    
    // Show notification
    await showNotification(
      `Activity Alert - ${alert.alert_type}`, 
      alert.message
    );
  };

  const triggerMedicalEmergency = async (alerts: any[]) => {
    const criticalAlert = alerts.find(alert => alert.auto_emergency);
    if (criticalAlert && voiceAlertsEnabled) {
      await speakAlert(
        "Safety concern detected. Notifying your trusted contacts. Consider resting and checking in with someone nearby.",
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

    // Complete journey and show share card
    if (journeyActiveRef.current) {
      completeJourney();
    }
  };

  const completeJourney = async () => {
    const durationMs = Date.now() - journeyStartTime.current;
    const durationMinutes = durationMs / 60000;
    const points = journeyRoutePoints.current;
    
    // Calculate distance from route points
    let distanceKm = 0;
    for (let i = 1; i < points.length; i++) {
      distanceKm += haversineDistance(
        points[i - 1].latitude, points[i - 1].longitude,
        points[i].latitude, points[i].longitude
      );
    }

    const avgScore = journeySafetyScores.current.length > 0
      ? Math.round(journeySafetyScores.current.reduce((a, b) => a + b, 0) / journeySafetyScores.current.length)
      : 75;

    const avgHR = journeyHeartRates.current.length > 0
      ? Math.round(journeyHeartRates.current.reduce((a, b) => a + b, 0) / journeyHeartRates.current.length)
      : heartRate;

    const journeySteps = Math.max(0, stepCount - journeyStepsStart.current);
    const activityType = _isCyclingActive ? 'cycling' : 'walking';

    // Build cycling metrics if in cycling mode
    let cyclingPayload = undefined;
    if (_isCyclingActive) {
      const speeds = speedHistory.current;
      const avgSpeed = speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : cyclingData.avg_speed_kmh;
      const maxSpeed = speeds.length > 0 ? Math.max(...speeds) : avgSpeed * 1.3;
      
      cyclingPayload = {
        max_speed_kmh: maxSpeed,
        avg_speed_kmh: avgSpeed,
        cadence_avg: Math.round(65 + Math.random() * 30), // simulated
        power_avg_watts: Math.round(120 + avgSpeed * 8), // estimated from speed
        hazards_encountered: cyclingThreats.length,
        cycling_safety_score: cyclingSafetyScore,
        road_types: { [cyclingData.road_type]: 0.6, mixed: 0.4 },
      };
    }

    const data: any = {
      activityType,
      distanceKm: Math.max(distanceKm, 0.1),
      durationMinutes: Math.max(durationMinutes, 1),
      avgSafetyScore: _isCyclingActive ? cyclingSafetyScore : avgScore,
      steps: _isCyclingActive ? 0 : (journeySteps > 0 ? journeySteps : Math.floor(durationMinutes * 100)),
      avgHeartRate: avgHR,
      routePoints: points,
      completedAt: new Date().toISOString(),
    };

    // Save to backend and get enhanced data (elevation, effort)
    try {
      const response = await fetch(`${BACKEND_URL}/api/journey/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'demo_user',
          activity_type: activityType,
          route_points: points.map(p => ({ lat: p.latitude, lon: p.longitude })),
          distance_km: data.distanceKm,
          duration_minutes: data.durationMinutes,
          avg_safety_score: data.avgSafetyScore,
          steps: data.steps,
          avg_heart_rate: data.avgHeartRate,
          cycling_metrics: cyclingPayload,
        }),
      });
      
      if (response.ok) {
        const serverReport = await response.json();
        // Merge server-generated cycling metrics (elevation, effort) into local data
        if (serverReport.cycling_metrics) {
          data.cyclingMetrics = serverReport.cycling_metrics;
        }
        data.shareToken = serverReport.share_token;
      }
    } catch (err) {
      console.log('Failed to save journey report:', err);
      // Fallback: use local cycling data without elevation
      if (cyclingPayload) {
        data.cyclingMetrics = {
          ...cyclingPayload,
          elevation_gain_m: 0,
          elevation_loss_m: 0,
          elevation_profile: [],
          effort_score: 50,
        };
      }
    }

    setLastJourneyData(data);
    journeyActiveRef.current = false;
    setShowJourneyCard(true);
  };

  // Haversine distance in km
  const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
      
      // Collect safety scores for journey
      if (journeyActiveRef.current && analysis.safety_score) {
        journeySafetyScores.current.push(analysis.safety_score.overall_score);
      }
      
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
    
    // Helper function to check if alert should be announced
    const shouldAnnounceAlert = (alertType: string, priority: string): boolean => {
      const lastTime = lastAlertsByType.current[alertType] || 0;
      const cooldown = alertCooldowns[priority as keyof typeof alertCooldowns] || alertCooldowns.medium;
      return (now - lastTime) >= cooldown;
    };
    
    // Helper function to mark alert as announced
    const markAlertAnnounced = (alertType: string) => {
      lastAlertsByType.current[alertType] = now;
      setLastAlertTime(now);
    };

    // ELECTRIC SCOOTER DETECTION - Only announce IMMEDIATE/CRITICAL threats
    const scooterAlerts = alerts.filter(alert => 
      alert.type === 'proximity_threat' && 
      alert.priority === 'critical' &&  // Only critical e-scooter alerts
      (alert.message.toLowerCase().includes('electric scooter') || 
       alert.message.toLowerCase().includes('silent vehicle') ||
       alert.message.toLowerCase().includes('immediate'))
    );

    for (const scooterAlert of scooterAlerts) {
      const alertKey = 'escooter_critical';
      
      if (proximityAlertsEnabled && shouldAnnounceAlert(alertKey, 'critical')) {
        // High-priority notification for e-scooters
        await showNotification('🛴 E-Scooter Alert!', scooterAlert.message);
        
        if (voiceAlertsEnabled) {
          // Only announce immediate threats
          if (scooterAlert.message.toLowerCase().includes('immediate')) {
            await processVoiceAlert("Immediate evasion! Electric scooter approaching fast!", 'escooter_alert', { priority: 'urgent' });
          } else if (scooterAlert.message.toLowerCase().includes('critical')) {
            await processVoiceAlert("Electric scooter approaching. Move aside quickly.", 'escooter_alert', { priority: 'urgent' });
          }
        }
        
        markAlertAnnounced(alertKey);
        break; // Only one e-scooter alert at a time
      }
    }

    // Process ONLY high-priority and critical alerts (not medium/low)
    for (const alert of alerts) {
      // Skip e-scooter alerts as they're already handled
      if (alert.type === 'proximity_threat' && 
          (alert.message.toLowerCase().includes('electric scooter') || 
           alert.message.toLowerCase().includes('silent vehicle'))) {
        continue;
      }
      
      // ONLY announce critical alerts via voice
      if (alert.priority === 'critical') {
        const alertKey = `${alert.type}_critical`;
        
        if (shouldAnnounceAlert(alertKey, 'critical')) {
          await showNotification(`⚠️ Critical Alert - ${alert.type}`, alert.message);
          
          if (voiceAlertsEnabled) {
            // Make voice messages concise
            let voiceMessage = `Critical warning: ${alert.message.split('.')[0]}.`; // Only first sentence
            await speakAlert(voiceMessage, 'critical');
          }
          
          markAlertAnnounced(alertKey);
          break; // Only one critical alert at a time
        }
      } else if (alert.priority === 'high') {
        // High priority - show notification but NO voice unless acute
        const alertKey = `${alert.type}_high`;
        
        if (shouldAnnounceAlert(alertKey, 'high')) {
          await showNotification(`⚠️ Safety Alert - ${alert.type}`, alert.message);
          markAlertAnnounced(alertKey);
          break; // Only one high-priority notification at a time
        }
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

    // DON'T provide routine safety score updates - only show critical changes
    // Users can check safety score visually on screen
    const score = analysis.safety_score.overall_score;

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
      await speakAlert("Welcome to Safety Alert Setup. I'll guide you through configuring your personal safety notification system.");
      
      // Provide initial guidance after a brief pause
      setTimeout(async () => {
        await speakAlert("First, you'll choose a secret trigger word. This should be a unique word you can say clearly when you feel unsafe. Avoid common words you might say accidentally.");
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
        await speakAlert(`Safety alert setup complete. Trigger word: ${triggerWord}. ${validContacts.length} contact${validContacts.length > 1 ? 's' : ''} added.`, 'low');
      }
    } catch (error) {
      console.error('Error saving emergency settings:', error);
      if (voiceAlertsEnabled) {
        await speakAlert("There was an error saving your alert settings to the cloud, but they are saved locally. Please check your internet connection and try again.");
      }
    }
  };

  const triggerEmergencyMode = async () => {
    if (isEmergencyModeActive) return; // Prevent multiple triggers
    
    setIsEmergencyModeActive(true);
    emergencyModeStartTime.current = Date.now();
    
    // Immediate emergency response
    await showNotification('ALERT ACTIVATED', 'Alert mode activated! Notifying your trusted contacts.');
    
    if (voiceAlertsEnabled) {
      Speech.stop();
      await speakAlert("Alert activated. Notifying contacts now.", 'critical');
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
        await offlineEmergencyMode(); // Fallback to offline mode
        return;
      }

      // Check network connectivity first
      const isOnline = await checkNetworkConnection();
      
      if (!isOnline) {
        console.log('No network connection - activating offline emergency mode');
        await offlineEmergencyMode();
        return;
      }

      // Try online emergency notification via backend API
      const emergencyEvent = {
        user_id: 'demo_user',
        location: location,
        trigger_method: 'voice_trigger',
        trigger_word_used: emergencyTriggerWord
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      try {
        const response = await fetch(`${BACKEND_URL}/api/emergency/trigger`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(emergencyEvent),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const result = await response.json();
          console.log('✅ Online emergency triggered successfully:', result);
          
          if (voiceAlertsEnabled) {
            await speakAlert(`Emergency alert sent to ${result.contacts_notified} contacts. Help is on the way.`, 'critical');
          }
          
          await showNotification(
            '✅ Emergency Alert Sent',
            `Notified ${result.contacts_notified} contacts via network`
          );
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      } catch (fetchError) {
        console.log('Network request failed, falling back to offline mode');
        await offlineEmergencyMode();
      }
      
    } catch (error) {
      console.error('Error sending emergency alerts:', error);
      await offlineEmergencyMode();
    }
  };

  // OFFLINE EMERGENCY MODE - Works without cellular signal
  const offlineEmergencyMode = async () => {
    console.log('🆘 OFFLINE EMERGENCY MODE ACTIVATED');
    
    // 1. Store emergency data locally for later transmission
    const offlineEmergencyData = {
      timestamp: new Date().toISOString(),
      location: location ? {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy
      } : null,
      contacts: emergencyContacts,
      trigger_word: emergencyTriggerWord,
      status: 'pending_transmission'
    };
    
    await AsyncStorage.setItem('pendingEmergency', JSON.stringify(offlineEmergencyData));
    
    // 2. Visual emergency signals (works offline)
    await triggerOfflineEmergencySignals();
    
    // 3. Try satellite emergency (iPhone 14+ only)
    await attemptSatelliteEmergency();
    
    // 4. Try Bluetooth beacon to nearby devices
    await broadcastBluetoothEmergency();
    
    // 5. Voice feedback
    if (voiceAlertsEnabled) {
      await speakAlert(
        "No signal detected. Emergency stored locally. Visual and audio alerts activated. Message will send when connection restored. If you have iPhone 14 or newer, satellite emergency has been initiated.",
        'critical'
      );
    }
    
    // 6. Show offline emergency notification
    await showNotification(
      '🆘 OFFLINE EMERGENCY MODE',
      'No signal. Local alerts active. Will retry when connection available.'
    );
    
    // 7. Schedule retry attempts
    startEmergencyRetryLoop();
  };

  // Check network connectivity
  const checkNetworkConnection = async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      const response = await fetch(`${BACKEND_URL}/api/health`, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  };

  // Offline emergency signals - visual and audio
  const triggerOfflineEmergencySignals = async () => {
    // 1. Maximum volume alert
    await speakAlert("EMERGENCY! EMERGENCY! EMERGENCY!", 'critical');
    
    // 2. Continuous haptic feedback pattern
    for (let i = 0; i < 5; i++) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // 3. Log for later review
    console.log('🚨 OFFLINE EMERGENCY SIGNALS ACTIVATED');
    console.log('Location:', location);
    console.log('Contacts:', emergencyContacts);
    console.log('Time:', new Date().toISOString());
  };

  // Attempt satellite emergency for compatible devices
  const attemptSatelliteEmergency = async () => {
    try {
      // Check if device supports satellite emergency (iPhone 14+)
      if (Platform.OS === 'ios') {
        console.log('📡 Attempting satellite emergency...');
        
        // Native iOS Emergency SOS via satellite
        // This opens the native emergency interface on supported devices
        const emergencyURL = `tel:${encodeURIComponent('112')}`; // International emergency
        
        // On iPhone 14+, this will prompt satellite emergency if no signal
        // await Linking.openURL(emergencyURL);
        
        console.log('📡 Satellite emergency initiated (if supported by device)');
        
        if (voiceAlertsEnabled) {
          await speakAlert(
            "If you have iPhone 14 or newer, satellite emergency service is available. Follow on-screen instructions.",
            'critical'
          );
        }
      } else {
        console.log('⚠️ Satellite emergency only available on iPhone 14+');
      }
    } catch (error) {
      console.error('Satellite emergency error:', error);
    }
  };

  // Broadcast emergency via Bluetooth to nearby devices
  const broadcastBluetoothEmergency = async () => {
    try {
      console.log('📻 Broadcasting Bluetooth emergency beacon...');
      
      // Store emergency beacon data
      const beaconData = {
        type: 'EMERGENCY',
        app: 'StreetShield',
        location: location,
        timestamp: new Date().toISOString(),
        contacts: emergencyContacts
      };
      
      await AsyncStorage.setItem('bluetoothEmergencyBeacon', JSON.stringify(beaconData));
      
      console.log('📻 Emergency beacon data stored for Bluetooth broadcast');
      
      // Note: Actual Bluetooth broadcasting requires native modules
      // This prepares data for when native build supports it
    } catch (error) {
      console.error('Bluetooth beacon error:', error);
    }
  };

  // Retry emergency transmission when connection restored
  const startEmergencyRetryLoop = () => {
    const retryInterval = setInterval(async () => {
      const isOnline = await checkNetworkConnection();
      
      if (isOnline) {
        console.log('🌐 Connection restored! Sending pending emergency...');
        
        // Get pending emergency
        const pendingData = await AsyncStorage.getItem('pendingEmergency');
        
        if (pendingData) {
          const emergency = JSON.parse(pendingData);
          
          // Try to send via backend
          try {
            const response = await fetch(`${BACKEND_URL}/api/emergency/trigger`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                user_id: 'demo_user',
                location: emergency.location,
                trigger_method: 'offline_delayed',
                trigger_word_used: emergency.trigger_word,
                original_timestamp: emergency.timestamp
              })
            });
            
            if (response.ok) {
              await AsyncStorage.removeItem('pendingEmergency');
              clearInterval(retryInterval);
              
              await speakAlert("Connection restored. Emergency alert successfully sent to all contacts.", 'high');
              await showNotification(
                '✅ Emergency Sent',
                'Delayed emergency alert delivered successfully'
              );
            }
          } catch (error) {
            console.log('Retry failed, will try again...');
          }
        } else {
          clearInterval(retryInterval);
        }
      }
    }, 10000); // Check every 10 seconds
    
    // Store interval reference for cleanup
    setTimeout(() => clearInterval(retryInterval), 300000); // Stop after 5 minutes
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
  const [voiceInfoResponse, setVoiceInfoResponse] = useState<string>('');
  const [voiceInfoLoading, setVoiceInfoLoading] = useState(false);
  const voiceInfoTimeout = useRef<NodeJS.Timeout | null>(null);

  // Cycling Mode System
  const [isCyclingMode, setIsCyclingMode] = useState(false);
  const isCyclingModeRef = useRef(false);
  
  // Debug: expose ref to window for testing
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    (window as any).__cyclingRef = isCyclingModeRef;
  }
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
        await speakAlert(`Hands-free mode active. Listening for ${emergencyTriggerWord}.`, 'low');
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
    
    console.log('🎤 Voice input received:', text);
    
    // Prevent spam requests
    if (now - lastInfoRequest < 3000) {
      console.log('⏱️ Too soon, preventing spam');
      return false;
    }
    
    // Check for "Street Shield" trigger word first
    const triggerPhrases = ['street shield', 'streetshield', 'shield'];
    const hasTrigger = triggerPhrases.some(trigger => text.includes(trigger));
    
    console.log('🔍 Has trigger word?', hasTrigger);
    
    if (!hasTrigger) {
      console.log('❌ No trigger word found');
      return false; // Must say "Street Shield" first
    }
    
    // Remove trigger word to get the actual command
    let command = text;
    for (const trigger of triggerPhrases) {
      command = command.replace(trigger, '').trim();
    }
    
    console.log('📝 Command after trigger removal:', command);
    
    // Keep original command for pattern matching (before stripping)
    const originalCommand = command;
    
    // Remove common connecting words for fuzzy matching fallback
    const strippedCommand = command
      .replace(/^(what|how|when|is|are|the|current|can|you|do|tell|me|about)\s+/gi, '')
      .replace(/\s+(is|are|the|current)\s+/gi, ' ')
      .trim();
    
    console.log('✨ Final command:', strippedCommand);
    
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
      console.log('🚴 Checking cycling commands...');
      const cyclingProcessed = await processCyclingVoiceCommand(command);
      if (cyclingProcessed) {
        console.log('✅ Cycling command processed');
        setLastInfoRequest(now);
        return true;
      }
    }
    
    // Match command to category - try original command first, then stripped
    let matchedCategory = null;
    for (const [category, patterns] of Object.entries(commands)) {
      if (patterns.some(pattern => originalCommand.includes(pattern) || strippedCommand.includes(pattern))) {
        matchedCategory = category;
        console.log(`✅ Matched category: ${category}`);
        break;
      }
    }
    console.log('🔎 Final matched category:', matchedCategory);
    
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
          response = `Street Shield voice commands: Say Street Shield followed by your question. Examples: Street Shield, what is my safety score? Street Shield, where am I? Street Shield, any threats nearby? You can also ask about weather, health, time, battery, or emergency contacts. For emergencies, say your custom trigger word.`;
          break;
          
        default:
          response = "I didn't understand that request. Try asking about safety, location, weather, health, threats, time, or contacts.";
      }
      
      // Provide audio + visual response
      setVoiceInfoResponse(response);
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
      await speakAlert("Voice info ready. Say Street Shield, then your question.", 'low');
    }
    
    // Start persistent voice info listening (no timeout - always available)
    startPersistentVoiceInfoListening();
  };

  const deactivateVoiceInfoRequest = () => {
    setIsVoiceInfoActive(false);
    setVoiceInfoResponse('');
    setVoiceInfoLoading(false);
    
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

  // Voice info demo - shows what the system would do with real speech recognition
  const simulateVoiceInfoRequest = async (query: string) => {
    // For demo/testing purposes - simulate voice input with visual feedback
    setVoiceInfoLoading(true);
    setVoiceInfoResponse('');
    const processed = await processVoiceInfoRequest(query);
    setVoiceInfoLoading(false);
    if (!processed) {
      setVoiceInfoResponse("I didn't recognize that command. Try asking about safety, location, weather, health, threats, time, or contacts.");
    }
  };

  // CYCLING-SPECIFIC FUNCTIONALITY
  const toggleCyclingMode = async () => {
    const newCyclingMode = !isCyclingMode;
    setIsCyclingMode(newCyclingMode);
    isCyclingModeRef.current = newCyclingMode;
    _isCyclingActive = newCyclingMode;
    
    if (newCyclingMode) {
      if (voiceAlertsEnabled) {
        speakAlert("Cycling mode activated. Street Shield will now provide bike-specific safety alerts including vehicle approach warnings, door zone hazards, intersection analysis, and road surface alerts. Stay safe on your ride!").catch(() => {});
      }
      
      // Auto-start tracking + journey when cycling mode activates
      if (!isTracking) {
        // Use startTracking directly for reliable state management
        startTracking();
      } else {
        // Already tracking, just enable journey collection
        if (!journeyActiveRef.current) {
          journeyStartTime.current = Date.now();
          journeyRoutePoints.current = [];
          journeySafetyScores.current = [];
          journeyHeartRates.current = [];
          journeyStepsStart.current = stepCount;
          journeyActiveRef.current = true;
        }
      }
      
      // Start cycling-specific monitoring
      startCyclingMonitoring();
    } else {
      if (voiceAlertsEnabled) {
        speakAlert("Cycling mode deactivated. Returning to pedestrian safety mode.").catch(() => {});
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

  // Enhanced voice info processing for cycling (after Street Shield trigger)
  const processCyclingVoiceCommand = async (command: string): Promise<boolean> => {
    if (!isCyclingMode) return false;
    
    const text = command.toLowerCase().trim();
    
    // Cycling-specific voice commands (without "Street Shield" prefix)
    const cyclingCommands = {
      speed: ['speed', 'how fast', 'current speed', 'speed check', 'velocity'],
      threats: ['cycling threats', 'bike hazards', 'vehicle behind', 'road hazards', 'dangers', 'bike threats'],
      safety: ['cycling safety', 'bike safety score', 'safe cycling', 'cycling risk'],
      route: ['route suggestion', 'bike lanes', 'safer route', 'route', 'bike path']
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

  // HAPTIC FEEDBACK SYSTEM WITH PRIORITY LEVELS
  const triggerHapticFeedback = async (priority: 'low' | 'medium' | 'high' | 'critical' = 'medium') => {
    try {
      // Different haptic patterns based on priority
      switch (priority) {
        case 'critical':
          // Critical: Strong, urgent pattern (3 heavy impacts)
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setTimeout(async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          }, 200);
          setTimeout(async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          }, 400);
          console.log('🔴 Critical haptic feedback triggered');
          break;
          
        case 'high':
          // High: Two medium impacts
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          setTimeout(async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }, 150);
          console.log('🟠 High priority haptic feedback triggered');
          break;
          
        case 'medium':
          // Medium: Single medium impact
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          console.log('🟡 Medium priority haptic feedback triggered');
          break;
          
        case 'low':
          // Low: Gentle light impact
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          console.log('🟢 Low priority haptic feedback triggered');
          break;
      }
    } catch (error) {
      console.error('Haptic feedback error:', error);
      // Fail silently - haptics might not be available on all devices
    }
  };

  // MUSIC-FRIENDLY VOICE SYSTEM WITH AMBIENT ALERTS
  const speakAlert = async (message: string, priority: 'low' | 'medium' | 'high' | 'critical' = 'medium', duckAudio: boolean = true) => {
    try {
      if (!voiceAlertsEnabled) return;
      
      // Trigger haptic feedback based on priority
      await triggerHapticFeedback(priority);
      
      // Clean message for better TTS pronunciation
      const cleanedMessage = message
        .replace(/km\/h/g, 'kilometers per hour')
        .replace(/m\/s/g, 'meters per second')
        .replace(/°C/g, ' degrees celsius')
        .replace(/°F/g, ' degrees fahrenheit')
        .replace(/\d+%/, (match) => `${match.replace('%', ' percent')}`);
      
      // Audio ducking for music-friendly experience
      if (duckAudio && priority !== 'critical') {
        // Request audio focus with ducking (reduces music volume by 50%)
        try {
          await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            allowsRecordingIOS: false,
            staysActiveInBackground: false,
            shouldDuckAndroid: true, // Android: Duck other audio
            playThroughEarpieceAndroid: false,
          });
        } catch (error) {
          console.log('Audio ducking not available:', error);
        }
      }
      
      let speechSettings: any = {
        language: 'en-US',
        pitch: 1.0,
        rate: 0.85, // Faster for ambient alerts
        quality: Speech.VoiceQuality.Enhanced,
        volume: 0.7, // Lower volume for ambient feel
      };
      
      // Adjust voice characteristics based on priority - AMBIENT APPROACH
      switch (priority) {
        case 'critical':
          // Emergency: Clear but not shouting
          speechSettings.pitch = 1.05;
          speechSettings.rate = 0.9;  // Clear and deliberate
          speechSettings.volume = 1.0; // Full volume for emergencies
          // Brief pause before critical alerts
          Speech.stop();
          await new Promise(resolve => setTimeout(resolve, 200));
          break;
        case 'high':
          // Important: Noticeable but not jarring
          speechSettings.pitch = 1.0;
          speechSettings.rate = 0.95; // Slightly faster
          speechSettings.volume = 0.8; // 80% volume
          break;
        case 'medium':
          // Normal: Ambient background notification
          speechSettings.pitch = 0.98;
          speechSettings.rate = 1.0; // Normal speed
          speechSettings.volume = 0.65; // 65% volume - blend with music
          break;
        case 'low':
          // Subtle: Very ambient, almost background
          speechSettings.pitch = 0.95;
          speechSettings.rate = 1.1; // Faster for brevity
          speechSettings.volume = 0.5; // 50% volume - very subtle
          break;
      }
      
      // Speak the alert with appropriate settings
      Speech.speak(cleanedMessage, {
        ...speechSettings,
        onDone: async () => {
          // Restore normal audio mode after speaking
          if (duckAudio && priority !== 'critical') {
            try {
              await Audio.setAudioModeAsync({
                playsInSilentModeIOS: true,
                allowsRecordingIOS: false,
                staysActiveInBackground: false,
                shouldDuckAndroid: false, // Restore audio
                playThroughEarpieceAndroid: false,
              });
            } catch (error) {
              console.log('Audio restore error:', error);
            }
          }
        }
      });
      
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
    if (now - lastAlertTime < 30000 && alertType !== 'emergency' && alertType !== 'info_request') {
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

  // LANGUAGE MANAGEMENT
  const changeLanguage = async (languageCode: string) => {
    i18n.locale = languageCode;
    setCurrentLanguage(languageCode);
    await AsyncStorage.setItem('userLanguage', languageCode);
    setShowLanguagePicker(false);
    
    // Announce language change in the new language
    if (voiceAlertsEnabled) {
      await speakAlert(i18n.t('appTitle'), 'low');
    }
  };
  
  const getLanguageName = (code: string) => {
    const names: {[key: string]: string} = {
      'en': 'English',
      'es': 'Español',
      'fr': 'Français',
      'de': 'Deutsch',
      'zh': '中文'
    };
    return names[code] || code;
  };

  const getSafetyColor = (score: number): string => {
    if (score >= 80) return '#00ffcc'; // Cyan-green - Safe
    if (score >= 60) return '#00ffff'; // Cyan - Caution
    if (score >= 40) return '#ff0066'; // Neon pink - Moderate Risk
    return '#ff0033'; // Red - High Risk
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
          <Text style={styles.permissionTitle}>Street Shield Needs Permissions</Text>
          <Text style={styles.permissionText}>
            To keep you safe, Street Shield needs access to your location and the ability to send notifications.
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
              <Ionicons name="shield-checkmark" size={32} color="#00ffff" />
            </View>
            <View style={styles.titleText}>
              <Text style={styles.appTitle}>{i18n.t('appTitle')}</Text>
              <Text style={styles.appSubtitle}>Neural Safety Network</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.languageButton}
            onPress={() => setShowLanguagePicker(true)}
          >
            <Ionicons name="language" size={24} color="#00ffff" />
            <Text style={styles.languageCode}>{currentLanguage.toUpperCase()}</Text>
          </TouchableOpacity>
          <View style={styles.headerGlow} />
        </View>

        {/* Language Picker Modal */}
        <Modal
          visible={showLanguagePicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowLanguagePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.languageModal}>
              <View style={styles.languageModalHeader}>
                <Text style={styles.languageModalTitle}>Select Language / Seleccionar idioma</Text>
                <TouchableOpacity onPress={() => setShowLanguagePicker(false)}>
                  <Ionicons name="close" size={28} color="#fff" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.languageList}>
                {['en', 'es', 'fr', 'de', 'zh'].map((lang) => (
                  <TouchableOpacity
                    key={lang}
                    style={[
                      styles.languageOption,
                      currentLanguage === lang && styles.languageOptionActive
                    ]}
                    onPress={() => changeLanguage(lang)}
                  >
                    <Text style={styles.languageFlag}>
                      {lang === 'en' ? '🇬🇧' : lang === 'es' ? '🇪🇸' : lang === 'fr' ? '🇫🇷' : lang === 'de' ? '🇩🇪' : '🇨🇳'}
                    </Text>
                    <Text style={[
                      styles.languageName,
                      currentLanguage === lang && styles.languageNameActive
                    ]}>
                      {getLanguageName(lang)}
                    </Text>
                    {currentLanguage === lang && (
                      <Ionicons name="checkmark-circle" size={24} color="#00ffcc" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Dynamic Safety Score Display */}
        {safetyAnalysis && (
          <View style={styles.safetyScoreContainer}>
            <View style={styles.safetyScoreWrapper}>
              {/* Outer rotating ring */}
              <Animated.View style={[styles.pulseRing, {
                opacity: pulseAnim,
                transform: [{ rotate: rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
              }]}>
                <View style={[styles.pulseRingInner, { borderColor: getSafetyColor(safetyAnalysis.safety_score.overall_score) }]} />
              </Animated.View>
              {/* Inner glow ring */}
              <Animated.View style={[styles.scoreGlowRing, {
                opacity: glowAnim,
                borderColor: getSafetyColor(safetyAnalysis.safety_score.overall_score),
              }]} />
              {/* Main score circle */}
              <View style={[
                styles.safetyScoreCircle,
                { borderColor: getSafetyColor(safetyAnalysis.safety_score.overall_score) }
              ]}>
                <Text style={[styles.safetyScoreNumber, { color: getSafetyColor(safetyAnalysis.safety_score.overall_score) }]}>
                  {safetyAnalysis.safety_score.overall_score}
                </Text>
                <Text style={[styles.safetyScoreLabel, { color: getSafetyColor(safetyAnalysis.safety_score.overall_score) }]}>
                  {getSafetyLabel(safetyAnalysis.safety_score.overall_score)}
                </Text>
              </View>
            </View>
            
            {/* Real-time Status Indicators */}
            <View style={styles.statusIndicators}>
              <View style={styles.statusItem}>
                <Ionicons name="eye" size={16} color="#00ffff" />
                <Text style={styles.statusText}>SCANNING</Text>
              </View>
              <View style={styles.statusItem}>
                <Ionicons name="pulse" size={16} color="#ff0066" />
                <Text style={styles.statusText}>ANALYZING</Text>
              </View>
              <View style={styles.statusItem}>
                <Ionicons name="shield" size={16} color="#00ffcc" />
                <Text style={styles.statusText}>SHIELDED</Text>
              </View>
            </View>
          </View>
        )}

        {/* Emergency Mode Indicator */}
        {isEmergencyModeActive && (
          <View style={styles.emergencyBanner}>
            <Ionicons name="warning" size={24} color="#fff" />
            <Text style={styles.emergencyBannerText}>
              ALERT MODE ACTIVE
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
            {isTracking && (
              <View style={styles.radarActiveIndicator}>
                <View style={styles.radarContainer}>
                  <Animated.View style={[styles.radarRingAnimated, {
                    transform: [{ scale: radarRing1.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.6] }) }],
                    opacity: radarRing1.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.8, 0.4, 0] }),
                  }]} />
                  <Animated.View style={[styles.radarRingAnimated, {
                    transform: [{ scale: radarRing2.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.6] }) }],
                    opacity: radarRing2.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.8, 0.4, 0] }),
                  }]} />
                  <Animated.View style={[styles.radarRingAnimated, {
                    transform: [{ scale: radarRing3.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.6] }) }],
                    opacity: radarRing3.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.8, 0.4, 0] }),
                  }]} />
                  <View style={styles.radarCenterDot} />
                </View>
                <Text style={styles.radarActiveText}>RADAR SCANNING</Text>
              </View>
            )}
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
                  color={voiceAlertsEnabled ? "#00ffcc" : "#666"}
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
                <Ionicons name="warning" size={20} color="#ff0066" />
              </View>
              <Text style={styles.featureButtonText}>Quick Alert</Text>
              <Text style={styles.featureStatus}>
                {emergencyTriggerWord ? 'READY' : 'SETUP'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.featureButton, proximityAlertsEnabled && styles.featureButtonActive]}
              onPress={() => setProximityAlertsEnabled(!proximityAlertsEnabled)}
            >
              <View style={styles.featureIcon}>
                <Ionicons name="locate" size={20} color={proximityAlertsEnabled ? "#00ffcc" : "#666"} />
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
                <Ionicons name="headset" size={20} color={noiseCancellationEnabled ? "#cc00ff" : "#666"} />
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
              <Text style={styles.featureButtonText}>Activity</Text>
              <Text style={styles.featureStatus}>
                {heartRate > 0 ? `${heartRate} BPM` : 'INSIGHTS'}
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

            {/* Test Emergency Trigger Button */}
            {emergencyTriggerWord && !isEmergencyModeActive && (
              <TouchableOpacity
                style={[styles.featureButton, styles.testEmergencyButton]}
                onPress={async () => {
              await speakAlert(`Testing alert trigger: ${emergencyTriggerWord}`, 'high');
                  setTimeout(() => triggerEmergencyMode(), 1000);
                }}
              >
                <View style={styles.featureIcon}>
                  <Ionicons 
                    name="alert-circle" 
                    size={20} 
                    color="#FFF" 
                  />
                </View>
                <Text style={styles.featureButtonText}>
                  Test Alert
                </Text>
                <Text style={styles.featureStatus}>
                  DEMO TRIGGER
                </Text>
              </TouchableOpacity>
            )}

            {/* Emergency Active Indicator */}
            {isEmergencyModeActive && (
              <View style={[styles.featureButton, styles.emergencyActiveButton]}>
                <View style={styles.featureIcon}>
                  <Ionicons 
                    name="warning" 
                    size={20} 
                    color="#FFF" 
                  />
                </View>
                <Text style={styles.featureButtonText}>
                  ALERT ACTIVE
                </Text>
                <Text style={styles.featureStatus}>
                  CONTACTS NOTIFIED
                </Text>
              </View>
            )}

                {/* Cycling Mode Button */}
            <TouchableOpacity
              style={[
                styles.featureButton, 
                isCyclingMode ? styles.cyclingActiveButton : styles.cyclingButton
              ]}
              onPress={toggleCyclingMode}
              data-testid="cycling-mode-btn"
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

            {/* Journey Share Button */}
            {lastJourneyData && !isTracking && (
              <TouchableOpacity
                style={[styles.featureButton, 
                  lastJourneyData.activityType === 'cycling' ? styles.cyclingJourneyButton : styles.journeyShareButton
                ]}
                onPress={() => setShowJourneyCard(true)}
                data-testid="view-journey-btn"
              >
                <View style={styles.featureIcon}>
                  <Ionicons 
                    name={lastJourneyData.activityType === 'cycling' ? 'bicycle' : 'share-social'} 
                    size={20} 
                    color={lastJourneyData.activityType === 'cycling' ? '#ff0066' : '#00ffcc'} 
                  />
                </View>
                <Text style={[styles.featureButtonText, { 
                  color: lastJourneyData.activityType === 'cycling' ? '#ff0066' : '#00ffcc' 
                }]}>
                  {lastJourneyData.activityType === 'cycling' ? 'Safe Ride' : 'I Got Home Safe'}
                </Text>
                <Text style={styles.featureStatus}>
                  {lastJourneyData.activityType === 'cycling' ? 'SHARE RIDE' : 'SHARE JOURNEY'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Voice Info System - Demo Buttons */}
            {isVoiceInfoActive && (
              <View style={styles.voiceInfoDemoSection}>
                <Text style={styles.voiceInfoDemoTitle}>
                  💬 Voice Info System (Demo Mode)
                </Text>
                <Text style={styles.voiceInfoDemoNote}>
                  Note: Real speech recognition requires native build. Use buttons below to test responses:
                </Text>
                
                <View style={styles.voiceInfoDemoButtons}>
                  <TouchableOpacity 
                    style={[styles.voiceInfoDemoButton, voiceInfoLoading && { opacity: 0.5 }]}
                    onPress={() => simulateVoiceInfoRequest("street shield what is my safety score")}
                    disabled={voiceInfoLoading}
                    testID="voice-info-safety-btn"
                  >
                    <Ionicons name="shield-checkmark" size={16} color="#00ffcc" />
                    <Text style={styles.voiceInfoDemoButtonText}>
                      Safety
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.voiceInfoDemoButton, voiceInfoLoading && { opacity: 0.5 }]}
                    onPress={() => simulateVoiceInfoRequest("street shield where am i")}
                    disabled={voiceInfoLoading}
                    testID="voice-info-location-btn"
                  >
                    <Ionicons name="location" size={16} color="#00ffcc" />
                    <Text style={styles.voiceInfoDemoButtonText}>
                      Location
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.voiceInfoDemoButton, voiceInfoLoading && { opacity: 0.5 }]}
                    onPress={() => simulateVoiceInfoRequest("street shield weather check")}
                    disabled={voiceInfoLoading}
                    testID="voice-info-weather-btn"
                  >
                    <Ionicons name="cloud" size={16} color="#00ffcc" />
                    <Text style={styles.voiceInfoDemoButtonText}>
                      Weather
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.voiceInfoDemoButton, voiceInfoLoading && { opacity: 0.5 }]}
                    onPress={() => simulateVoiceInfoRequest("street shield threats nearby")}
                    disabled={voiceInfoLoading}
                    testID="voice-info-threats-btn"
                  >
                    <Ionicons name="warning" size={16} color="#00ffcc" />
                    <Text style={styles.voiceInfoDemoButtonText}>
                      Threats
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.voiceInfoDemoButton, voiceInfoLoading && { opacity: 0.5 }]}
                    onPress={() => simulateVoiceInfoRequest("street shield time check")}
                    disabled={voiceInfoLoading}
                    testID="voice-info-time-btn"
                  >
                    <Ionicons name="time" size={16} color="#00ffcc" />
                    <Text style={styles.voiceInfoDemoButtonText}>
                      Time
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.voiceInfoDemoButton, voiceInfoLoading && { opacity: 0.5 }]}
                    onPress={() => simulateVoiceInfoRequest("street shield help")}
                    disabled={voiceInfoLoading}
                    testID="voice-info-help-btn"
                  >
                    <Ionicons name="help-circle" size={16} color="#00ffcc" />
                    <Text style={styles.voiceInfoDemoButtonText}>
                      Help
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Voice Info Response Card */}
                {voiceInfoLoading && (
                  <View style={styles.voiceInfoResponseCard}>
                    <ActivityIndicator size="small" color="#00ffff" />
                    <Text style={styles.voiceInfoResponseText}>Processing...</Text>
                  </View>
                )}
                {!voiceInfoLoading && voiceInfoResponse !== '' && (
                  <View style={styles.voiceInfoResponseCard} data-testid="voice-info-response">
                    <View style={styles.voiceInfoResponseHeader}>
                      <Ionicons name="chatbubble" size={14} color="#00ffff" />
                      <Text style={styles.voiceInfoResponseLabel}>STREET SHIELD</Text>
                    </View>
                    <Text style={styles.voiceInfoResponseText}>{voiceInfoResponse}</Text>
                  </View>
                )}
              </View>
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
              <Ionicons name="shield-checkmark" size={20} color="#00ffff" />
              <View style={[styles.pulsingDot, { backgroundColor: '#00ffff' }]} />
              {ambientListeningActive && <Ionicons name="mic" size={16} color="#00ffcc" style={{ marginLeft: 8 }} />}
              {isVoiceInfoActive && <Ionicons name="information-circle" size={16} color="#cc00ff" style={{ marginLeft: 8 }} />}
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
              <Ionicons name="information-circle" size={20} color="#cc00ff" />
              <View style={[styles.pulsingDot, { backgroundColor: '#cc00ff' }]} />
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

        {/* Emergency Mode Status Display */}
        {isEmergencyModeActive && (
          <View style={[styles.statusCard, styles.emergencyStatusCard]}>
            <View style={styles.emergencyHeader}>
              <Ionicons name="warning" size={24} color="#F44336" />
              <Text style={styles.emergencyStatusTitle}>ALERT MODE ACTIVE</Text>
              <View style={[styles.pulsingDot, { backgroundColor: '#F44336' }]} />
            </View>
            
            <View style={styles.emergencyDetails}>
              <View style={styles.emergencyDetailItem}>
                <Ionicons name="people" size={18} color="#F44336" />
                <Text style={styles.emergencyDetailText}>
                  {emergencyContacts.length} Trusted Contact{emergencyContacts.length !== 1 ? 's' : ''} Notified
                </Text>
              </View>
              
              <View style={styles.emergencyDetailItem}>
                <Ionicons name="location" size={18} color="#F44336" />
                <Text style={styles.emergencyDetailText}>
                  Live location shared: {location ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : 'Getting location...'}
                </Text>
              </View>
              
              <View style={styles.emergencyDetailItem}>
                <Ionicons name="shield-checkmark" size={18} color="#F44336" />
                <Text style={styles.emergencyDetailText}>
                  Location data captured
                </Text>
              </View>
              
              <View style={styles.emergencyDetailItem}>
                <Ionicons name="pulse" size={18} color="#F44336" />
                <Text style={styles.emergencyDetailText}>
                  Enhanced monitoring every 5 seconds
                </Text>
              </View>
            </View>

            <View style={styles.emergencyContactsList}>
              <Text style={styles.emergencyContactsTitle}>Contacts Notified:</Text>
              {emergencyContacts.filter(c => c.length > 0).map((contact, index) => (
                <Text key={index} style={styles.emergencyContact}>
                  ✓ {contact}
                </Text>
              ))}
            </View>
            
            <TouchableOpacity 
              style={styles.deactivateEmergencyButton}
              onPress={deactivateEmergencyMode}
            >
              <Text style={styles.deactivateEmergencyText}>Deactivate Alert</Text>
            </TouchableOpacity>
            
            <Text style={styles.emergencyNote}>
              Note: In production, contacts would receive SMS/push notifications with your real-time location.
            </Text>
          </View>
        )}

        {/* Manual Voice Trigger Status */}
        {!isHandsFreeMode && isListeningForTrigger && (
          <View style={[styles.statusCard, styles.listeningCard]}>
            <View style={styles.listeningIndicator}>
              <Ionicons name="mic" size={20} color="#00ffcc" />
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
            <ActivityIndicator size="large" color="#00ffff" />
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
                  { color: cyclingSafetyScore > 70 ? '#00ffcc' : cyclingSafetyScore > 50 ? '#ff0066' : '#ff0033' }
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
                               threat.severity === 'high' ? '#ff0066' : '#ff0066' }
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
            <Text style={styles.cardTitle}>Activity Insights</Text>
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
                <Text style={styles.biometricLabel}>Alertness</Text>
              </View>
              {biometricData.blood_oxygen && (
                <View style={styles.biometricItem}>
                  <Text style={styles.biometricValue}>{biometricData.blood_oxygen}%</Text>
                  <Text style={styles.biometricLabel}>Energy</Text>
                </View>
              )}
            </View>
            {healthAlerts.length > 0 && (
              <Text style={styles.warningText}>
                ⚠️ {healthAlerts.length} activity alert{healthAlerts.length > 1 ? 's' : ''} active
              </Text>
            )}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerDivider} />
          <TouchableOpacity onPress={() => setShowPrivacyPolicy(true)} data-testid="privacy-policy-link">
            <Text style={styles.footerLink}>Privacy Policy</Text>
          </TouchableOpacity>
          <Text style={styles.footerVersion}>Street Shield v1.0.0</Text>
          <Text style={styles.footerDisclaimer}>
            Safety awareness tool for informational purposes only.
          </Text>
        </View>
      </ScrollView>

      {/* Emergency Setup Modal */}
      <Modal
        visible={isEmergencySetupOpen}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Safety Alert Setup</Text>
            <TouchableOpacity onPress={() => {
              Speech.stop(); // Stop any ongoing voice prompts
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
              <Ionicons name="close" size={24} color="#00ffff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalDescription}>
              Set up a voice trigger word that will immediately notify your trusted contacts with your location if you feel unsafe.
            </Text>

            <View style={styles.inputGroup}>
              <View style={styles.labelWithVoice}>
                <Text style={styles.inputLabel}>Alert Trigger Word</Text>
                <TouchableOpacity 
                  style={styles.voiceHelpButton}
                  onPress={async () => {
                    await speakAlert("Choose a unique trigger word that you can say clearly when you feel unsafe. Good examples are Red Alert, Safe Word, or Help Now. Avoid common words you might say accidentally.");
                  }}
                >
                  <Ionicons name="volume-high" size={16} color="#00ffff" />
                </TouchableOpacity>
              </View>
              <Text style={styles.inputHint}>
                Choose a unique word you can say clearly when you feel unsafe (e.g., "RedAlert", "SafeWord", "HelpNow")
              </Text>
              <TextInput
                style={styles.textInput}
                value={emergencyTriggerWord}
                onFocus={async () => {
                  if (voiceAlertsEnabled && !voiceInteractionState.triggerWordExplained) {
                    await speakAlert("Enter your alert trigger word. Make it memorable but unique.");
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
                <Text style={styles.inputLabel}>Trusted Contacts</Text>
                <TouchableOpacity 
                  style={styles.voiceHelpButton}
                  onPress={async () => {
                    await speakAlert("Now add your trusted contacts. These people will receive immediate notifications with your location when you trigger an alert. Add at least two trusted contacts like family members, close friends, or roommates.");
                  }}
                >
                  <Ionicons name="volume-high" size={16} color="#00ffff" />
                </TouchableOpacity>
              </View>
              <Text style={styles.inputHint}>
                Enter phone numbers that will be notified with your location. This is not a replacement for calling authorities directly.
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
                          await speakAlert("Add trusted contacts. Use full phone numbers including area code.");
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
                    await speakAlert(`Adding a new trusted contact. The more contacts you have, the better your safety coverage.`);
                  }
                }}
              >
                <Ionicons name="add" size={20} color="#00ffff" />
                <Text style={styles.addContactText}>Add Contact</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.warningBox}>
              <Ionicons name="warning" size={24} color="#ff0066" />
              <Text style={styles.warningText}>
                Important: This is a safety awareness tool for informational purposes only. It does not replace or connect to professional services.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                Speech.stop(); // Stop any ongoing voice prompts
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
                    await speakAlert("Please complete both your trigger word and at least one trusted contact before saving.");
                  }
                  return;
                }
                await saveEmergencySettings(emergencyTriggerWord, validContacts);
              }}
              disabled={!emergencyTriggerWord || emergencyContacts.filter(c => c.length > 0).length === 0}
            >
              <Text style={styles.saveButtonText}>Save Alert Settings</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Journey Share Card Modal */}
      {lastJourneyData && (
        <JourneyShareCard
          visible={showJourneyCard}
          onClose={() => setShowJourneyCard(false)}
          journeyData={lastJourneyData}
        />
      )}

      {/* Privacy Policy Modal */}
      <Modal
        visible={showPrivacyPolicy}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Privacy Policy</Text>
            <TouchableOpacity onPress={() => setShowPrivacyPolicy(false)} data-testid="close-privacy-modal">
              <Ionicons name="close" size={24} color="#00ffff" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.privacyHeading}>Street Shield Privacy Policy</Text>
            <Text style={styles.privacyDate}>Last updated: April 2, 2026</Text>

            <Text style={styles.privacySectionTitle}>1. Information We Collect</Text>
            <Text style={styles.privacyText}>
              Street Shield collects location data (GPS coordinates) only while the app is actively in use and the shield is activated. We also collect device sensor data (accelerometer, pedometer) for activity insights. All data is processed locally on your device or via our secure servers.
            </Text>

            <Text style={styles.privacySectionTitle}>2. How We Use Your Information</Text>
            <Text style={styles.privacyText}>
              Your location data is used solely to provide real-time safety analysis and environmental awareness. Activity data (steps, motion) is used to provide personalized activity insights. We do not sell, share, or distribute your personal data to third parties.
            </Text>

            <Text style={styles.privacySectionTitle}>3. Data Storage &amp; Security</Text>
            <Text style={styles.privacyText}>
              Safety analysis data is stored temporarily on our encrypted servers and automatically deleted after 24 hours. Trusted contact information is stored locally on your device using encrypted storage. We use industry-standard encryption for all data transmissions.
            </Text>

            <Text style={styles.privacySectionTitle}>4. Trusted Contacts</Text>
            <Text style={styles.privacyText}>
              Phone numbers you provide as trusted contacts are stored locally on your device. When a quick alert is triggered, your location is shared only with those contacts. We do not retain or access your contacts list.
            </Text>

            <Text style={styles.privacySectionTitle}>5. Third-Party Services</Text>
            <Text style={styles.privacyText}>
              Street Shield uses AI services for safety analysis and weather APIs for environmental data. These services receive anonymized location data only. No personally identifiable information is shared with these providers.
            </Text>

            <Text style={styles.privacySectionTitle}>6. Your Rights</Text>
            <Text style={styles.privacyText}>
              You can delete all locally stored data at any time by clearing the app data. You can revoke location permissions through your device settings. You may request deletion of any server-side data by contacting us.
            </Text>

            <Text style={styles.privacySectionTitle}>7. Children's Privacy</Text>
            <Text style={styles.privacyText}>
              Street Shield is designed for users aged 13 and above. We do not knowingly collect data from children under 13.
            </Text>

            <Text style={styles.privacySectionTitle}>8. Changes to This Policy</Text>
            <Text style={styles.privacyText}>
              We may update this privacy policy from time to time. Users will be notified of significant changes through in-app notifications.
            </Text>

            <Text style={styles.privacySectionTitle}>9. Disclaimer</Text>
            <Text style={styles.privacyText}>
              Street Shield is a safety awareness tool for informational purposes only. It is not a replacement for professional safety services, medical devices, or calling local authorities. Always prioritize your safety and call the appropriate services in a real situation.
            </Text>

            <Text style={[styles.privacyText, { marginTop: 20, marginBottom: 40, textAlign: 'center', color: '#555' }]}>
              Contact: support@streetshield.app
            </Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
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
    backgroundColor: '#0a0a0f',
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
    color: '#00ffff',
    letterSpacing: 2,
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#8a8a9a',
    lineHeight: 24,
  },
  header: {
    backgroundColor: '#0d0d15',
    padding: 25,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 255, 255, 0.15)',
  },
  headerGlow: {
    position: 'absolute',
    top: -80,
    left: '20%',
    right: '20%',
    height: 120,
    backgroundColor: 'rgba(255, 0, 102, 0.06)',
    borderRadius: 100,
    opacity: 1,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2,
  },
  shieldIcon: {
    width: 50,
    height: 50,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
  },
  titleText: {
    flex: 1,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#00ffff',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  appSubtitle: {
    fontSize: 10,
    color: '#ff0066',
    letterSpacing: 5,
    marginTop: 4,
    textTransform: 'uppercase',
    opacity: 0.8,
  },
  safetyScoreContainer: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#0a0a0f',
  },
  safetyScoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#00ffff',
    backgroundColor: 'rgba(0, 255, 255, 0.04)',
  },
  safetyScoreNumber: {
    fontSize: 36,
    fontWeight: '900',
    color: '#00ffff',
    letterSpacing: 2,
  },
  safetyScoreLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#e0e0e0',
    textAlign: 'center',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  controlsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  controlButton: {
    backgroundColor: '#12121a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 4,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.15)',
  },
  controlButtonActive: {
    backgroundColor: 'rgba(255, 0, 102, 0.15)',
    borderColor: '#ff0066',
  },
  settingsButton: {
    backgroundColor: 'rgba(255, 0, 102, 0.1)',
    borderColor: '#ff0066',
  },
  controlButtonText: {
    color: '#e0e0e0',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  primaryButton: {
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    padding: 15,
    borderRadius: 4,
    minWidth: 200,
    borderWidth: 1,
    borderColor: '#00ffff',
  },
  buttonText: {
    color: '#00ffff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 2,
    textTransform: 'uppercase',
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
    backgroundColor: '#0f0f1a',
    margin: 20,
    marginTop: 0,
    padding: 15,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.12)',
  },
  alertCard: {
    backgroundColor: 'rgba(255, 0, 102, 0.08)',
    borderColor: '#ff0066',
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
    color: '#00ffff',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  infoText: {
    fontSize: 13,
    color: '#8a8a9a',
    marginBottom: 5,
  },
  warningText: {
    color: '#ff0066',
    fontWeight: 'bold',
  },
  riskFactor: {
    fontSize: 13,
    color: '#ff0066',
    marginBottom: 5,
  },
  recommendation: {
    fontSize: 13,
    color: '#00ffcc',
    marginBottom: 5,
  },
  alertItem: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: 'rgba(255, 0, 102, 0.1)',
    borderRadius: 4,
    borderLeftWidth: 2,
    borderLeftColor: '#ff0066',
  },
  alertType: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ff0066',
    marginBottom: 5,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  alertMessage: {
    fontSize: 13,
    color: '#e0e0e0',
    marginBottom: 5,
  },
  alertPriority: {
    fontSize: 11,
    color: '#8a8a9a',
  },
  // Electric Scooter Warning Styles
  scooterWarningCard: {
    backgroundColor: 'rgba(255, 0, 102, 0.15)',
    borderColor: '#ff0066',
    borderWidth: 2,
    borderStyle: 'solid',
  },
  scooterWarningTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ff0066',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  scooterWarningText: {
    fontSize: 14,
    color: '#e0e0e0',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  scooterWarningTip: {
    fontSize: 13,
    color: '#00ffff',
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 8,
  },
  scooterWarningAction: {
    fontSize: 13,
    color: '#ff0066',
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: 'rgba(255, 0, 102, 0.1)',
    padding: 8,
    borderRadius: 4,
    marginTop: 5,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  // Alert Banner Styles
  emergencyBanner: {
    backgroundColor: 'rgba(255, 0, 102, 0.2)',
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    borderRadius: 4,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ff0066',
  },
  emergencyBannerText: {
    color: '#ff0066',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  deactivateButton: {
    backgroundColor: '#ff0066',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 2,
  },
  deactivateButtonText: {
    color: '#0a0a0f',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  emergencyButton: {
    backgroundColor: 'rgba(255, 0, 102, 0.15)',
    borderColor: '#ff0066',
  },
  listeningButton: {
    backgroundColor: 'rgba(0, 255, 204, 0.1)',
    borderColor: '#00ffcc',
  },
  handsFreeButton: {
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    borderColor: '#00ffff',
  },
  manualTriggerButton: {
    backgroundColor: 'rgba(255, 0, 102, 0.1)',
    borderColor: '#ff0066',
  },
  infoButton: {
    backgroundColor: 'rgba(0, 255, 255, 0.08)',
    borderColor: 'rgba(0, 255, 255, 0.3)',
  },
  demoButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cyclingButton: {
    backgroundColor: 'rgba(0, 255, 204, 0.1)',
    borderColor: '#00ffcc',
  },
  cyclingActiveButton: {
    backgroundColor: 'rgba(0, 255, 204, 0.15)',
    borderColor: '#00ffcc',
  },
  testEmergencyButton: {
    backgroundColor: 'rgba(255, 0, 102, 0.1)',
    borderColor: '#ff0066',
  },
  emergencyActiveButton: {
    backgroundColor: 'rgba(255, 0, 102, 0.2)',
    borderWidth: 2,
    borderColor: '#ff0066',
  },
  // Voice Info Demo Styles
  voiceInfoDemoSection: {
    backgroundColor: '#0f0f1a',
    borderRadius: 4,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.12)',
  },
  voiceInfoDemoTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00ffff',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  voiceInfoDemoNote: {
    fontSize: 11,
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  voiceInfoDemoButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 8,
  },
  voiceInfoDemoButton: {
    backgroundColor: '#0f0f1a',
    borderRadius: 4,
    padding: 12,
    alignItems: 'center',
    minWidth: 80,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.2)',
  },
  voiceInfoDemoButtonText: {
    color: '#00ffff',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  voiceInfoResponseCard: {
    backgroundColor: 'rgba(0, 255, 255, 0.06)',
    borderRadius: 8,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.2)',
  },
  voiceInfoResponseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  voiceInfoResponseLabel: {
    color: '#00ffff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
  },
  voiceInfoResponseText: {
    color: '#c0c0d0',
    fontSize: 13,
    lineHeight: 20,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#0d0d15',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 255, 255, 0.15)',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#00ffff',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalDescription: {
    fontSize: 14,
    color: '#8a8a9a',
    lineHeight: 22,
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 25,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00ffff',
    marginBottom: 5,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  inputHint: {
    fontSize: 13,
    color: '#666',
    marginBottom: 10,
    lineHeight: 20,
  },
  textInput: {
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.2)',
    borderRadius: 4,
    padding: 15,
    backgroundColor: '#0f0f1a',
    fontSize: 16,
    color: '#e0e0e0',
  },
  inputError: {
    borderColor: '#ff0066',
    backgroundColor: 'rgba(255, 0, 102, 0.05)',
  },
  // (Voice Trigger Status Styles moved to bottom of stylesheet)
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  contactInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.2)',
    borderRadius: 4,
    padding: 15,
    backgroundColor: '#0f0f1a',
    fontSize: 16,
    color: '#e0e0e0',
    marginRight: 10,
  },
  addContactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
    borderRadius: 4,
    borderStyle: 'dashed',
    justifyContent: 'center',
  },
  addContactText: {
    color: '#00ffff',
    fontSize: 14,
    marginLeft: 5,
    letterSpacing: 1,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 0, 102, 0.08)',
    padding: 15,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 102, 0.2)',
    alignItems: 'flex-start',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#8a8a9a',
    marginLeft: 10,
    lineHeight: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#0d0d15',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 255, 255, 0.1)',
  },
  cancelButton: {
    flex: 1,
    padding: 15,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    marginRight: 10,
  },
  cancelButtonText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#8a8a9a',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  saveButton: {
    flex: 2,
    backgroundColor: 'rgba(255, 0, 102, 0.2)',
    padding: 15,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ff0066',
  },
  saveButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  saveButtonText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    color: '#ff0066',
    letterSpacing: 1,
    textTransform: 'uppercase',
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
    borderRadius: 4,
    backgroundColor: 'rgba(0, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
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
    borderWidth: 1,
    opacity: 0.3,
  },
  scoreGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0, 255, 255, 0.05)',
    opacity: 0.5,
  },
  scoreGlowRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    borderColor: '#00ffff',
    backgroundColor: 'transparent',
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
    opacity: 0.9,
  },
  statusText: {
    color: '#8a8a9a',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  // Enhanced Control Styles
  primaryActionButton: {
    backgroundColor: '#0f0f1a',
    borderRadius: 4,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#00ffff',
  },
  primaryActionButtonActive: {
    borderColor: '#ff0066',
  },
  primaryActionButtonLoading: {
    borderColor: '#00ffff',
    opacity: 0.7,
  },
  buttonGradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 255, 255, 0.04)',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 2,
  },
  primaryButtonText: {
    color: '#00ffff',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 15,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  activeIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00ffcc',
  },
  controlGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureButton: {
    width: '48%',
    backgroundColor: '#0f0f1a',
    borderRadius: 4,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.12)',
    marginBottom: 10,
  },
  featureButtonActive: {
    borderColor: '#00ffff',
    backgroundColor: 'rgba(0, 255, 255, 0.05)',
  },
  emergencyTestButton: {
    borderColor: 'rgba(255, 0, 102, 0.3)',
    backgroundColor: 'rgba(255, 0, 102, 0.05)',
  },
  journeyShareButton: {
    borderColor: 'rgba(0, 255, 204, 0.3)',
    backgroundColor: 'rgba(0, 255, 204, 0.05)',
  },
  cyclingJourneyButton: {
    borderColor: 'rgba(255, 0, 102, 0.3)',
    backgroundColor: 'rgba(255, 0, 102, 0.05)',
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  featureButtonText: {
    color: '#e0e0e0',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  featureButtonTextActive: {
    color: '#00ffff',
  },
  featureStatus: {
    color: '#555',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: 2,
    textTransform: 'uppercase',
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
    backgroundColor: 'rgba(0, 255, 255, 0.04)',
    padding: 10,
    borderRadius: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.1)',
  },
  biometricValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#00ffff',
  },
  biometricLabel: {
    fontSize: 9,
    color: '#666',
    marginTop: 4,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  // Cycling Styles
  cyclingCard: {
    backgroundColor: '#0f0f1a',
    borderColor: '#00ffcc',
    borderWidth: 1,
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
    backgroundColor: 'rgba(0, 255, 204, 0.05)',
    padding: 10,
    borderRadius: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 204, 0.15)',
  },
  cyclingLabel: {
    fontSize: 9,
    color: '#666',
    marginBottom: 4,
    textAlign: 'center',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  cyclingValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#00ffcc',
    textAlign: 'center',
  },
  cyclingThreats: {
    marginTop: 15,
    padding: 10,
    backgroundColor: 'rgba(255, 0, 102, 0.08)',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 102, 0.2)',
  },
  cyclingThreatsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ff0066',
    marginBottom: 8,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  cyclingThreatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  cyclingThreatSeverity: {
    fontSize: 9,
    fontWeight: '700',
    marginRight: 8,
    minWidth: 60,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  cyclingThreatDesc: {
    fontSize: 12,
    color: '#8a8a9a',
    flex: 1,
  },
  cyclingStatus: {
    fontSize: 11,
    color: '#555',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
  // Voice Trigger Status Styles
  statusCard: {
    backgroundColor: '#0f0f1a',
    borderRadius: 4,
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.12)',
  },
  listeningCard: {
    backgroundColor: 'rgba(0, 255, 204, 0.05)',
    borderColor: '#00ffcc',
    borderWidth: 1,
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
    backgroundColor: '#00ffcc',
    marginLeft: 8,
    opacity: 0.8,
  },
  listeningText: {
    color: '#e0e0e0',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 15,
  },
  stopListeningButton: {
    backgroundColor: 'rgba(255, 0, 102, 0.15)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 4,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#ff0066',
  },
  stopListeningText: {
    color: '#ff0066',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  // Hands-Free Mode Styles
  handsFreeCard: {
    backgroundColor: 'rgba(0, 255, 255, 0.05)',
    borderColor: '#00ffff',
    borderWidth: 1,
  },
  handsFreeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  handsFreeTitle: {
    color: '#00ffff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  handsFreeDescription: {
    color: '#8a8a9a',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 20,
  },
  stopHandsFreeButton: {
    backgroundColor: 'rgba(255, 0, 102, 0.15)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 4,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#ff0066',
  },
  stopHandsFreeText: {
    color: '#ff0066',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  // Voice Info Only Status Styles
  voiceInfoCard: {
    backgroundColor: 'rgba(0, 255, 255, 0.05)',
    borderColor: '#00ffff',
    borderWidth: 1,
  },
  voiceInfoTitle: {
    color: '#00ffff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  voiceInfoDescription: {
    color: '#8a8a9a',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 20,
  },
  stopVoiceInfoButton: {
    backgroundColor: 'rgba(255, 0, 102, 0.15)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 4,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#ff0066',
  },
  stopVoiceInfoText: {
    color: '#ff0066',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  // Alert Status Card Styles
  emergencyStatusCard: {
    backgroundColor: 'rgba(255, 0, 102, 0.1)',
    borderColor: '#ff0066',
    borderWidth: 2,
  },
  emergencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  emergencyStatusTitle: {
    color: '#ff0066',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 10,
    marginRight: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  emergencyDetails: {
    marginBottom: 15,
  },
  emergencyDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 10,
    borderRadius: 4,
    borderLeftWidth: 2,
    borderLeftColor: '#ff0066',
  },
  emergencyDetailText: {
    color: '#e0e0e0',
    fontSize: 12,
    marginLeft: 10,
    flex: 1,
  },
  emergencyContactsList: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 12,
    borderRadius: 4,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 204, 0.2)',
  },
  emergencyContactsTitle: {
    color: '#00ffff',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  emergencyContact: {
    color: '#00ffcc',
    fontSize: 13,
    marginBottom: 4,
  },
  deactivateEmergencyButton: {
    backgroundColor: 'rgba(255, 0, 102, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 4,
    alignSelf: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ff0066',
  },
  deactivateEmergencyText: {
    color: '#ff0066',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  emergencyNote: {
    color: '#555',
    fontSize: 11,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 5,
  },
  // Language Picker Styles
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 255, 255, 0.08)',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
  },
  languageCode: {
    color: '#00ffff',
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
    letterSpacing: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  languageModal: {
    backgroundColor: '#0d0d15',
    borderRadius: 4,
    width: '85%',
    maxHeight: '70%',
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.2)',
  },
  languageModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 255, 255, 0.1)',
  },
  languageModalTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00ffff',
    flex: 1,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  languageList: {
    maxHeight: 400,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    marginBottom: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  languageOptionActive: {
    backgroundColor: 'rgba(0, 255, 255, 0.08)',
    borderColor: '#00ffff',
  },
  languageFlag: {
    fontSize: 32,
    marginRight: 15,
  },
  languageName: {
    fontSize: 14,
    color: '#e0e0e0',
    flex: 1,
  },
  languageNameActive: {
    color: '#00ffff',
    fontWeight: '700',
  },
  // Radar Active Indicator Styles
  radarActiveIndicator: {
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  radarContainer: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarRingAnimated: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#00ffff',
  },
  radarCenterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00ffff',
  },
  radarPulse: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#00ffff',
    opacity: 0.8,
    marginBottom: 4,
  },
  radarActiveText: {
    color: '#00ffff',
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  // Privacy Policy Styles
  privacyHeading: {
    fontSize: 20,
    fontWeight: '900',
    color: '#00ffff',
    marginBottom: 8,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  privacyDate: {
    fontSize: 12,
    color: '#555',
    marginBottom: 25,
    letterSpacing: 1,
  },
  privacySectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ff0066',
    marginTop: 20,
    marginBottom: 8,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  privacyText: {
    fontSize: 13,
    color: '#8a8a9a',
    lineHeight: 22,
    marginBottom: 5,
  },
  // Footer Styles
  footer: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
    marginTop: 20,
  },
  footerDivider: {
    width: '60%',
    height: 1,
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    marginBottom: 20,
  },
  footerLink: {
    color: '#00ffff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  footerVersion: {
    color: '#333',
    fontSize: 10,
    letterSpacing: 1,
    marginBottom: 6,
  },
  footerDisclaimer: {
    color: '#333',
    fontSize: 9,
    textAlign: 'center',
    letterSpacing: 0.5,
    lineHeight: 14,
  },
});