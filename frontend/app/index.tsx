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
} from 'react-native';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

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

  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const analysisInterval = useRef<NodeJS.Timeout | null>(null);

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
        await speakAlert("Welcome to SafeWalk! I need to request some permissions to keep you safe.");
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
            await speakAlert("Perfect! All permissions granted. SafeWalk is ready to protect you.");
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
                speakAlert("Demo mode activated. SafeWalk will simulate safety features.");
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
      
      // Start location tracking
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
        }
      );

      // Start periodic safety analysis
      analysisInterval.current = setInterval(() => {
        if (location) {
          performSafetyAnalysis(location);
        }
      }, 30000); // Analyze every 30 seconds

      showNotification('SafeWalk Active', 'Monitoring your safety in the background');
    } catch (error) {
      console.error('Error starting tracking:', error);
      Alert.alert('Error', 'Failed to start location tracking');
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
          user_context: {
            activity_type: 'walking',
            speed: 'pedestrian',
            time_of_day: new Date().getHours(),
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

    for (const alert of alerts) {
      if (alert.priority === 'high' || alert.priority === 'critical') {
        await showNotification(`Safety Alert - ${alert.type}`, alert.message);
        
        if (voiceAlertsEnabled) {
          await speakAlert(alert.message);
        }
        
        setLastAlertTime(now);
        break; // Only show one high-priority alert at a time
      }
    }

    // Check overall safety score
    if (analysis.safety_score.overall_score < 30) {
      await showNotification(
        'Low Safety Score',
        `Current safety score: ${analysis.safety_score.overall_score}/100. Exercise extreme caution.`
      );
    }
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
          <Text style={styles.appTitle}>SafeWalk</Text>
          <Text style={styles.appSubtitle}>AI-Powered Pedestrian Safety</Text>
        </View>

        {/* Safety Score Display */}
        {safetyAnalysis && (
          <View style={styles.safetyScoreContainer}>
            <View style={[
              styles.safetyScoreCircle,
              { backgroundColor: getSafetyColor(safetyAnalysis.safety_score.overall_score) }
            ]}>
              <Text style={styles.safetyScoreNumber}>
                {safetyAnalysis.safety_score.overall_score}
              </Text>
              <Text style={styles.safetyScoreLabel}>
                {getSafetyLabel(safetyAnalysis.safety_score.overall_score)}
              </Text>
            </View>
          </View>
        )}

        {/* Control Buttons */}
        <View style={styles.controlsContainer}>
          <TouchableOpacity
            style={[styles.controlButton, isTracking && styles.controlButtonActive]}
            onPress={isTracking ? stopTracking : startTracking}
            disabled={isLoading}
          >
            <Ionicons
              name={isTracking ? "stop" : "play"}
              size={24}
              color="#fff"
            />
            <Text style={styles.controlButtonText}>
              {isTracking ? 'Stop Monitoring' : 'Start Monitoring'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, styles.settingsButton]}
            onPress={toggleVoiceAlerts}
          >
            <Ionicons
              name={voiceAlertsEnabled ? "volume-high" : "volume-mute"}
              size={24}
              color="#fff"
            />
            <Text style={styles.controlButtonText}>
              Voice Alerts {voiceAlertsEnabled ? 'ON' : 'OFF'}
            </Text>
          </TouchableOpacity>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    backgroundColor: '#2196F3',
    padding: 20,
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  appSubtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
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
});