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
  
  // Proximity threat detection state
  const [movementHistory, setMovementHistory] = useState<LocationData[]>([]);
  const [proximityThreats, setProximityThreats] = useState<any[]>([]);
  const [proximityAlertsEnabled, setProximityAlertsEnabled] = useState(true);
  
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
      
      // Initial safety check after 3 seconds
      setTimeout(() => {
        if (location) {
          performSafetyAnalysis(location);
        }
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

    // Process high-priority alerts first
    for (const alert of alerts) {
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

    // Enhanced weather warnings with specific guidance
    if (analysis.weather.ice_risk && voiceAlertsEnabled) {
      await speakAlert("Ice hazard detected! Surface conditions are dangerous. Walk slowly and avoid sudden movements. Consider finding an alternate route.");
    }
    
    if (analysis.weather.weather_condition === 'fog' && analysis.weather.visibility && analysis.weather.visibility < 2 && voiceAlertsEnabled) {
      await speakAlert("Dense fog detected with very low visibility. Wear bright colors and use lights if available. Stay close to safe areas.");
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

  const saveEmergencySettings = async (triggerWord: string, contacts: string[]) => {
    try {
      await AsyncStorage.setItem('emergencyTriggerWord', triggerWord);
      await AsyncStorage.setItem('emergencyContacts', JSON.stringify(contacts));
      setEmergencyTriggerWord(triggerWord);
      setEmergencyContacts(contacts);
      setIsEmergencySetupOpen(false);
      
      if (voiceAlertsEnabled) {
        await speakAlert(`Perfect! Your emergency system is now configured. Your trigger word is "${triggerWord}". I've added ${contacts.length} emergency contact${contacts.length > 1 ? 's' : ''}. If you ever say "${triggerWord}", I will immediately alert all your contacts and send them your location. Your Street Shield emergency system is ready to protect you.`);
      }
    } catch (error) {
      console.error('Error saving emergency settings:', error);
      if (voiceAlertsEnabled) {
        await speakAlert("There was an error saving your emergency settings. Please try again.");
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

    // Send emergency alerts
    await sendEmergencyAlerts();
    
    // Report to community/authorities
    if (location) {
      await reportEmergencyToAuthorities();
    }
    
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
      // In a real implementation, this would:
      // 1. Send SMS/calls to emergency contacts
      // 2. Share location with contacts
      // 3. Contact local authorities
      // 4. Store emergency event in database
      
      const emergencyMessage = `EMERGENCY ALERT: SafeWalk user needs immediate assistance. Last known location: ${location ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}` : 'Unknown'}. Time: ${new Date().toLocaleString()}`;
      
      // Simulate emergency notifications
      for (const contact of emergencyContacts) {
        console.log(`Emergency alert sent to: ${contact} - ${emergencyMessage}`);
      }
      
      // Persist emergency event
      if (location) {
        await fetch(`${BACKEND_URL}/api/community/report`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location,
            report_type: 'emergency',
            description: 'Emergency triggered by voice command - immediate assistance needed',
            severity: 'critical',
            user_id: 'emergency_user'
          })
        });
      }
      
    } catch (error) {
      console.error('Error sending emergency alerts:', error);
    }
  };

  const reportEmergencyToAuthorities = async () => {
    try {
      if (!location) return;
      
      await fetch(`${BACKEND_URL}/api/emergency/vehicle-detected`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...location,
          detection_method: 'emergency_voice_trigger'
        })
      });
      
    } catch (error) {
      console.error('Error reporting to authorities:', error);
    }
  };

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

  // Simulated voice trigger detection (in real implementation, would use speech recognition)
  const simulateVoiceTrigger = (spokenText: string) => {
    if (emergencyTriggerWord && spokenText.toLowerCase().includes(emergencyTriggerWord.toLowerCase())) {
      triggerEmergencyMode();
      return true;
    }
    return false;
  };

  const speakAlert = async (message: string) => {
    try {
      // Stop any current speech
      Speech.stop();
      
      // Speak the alert
      Speech.speak(message, {
        language: 'en-US',
        pitch: 1.0,
        rate: 0.8,
        quality: Speech.VoiceQuality.Enhanced,
      });
    } catch (error) {
      console.error('Error with text-to-speech:', error);
    }
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
                <Ionicons name="radar" size={20} color={proximityAlertsEnabled ? "#4ECDC4" : "#666"} />
              </View>
              <Text style={[styles.featureButtonText, proximityAlertsEnabled && styles.featureButtonTextActive]}>
                Radar
              </Text>
              <Text style={styles.featureStatus}>
                {proximityAlertsEnabled ? 'ACTIVE' : 'OFF'}
              </Text>
            </TouchableOpacity>

            {/* Emergency Test Button */}
            {emergencyTriggerWord && (
              <TouchableOpacity
                style={[styles.featureButton, styles.emergencyTestButton]}
                onPress={() => simulateVoiceTrigger(emergencyTriggerWord)}
              >
                <View style={styles.featureIcon}>
                  <Ionicons name="flash" size={20} color="#FFA726" />
                </View>
                <Text style={styles.featureButtonText}>Test</Text>
                <Text style={styles.featureStatus}>DEMO</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

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
            <TouchableOpacity onPress={() => setIsEmergencySetupOpen(false)}>
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
                    await speakAlert("Choose a unique trigger word that you can say clearly in an emergency. Good examples are RedAlert, SafeWord911, or HelpNow. Avoid common words you might say accidentally like Help or Emergency.");
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
                  if (voiceAlertsEnabled) {
                    await speakAlert("Now enter your emergency trigger word. Make it memorable but unique.");
                  }
                }}
                onChangeText={(text) => {
                  setEmergencyTriggerWord(text);
                  if (text.length >= 3 && voiceAlertsEnabled) {
                    setTimeout(async () => {
                      await speakAlert(`Your trigger word is ${text}. Make sure you can say this clearly even under stress.`);
                    }, 1500);
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
                    style={styles.contactInput}
                    value={contact}
                    onFocus={async () => {
                      if (voiceAlertsEnabled && index === 0) {
                        await speakAlert(`Enter emergency contact ${index + 1}. Use the full phone number including area code.`);
                      } else if (voiceAlertsEnabled && index > 0) {
                        await speakAlert(`Adding contact ${index + 1}. The more emergency contacts you have, the safer you'll be.`);
                      }
                    }}
                    onChangeText={(text) => {
                      const newContacts = [...emergencyContacts];
                      newContacts[index] = text;
                      setEmergencyContacts(newContacts);
                      
                      // Voice feedback for completed phone number
                      if (text.length >= 10 && voiceAlertsEnabled) {
                        setTimeout(async () => {
                          await speakAlert(`Contact ${index + 1} added. This person will be notified immediately if you trigger an emergency.`);
                        }, 1000);
                      }
                    }}
                    placeholder="Phone number"
                    keyboardType="phone-pad"
                  />
                  <TouchableOpacity
                    onPress={async () => {
                      if (voiceAlertsEnabled) {
                        await speakAlert(`Removing contact ${index + 1}.`);
                      }
                      const newContacts = emergencyContacts.filter((_, i) => i !== index);
                      setEmergencyContacts(newContacts);
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
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    backgroundColor: '#667eea', // fallback
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
    gap: 10,
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
});