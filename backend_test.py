#!/usr/bin/env python3
"""
Street Shield Backend Testing Suite
Testing the NEW advanced features that support seamless music listening while maintaining security
Focus: AI-Driven Noise Cancellation, Biometric Health Monitoring, Proximity Threat Detection
"""

import requests
import json
import time
from datetime import datetime, timedelta
from typing import Dict, List

# Backend URL from frontend environment
BACKEND_URL = "https://shield-alert-1.preview.emergentagent.com/api"

# Test data for music/security balance scenarios
TEST_LOCATION = {
    "latitude": 40.7128,
    "longitude": -74.0060,
    "altitude": 10.0,
    "accuracy": 5.0,
    "timestamp": datetime.utcnow().isoformat()
}

MUSIC_USER_CONTEXT = {
    "user_id": "music_runner_001",
    "activity_type": "running",
    "music_listening": True,
    "headphone_type": "noise_cancelling",
    "music_volume": 0.7,
    "speed": 2.5
}

class StreetShieldTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.timeout = 30
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, details: str = ""):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        print()

    def test_health_check(self):
        """Test basic API health"""
        try:
            response = self.session.get(f"{BACKEND_URL}/health", timeout=10)
            if response.status_code == 200:
                data = response.json()
                services = data.get("services", {})
                ai_status = services.get("ai", "unknown")
                db_status = services.get("database", "unknown")
                
                details = f"AI: {ai_status}, Database: {db_status}"
                self.log_test("Health Check", True, details)
                return True
            else:
                self.log_test("Health Check", False, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Health Check", False, f"Error: {str(e)}")
            return False

    def test_noise_cancellation_system(self):
        """Test AI-Driven Noise Cancellation System"""
        print("🎵 Testing AI-Driven Noise Cancellation System...")
        
        # Test data for different environments
        test_scenarios = [
            {
                "name": "Urban Rush Hour Environment",
                "location": {"latitude": 40.7128, "longitude": -74.0060, "timestamp": datetime.now().isoformat()},
                "user_context": {"activity_type": "walking", "music_listening": True, "headphone_type": "noise_cancelling"}
            },
            {
                "name": "Suburban Jogging Environment", 
                "location": {"latitude": 40.7589, "longitude": -73.9851, "timestamp": datetime.now().isoformat()},
                "user_context": {"activity_type": "running", "music_listening": True, "headphone_type": "earbuds"}
            },
            {
                "name": "Park/Quiet Environment",
                "location": {"latitude": 40.7829, "longitude": -73.9654, "timestamp": datetime.now().isoformat()},
                "user_context": {"activity_type": "walking", "music_listening": True, "headphone_type": "open_back"}
            }
        ]
        
        all_passed = True
        
        for scenario in test_scenarios:
            try:
                response = self.session.post(
                    f"{BACKEND_URL}/audio/noise-profile",
                    json=scenario,
                    timeout=15
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Validate response structure
                    required_fields = [
                        "location_type", "predicted_noise_level", "noise_sources", 
                        "critical_sounds", "noise_cancellation_profile", "ambient_sound_priority"
                    ]
                    
                    missing_fields = [field for field in required_fields if field not in data]
                    if missing_fields:
                        self.log_test(f"Noise Analysis - {scenario['name']}", False, 
                                    f"Missing fields: {missing_fields}")
                        all_passed = False
                        continue
                    
                    # Validate noise cancellation profiles
                    valid_profiles = ["aggressive", "balanced", "minimal", "safety_first"]
                    if data["noise_cancellation_profile"] not in valid_profiles:
                        self.log_test(f"Noise Analysis - {scenario['name']}", False, 
                                    f"Invalid cancellation profile: {data['noise_cancellation_profile']}")
                        all_passed = False
                        continue
                    
                    # Validate critical sound preservation
                    critical_sounds = data.get("critical_sounds", [])
                    safety_sounds = ["sirens", "horns", "emergency_vehicles", "alarms"]
                    has_safety_sounds = any(sound in critical_sounds for sound in safety_sounds)
                    
                    if not has_safety_sounds:
                        self.log_test(f"Noise Analysis - {scenario['name']}", False, 
                                    "No critical safety sounds detected for preservation")
                        all_passed = False
                        continue
                    
                    # Validate noise level is realistic
                    noise_level = data.get("predicted_noise_level", 0)
                    if not (30 <= noise_level <= 120):
                        self.log_test(f"Noise Analysis - {scenario['name']}", False, 
                                    f"Unrealistic noise level: {noise_level} dB")
                        all_passed = False
                        continue
                    
                    details = f"Profile: {data['noise_cancellation_profile']}, Noise: {noise_level}dB, Location: {data['location_type']}"
                    self.log_test(f"Noise Analysis - {scenario['name']}", True, details)
                    
                else:
                    self.log_test(f"Noise Analysis - {scenario['name']}", False, 
                                f"HTTP {response.status_code}: {response.text}")
                    all_passed = False
                    
            except Exception as e:
                self.log_test(f"Noise Analysis - {scenario['name']}", False, f"Error: {str(e)}")
                all_passed = False
        
        return all_passed

    def test_biometric_monitoring_system(self):
        """Test Biometric Health Monitoring System"""
        print("💓 Testing Biometric Health Monitoring System...")
        
        # Test scenarios with different health conditions
        test_scenarios = [
            {
                "name": "Normal Exercise Heart Rate",
                "biometric_data": {
                    "heart_rate": 145,
                    "stress_level": 0.3,
                    "fatigue_level": 0.2,
                    "activity_level": "moderate",
                    "blood_oxygen": 98,
                    "timestamp": datetime.now().isoformat()
                },
                "location": {"latitude": 40.7128, "longitude": -74.0060, "timestamp": datetime.now().isoformat()},
                "safety_context": {"activity_level": "moderate", "temperature": 22}
            },
            {
                "name": "High Stress Detection",
                "biometric_data": {
                    "heart_rate": 165,
                    "stress_level": 0.85,
                    "fatigue_level": 0.4,
                    "activity_level": "vigorous",
                    "blood_oxygen": 96,
                    "timestamp": datetime.now().isoformat()
                },
                "location": {"latitude": 40.7589, "longitude": -73.9851, "timestamp": datetime.now().isoformat()},
                "safety_context": {"activity_level": "vigorous", "temperature": 28}
            },
            {
                "name": "Critical Heart Rate Alert",
                "biometric_data": {
                    "heart_rate": 185,
                    "stress_level": 0.9,
                    "fatigue_level": 0.8,
                    "activity_level": "vigorous",
                    "blood_oxygen": 94,
                    "timestamp": datetime.now().isoformat()
                },
                "location": {"latitude": 40.7829, "longitude": -73.9654, "timestamp": datetime.now().isoformat()},
                "safety_context": {"activity_level": "vigorous", "temperature": 35}
            },
            {
                "name": "Low Blood Oxygen Emergency",
                "biometric_data": {
                    "heart_rate": 120,
                    "stress_level": 0.6,
                    "fatigue_level": 0.7,
                    "activity_level": "light",
                    "blood_oxygen": 88,
                    "timestamp": datetime.now().isoformat()
                },
                "location": {"latitude": 40.7505, "longitude": -73.9934, "timestamp": datetime.now().isoformat()},
                "safety_context": {"activity_level": "light", "temperature": 20}
            }
        ]
        
        all_passed = True
        
        for scenario in test_scenarios:
            try:
                response = self.session.post(
                    f"{BACKEND_URL}/health/biometric-analysis",
                    json=scenario,
                    timeout=15
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Validate response structure
                    if "health_alerts" not in data:
                        self.log_test(f"Biometric Analysis - {scenario['name']}", False, 
                                    "Missing health_alerts in response")
                        all_passed = False
                        continue
                    
                    health_alerts = data["health_alerts"]
                    emergency_triggered = data.get("emergency_triggered", False)
                    
                    # Validate alert generation based on scenario
                    if scenario["name"] == "Normal Exercise Heart Rate":
                        # Should have minimal or no alerts
                        critical_alerts = [alert for alert in health_alerts if alert.get("severity") == "critical"]
                        if critical_alerts:
                            self.log_test(f"Biometric Analysis - {scenario['name']}", False, 
                                        "Unexpected critical alerts for normal exercise")
                            all_passed = False
                            continue
                    
                    elif scenario["name"] == "Critical Heart Rate Alert":
                        # Should trigger high severity alerts
                        high_severity_alerts = [alert for alert in health_alerts 
                                              if alert.get("severity") in ["high", "critical"]]
                        if not high_severity_alerts:
                            self.log_test(f"Biometric Analysis - {scenario['name']}", False, 
                                        "No high severity alerts for critical heart rate")
                            all_passed = False
                            continue
                    
                    elif scenario["name"] == "Low Blood Oxygen Emergency":
                        # Should trigger emergency protocols
                        if not emergency_triggered:
                            self.log_test(f"Biometric Analysis - {scenario['name']}", False, 
                                        "Emergency not triggered for low blood oxygen")
                            all_passed = False
                            continue
                    
                    # Validate alert structure
                    for alert in health_alerts:
                        required_alert_fields = ["alert_type", "severity", "message", "recommended_action"]
                        missing_alert_fields = [field for field in required_alert_fields if field not in alert]
                        if missing_alert_fields:
                            self.log_test(f"Biometric Analysis - {scenario['name']}", False, 
                                        f"Alert missing fields: {missing_alert_fields}")
                            all_passed = False
                            continue
                    
                    alert_count = len(health_alerts)
                    details = f"Alerts: {alert_count}, Emergency: {emergency_triggered}"
                    if health_alerts:
                        severities = [alert.get("severity", "unknown") for alert in health_alerts]
                        details += f", Severities: {severities}"
                    
                    self.log_test(f"Biometric Analysis - {scenario['name']}", True, details)
                    
                else:
                    self.log_test(f"Biometric Analysis - {scenario['name']}", False, 
                                f"HTTP {response.status_code}: {response.text}")
                    all_passed = False
                    
            except Exception as e:
                self.log_test(f"Biometric Analysis - {scenario['name']}", False, f"Error: {str(e)}")
                all_passed = False
        
        return all_passed

    def test_proximity_threat_detection(self):
        """Test Proximity Threat Detection System"""
        print("🚨 Testing Proximity Threat Detection System...")
        
        # Create realistic movement history for following detection
        base_location = {"latitude": 40.7128, "longitude": -74.0060}
        movement_history = []
        
        # Simulate 5 minutes of movement history
        for i in range(5):
            timestamp = (datetime.now() - timedelta(minutes=5-i)).isoformat()
            location = {
                "latitude": base_location["latitude"] + (i * 0.0001),
                "longitude": base_location["longitude"] + (i * 0.0001),
                "timestamp": timestamp
            }
            movement_history.append(location)
        
        test_scenarios = [
            {
                "name": "Daytime Safe Walking",
                "location": {"latitude": 40.7128, "longitude": -74.0060, "timestamp": datetime.now().isoformat()},
                "movement_history": movement_history[:3],  # Short history
                "user_context": {"activity_type": "walking", "time_of_day": "afternoon"}
            },
            {
                "name": "Night Running - High Risk",
                "location": {"latitude": 40.7589, "longitude": -73.9851, "timestamp": datetime.now().isoformat()},
                "movement_history": movement_history,
                "user_context": {"activity_type": "running", "time_of_day": "night"}
            },
            {
                "name": "Extended Movement Pattern",
                "location": {"latitude": 40.7829, "longitude": -73.9654, "timestamp": datetime.now().isoformat()},
                "movement_history": movement_history,
                "user_context": {"activity_type": "walking", "time_of_day": "evening"}
            }
        ]
        
        all_passed = True
        
        for scenario in test_scenarios:
            try:
                response = self.session.post(
                    f"{BACKEND_URL}/proximity/analyze",
                    json=scenario,
                    timeout=15
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Validate response structure
                    required_fields = [
                        "user_location", "detected_threats", "safe_radius", 
                        "awareness_radius", "crowd_density", "overall_threat_level"
                    ]
                    
                    missing_fields = [field for field in required_fields if field not in data]
                    if missing_fields:
                        self.log_test(f"Proximity Analysis - {scenario['name']}", False, 
                                    f"Missing fields: {missing_fields}")
                        all_passed = False
                        continue
                    
                    # Validate threat detection logic
                    detected_threats = data.get("detected_threats", [])
                    overall_threat_level = data.get("overall_threat_level", "safe")
                    crowd_density = data.get("crowd_density", "unknown")
                    
                    # Validate threat structure if threats detected
                    for threat in detected_threats:
                        threat_fields = ["threat_type", "distance", "confidence", "threat_level", "recommended_action"]
                        missing_threat_fields = [field for field in threat_fields if field not in threat]
                        if missing_threat_fields:
                            self.log_test(f"Proximity Analysis - {scenario['name']}", False, 
                                        f"Threat missing fields: {missing_threat_fields}")
                            all_passed = False
                            continue
                        
                        # Validate confidence is between 0 and 1
                        confidence = threat.get("confidence", 0)
                        if not (0 <= confidence <= 1):
                            self.log_test(f"Proximity Analysis - {scenario['name']}", False, 
                                        f"Invalid confidence value: {confidence}")
                            all_passed = False
                            continue
                    
                    # Validate crowd density values
                    valid_densities = ["empty", "low", "moderate", "crowded"]
                    if crowd_density not in valid_densities:
                        self.log_test(f"Proximity Analysis - {scenario['name']}", False, 
                                    f"Invalid crowd density: {crowd_density}")
                        all_passed = False
                        continue
                    
                    # Validate threat levels
                    valid_threat_levels = ["safe", "low", "medium", "high", "critical"]
                    if overall_threat_level not in valid_threat_levels:
                        self.log_test(f"Proximity Analysis - {scenario['name']}", False, 
                                    f"Invalid threat level: {overall_threat_level}")
                        all_passed = False
                        continue
                    
                    threat_count = len(detected_threats)
                    details = f"Threats: {threat_count}, Level: {overall_threat_level}, Crowd: {crowd_density}"
                    
                    if detected_threats:
                        threat_types = [threat.get("threat_type", "unknown") for threat in detected_threats]
                        details += f", Types: {threat_types}"
                    
                    self.log_test(f"Proximity Analysis - {scenario['name']}", True, details)
                    
                else:
                    self.log_test(f"Proximity Analysis - {scenario['name']}", False, 
                                f"HTTP {response.status_code}: {response.text}")
                    all_passed = False
                    
            except Exception as e:
                self.log_test(f"Proximity Analysis - {scenario['name']}", False, f"Error: {str(e)}")
                all_passed = False
        
        return all_passed

    def test_integrated_music_security_balance(self):
        """Test how all systems work together for music/security balance"""
        print("🎵🛡️ Testing Integrated Music/Security Balance...")
        
        # Simulate a user listening to music while jogging
        location = {"latitude": 40.7128, "longitude": -74.0060, "timestamp": datetime.now().isoformat()}
        user_context = {
            "activity_type": "running",
            "music_listening": True,
            "headphone_type": "noise_cancelling",
            "music_volume": 0.7,
            "user_id": "test_runner_001"
        }
        
        # Create movement history
        movement_history = []
        for i in range(5):
            timestamp = (datetime.now() - timedelta(minutes=5-i)).isoformat()
            hist_location = {
                "latitude": location["latitude"] + (i * 0.0001),
                "longitude": location["longitude"] + (i * 0.0001),
                "timestamp": timestamp
            }
            movement_history.append(hist_location)
        
        biometric_data = {
            "heart_rate": 155,
            "stress_level": 0.4,
            "fatigue_level": 0.3,
            "activity_level": "vigorous",
            "blood_oxygen": 97,
            "timestamp": datetime.now().isoformat()
        }
        
        all_passed = True
        integration_results = {}
        
        # Test 1: Noise Cancellation for Music Listening
        try:
            noise_response = self.session.post(
                f"{BACKEND_URL}/audio/noise-profile",
                json={"location": location, "user_context": user_context},
                timeout=15
            )
            
            if noise_response.status_code == 200:
                noise_data = noise_response.json()
                integration_results["noise_cancellation"] = noise_data
                
                # Verify music-friendly noise cancellation
                cancellation_profile = noise_data.get("noise_cancellation_profile", "")
                critical_sounds = noise_data.get("critical_sounds", [])
                
                if not critical_sounds:
                    self.log_test("Integration - Noise Cancellation", False, 
                                "No critical sounds preserved for safety")
                    all_passed = False
                else:
                    self.log_test("Integration - Noise Cancellation", True, 
                                f"Profile: {cancellation_profile}, Critical sounds preserved")
            else:
                self.log_test("Integration - Noise Cancellation", False, 
                            f"HTTP {noise_response.status_code}")
                all_passed = False
                
        except Exception as e:
            self.log_test("Integration - Noise Cancellation", False, f"Error: {str(e)}")
            all_passed = False
        
        # Test 2: Biometric Monitoring During Exercise
        try:
            biometric_response = self.session.post(
                f"{BACKEND_URL}/health/biometric-analysis",
                json={
                    "biometric_data": biometric_data,
                    "location": location,
                    "safety_context": {"activity_level": "vigorous", "temperature": 25}
                },
                timeout=15
            )
            
            if biometric_response.status_code == 200:
                biometric_result = biometric_response.json()
                integration_results["biometric_monitoring"] = biometric_result
                
                health_alerts = biometric_result.get("health_alerts", [])
                emergency_triggered = biometric_result.get("emergency_triggered", False)
                
                # For normal exercise, should not trigger emergency
                if emergency_triggered:
                    self.log_test("Integration - Biometric Monitoring", False, 
                                "Unexpected emergency for normal exercise")
                    all_passed = False
                else:
                    self.log_test("Integration - Biometric Monitoring", True, 
                                f"Health alerts: {len(health_alerts)}, No false emergency")
            else:
                self.log_test("Integration - Biometric Monitoring", False, 
                            f"HTTP {biometric_response.status_code}")
                all_passed = False
                
        except Exception as e:
            self.log_test("Integration - Biometric Monitoring", False, f"Error: {str(e)}")
            all_passed = False
        
        # Test 3: Proximity Threat Detection
        try:
            proximity_response = self.session.post(
                f"{BACKEND_URL}/proximity/analyze",
                json={
                    "location": location,
                    "movement_history": movement_history,
                    "user_context": user_context
                },
                timeout=15
            )
            
            if proximity_response.status_code == 200:
                proximity_result = proximity_response.json()
                integration_results["proximity_detection"] = proximity_result
                
                detected_threats = proximity_result.get("detected_threats", [])
                overall_threat_level = proximity_result.get("overall_threat_level", "safe")
                
                self.log_test("Integration - Proximity Detection", True, 
                            f"Threats: {len(detected_threats)}, Level: {overall_threat_level}")
            else:
                self.log_test("Integration - Proximity Detection", False, 
                            f"HTTP {proximity_response.status_code}")
                all_passed = False
                
        except Exception as e:
            self.log_test("Integration - Proximity Detection", False, f"Error: {str(e)}")
            all_passed = False
        
        # Test 4: Comprehensive Safety Analysis Integration
        try:
            safety_response = self.session.post(
                f"{BACKEND_URL}/safety/analyze",
                json={
                    "location": location,
                    "user_context": user_context,
                    "movement_history": movement_history
                },
                timeout=15
            )
            
            if safety_response.status_code == 200:
                safety_result = safety_response.json()
                integration_results["safety_analysis"] = safety_result
                
                safety_score = safety_result.get("safety_score", {})
                overall_score = safety_score.get("overall_score", 0)
                
                if overall_score > 0:
                    self.log_test("Integration - Comprehensive Safety", True, 
                                f"Overall safety score: {overall_score}")
                else:
                    self.log_test("Integration - Comprehensive Safety", False, 
                                "Invalid safety score")
                    all_passed = False
            else:
                self.log_test("Integration - Comprehensive Safety", False, 
                            f"HTTP {safety_response.status_code}")
                all_passed = False
                
        except Exception as e:
            self.log_test("Integration - Comprehensive Safety", False, f"Error: {str(e)}")
            all_passed = False
        
        return all_passed

    def test_electric_scooter_detection_system(self):
        """🛴 PRIORITY TEST: Electric Scooter Detection System for Music Listeners"""
        print("🛴 Testing ELECTRIC SCOOTER DETECTION SYSTEM - Critical for Music Listeners...")
        
        all_passed = True
        escooter_tests_passed = 0
        total_escooter_tests = 0
        
        # Test 1: Basic E-Scooter Detection via Proximity Analysis
        total_escooter_tests += 1
        try:
            location = {"latitude": 40.7128, "longitude": -74.0060, "timestamp": datetime.now().isoformat()}
            
            # Rush hour urban context - highest e-scooter probability
            rush_hour_context = {
                "user_id": "music_listener_escooter_test",
                "activity_type": "walking",
                "location_context": "urban",
                "weather": "clear",
                "time_of_day": "rush_hour",
                "wearing_headphones": True,
                "music_playing": True
            }
            
            movement_history = []
            for i in range(5):
                hist_location = {
                    "latitude": location["latitude"] + (i * 0.0001),
                    "longitude": location["longitude"] + (i * 0.0001),
                    "timestamp": (datetime.now() - timedelta(minutes=5-i)).isoformat()
                }
                movement_history.append(hist_location)
            
            escooter_detected = False
            test_attempts = 15  # Multiple attempts due to probabilistic nature
            
            for attempt in range(test_attempts):
                response = self.session.post(
                    f"{BACKEND_URL}/proximity/analyze",
                    json={
                        "location": location,
                        "movement_history": movement_history,
                        "user_context": rush_hour_context
                    },
                    timeout=15
                )
                
                if response.status_code == 200:
                    data = response.json()
                    detected_threats = data.get("detected_threats", [])
                    
                    for threat in detected_threats:
                        if threat.get("threat_type") in ["electric_scooter", "silent_vehicle"]:
                            escooter_detected = True
                            
                            # Validate e-scooter threat properties
                            vehicle_type = threat.get("vehicle_type")
                            speed_estimate = threat.get("speed_estimate")
                            sound_signature = threat.get("sound_signature")
                            confidence = threat.get("confidence")
                            threat_level = threat.get("threat_level")
                            
                            # Validation checks
                            if vehicle_type in ["e_scooter", "e_bike"] and \
                               15 <= speed_estimate <= 50 and \
                               sound_signature in ["silent", "low_hum"] and \
                               confidence >= 0.7 and \
                               threat_level in ["medium", "high", "critical"]:
                                
                                self.log_test("E-Scooter Detection - Basic", True, 
                                            f"Detected {vehicle_type} at {speed_estimate:.1f}km/h, confidence: {confidence:.2f}")
                                escooter_tests_passed += 1
                                break
                            else:
                                self.log_test("E-Scooter Detection - Basic", False, 
                                            f"Invalid e-scooter properties: type={vehicle_type}, speed={speed_estimate}, confidence={confidence}")
                                all_passed = False
                                break
                    
                    if escooter_detected:
                        break
                    
                    time.sleep(0.3)
                else:
                    self.log_test("E-Scooter Detection - Basic", False, f"HTTP {response.status_code}")
                    all_passed = False
                    break
            
            if not escooter_detected:
                self.log_test("E-Scooter Detection - Basic", False, 
                            f"No e-scooter detected in {test_attempts} attempts")
                all_passed = False
                
        except Exception as e:
            self.log_test("E-Scooter Detection - Basic", False, f"Error: {str(e)}")
            all_passed = False
        
        # Test 2: E-Scooter Sound Preservation in Noise Cancellation
        total_escooter_tests += 1
        try:
            response = self.session.post(
                f"{BACKEND_URL}/audio/noise-profile",
                json={
                    "location": location,
                    "user_context": {
                        "activity_type": "walking",
                        "location_context": "urban",
                        "wearing_headphones": True,
                        "music_playing": True
                    }
                },
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                critical_sounds = data.get("critical_sounds", [])
                ambient_sound_priority = data.get("ambient_sound_priority", [])
                noise_sources = data.get("noise_sources", [])
                
                # Check for e-scooter related sounds
                escooter_sounds_preserved = []
                escooter_keywords = ["electric_scooter_approach", "tire_noise", "electric_vehicle_approach", "e_scooters"]
                
                for keyword in escooter_keywords:
                    if keyword in critical_sounds or keyword in ambient_sound_priority or keyword in noise_sources:
                        escooter_sounds_preserved.append(keyword)
                
                if escooter_sounds_preserved:
                    self.log_test("E-Scooter Noise Cancellation Integration", True, 
                                f"E-scooter sounds preserved: {escooter_sounds_preserved}")
                    escooter_tests_passed += 1
                else:
                    self.log_test("E-Scooter Noise Cancellation Integration", False, 
                                "No e-scooter sounds found in preservation lists")
                    all_passed = False
            else:
                self.log_test("E-Scooter Noise Cancellation Integration", False, f"HTTP {response.status_code}")
                all_passed = False
                
        except Exception as e:
            self.log_test("E-Scooter Noise Cancellation Integration", False, f"Error: {str(e)}")
            all_passed = False
        
        # Test 3: E-Scooter Integration with Safety Scoring
        total_escooter_tests += 1
        try:
            escooter_safety_impact = False
            test_attempts = 10
            
            for attempt in range(test_attempts):
                response = self.session.post(
                    f"{BACKEND_URL}/safety/analyze",
                    json={
                        "location": location,
                        "user_context": rush_hour_context,
                        "movement_history": movement_history
                    },
                    timeout=15
                )
                
                if response.status_code == 200:
                    data = response.json()
                    safety_score = data.get("safety_score", {})
                    overall_score = safety_score.get("overall_score", 100)
                    risk_factors = safety_score.get("risk_factors", [])
                    alerts = safety_score.get("alerts", [])
                    
                    # Check for e-scooter related content
                    escooter_content_found = False
                    for risk in risk_factors:
                        if "scooter" in risk.lower() or "electric" in risk.lower():
                            escooter_content_found = True
                            break
                    
                    for alert in alerts:
                        alert_msg = alert.get("message", "").lower()
                        if "scooter" in alert_msg or "electric" in alert_msg:
                            escooter_content_found = True
                            break
                    
                    if escooter_content_found and overall_score < 85:
                        escooter_safety_impact = True
                        self.log_test("E-Scooter Safety Integration", True, 
                                    f"E-scooter threat integrated, safety score: {overall_score}")
                        escooter_tests_passed += 1
                        break
                
                time.sleep(0.3)
            
            if not escooter_safety_impact:
                self.log_test("E-Scooter Safety Integration", False, 
                            "No e-scooter safety integration detected")
                all_passed = False
                
        except Exception as e:
            self.log_test("E-Scooter Safety Integration", False, f"Error: {str(e)}")
            all_passed = False
        
        # Test 4: Critical Distance Thresholds for E-Scooters
        total_escooter_tests += 1
        try:
            critical_scenarios_found = False
            test_attempts = 20
            
            for attempt in range(test_attempts):
                response = self.session.post(
                    f"{BACKEND_URL}/proximity/analyze",
                    json={
                        "location": location,
                        "movement_history": movement_history,
                        "user_context": rush_hour_context
                    },
                    timeout=15
                )
                
                if response.status_code == 200:
                    data = response.json()
                    detected_threats = data.get("detected_threats", [])
                    
                    for threat in detected_threats:
                        if threat.get("threat_type") == "electric_scooter":
                            distance = threat.get("distance", 999)
                            speed = threat.get("speed_estimate", 0)
                            threat_level = threat.get("threat_level")
                            
                            # Check for critical scenarios (close + fast)
                            if distance < 15 and speed > 20 and threat_level in ["high", "critical"]:
                                critical_scenarios_found = True
                                self.log_test("E-Scooter Critical Distance Thresholds", True, 
                                            f"Critical scenario: {distance:.1f}m, {speed:.1f}km/h, level: {threat_level}")
                                escooter_tests_passed += 1
                                break
                    
                    if critical_scenarios_found:
                        break
                
                time.sleep(0.2)
            
            if not critical_scenarios_found:
                self.log_test("E-Scooter Critical Distance Thresholds", False, 
                            "No critical e-scooter scenarios detected")
                all_passed = False
                
        except Exception as e:
            self.log_test("E-Scooter Critical Distance Thresholds", False, f"Error: {str(e)}")
            all_passed = False
        
        print(f"🛴 E-SCOOTER TESTS SUMMARY: {escooter_tests_passed}/{total_escooter_tests} passed")
        return all_passed and escooter_tests_passed >= 2  # At least 2 core tests must pass

    def test_additional_endpoints(self):
        """Test additional endpoints for completeness"""
        print("🔧 Testing Additional Endpoints...")
        
        all_passed = True
        
        # Test proximity history endpoint
        try:
            response = self.session.get(f"{BACKEND_URL}/proximity/history/test_runner_001", timeout=10)
            if response.status_code == 200:
                data = response.json()
                analyses = data.get("proximity_analyses", [])
                self.log_test("Proximity History Endpoint", True, f"Retrieved {len(analyses)} proximity analyses")
            else:
                self.log_test("Proximity History Endpoint", False, f"HTTP {response.status_code}")
                all_passed = False
        except Exception as e:
            self.log_test("Proximity History Endpoint", False, f"Error: {str(e)}")
            all_passed = False
        
        # Test health history endpoint
        try:
            response = self.session.get(f"{BACKEND_URL}/health/history/test_runner_001", timeout=10)
            if response.status_code == 200:
                data = response.json()
                biometric_history = data.get("biometric_history", [])
                health_alerts = data.get("health_alerts", [])
                self.log_test("Health History Endpoint", True, 
                            f"Biometric records: {len(biometric_history)}, Health alerts: {len(health_alerts)}")
            else:
                self.log_test("Health History Endpoint", False, f"HTTP {response.status_code}")
                all_passed = False
        except Exception as e:
            self.log_test("Health History Endpoint", False, f"Error: {str(e)}")
            all_passed = False
        
        # Test root endpoint
        try:
            response = self.session.get(f"{BACKEND_URL}/", timeout=10)
            if response.status_code == 200:
                data = response.json()
                message = data.get("message", "")
                if "Street Shield API" in message:
                    self.log_test("Root Endpoint", True, "API root accessible")
                else:
                    self.log_test("Root Endpoint", False, f"Unexpected message: {message}")
                    all_passed = False
            else:
                self.log_test("Root Endpoint", False, f"HTTP {response.status_code}")
                all_passed = False
        except Exception as e:
            self.log_test("Root Endpoint", False, f"Error: {str(e)}")
            all_passed = False
        
        return all_passed

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Street Shield Backend Testing Suite")
        print("=" * 60)
        
        # Test basic connectivity first
        if not self.test_health_check():
            print("❌ Health check failed - aborting tests")
            return False
        
        # Test the three new high-priority features
        noise_test = self.test_noise_cancellation_system()
        biometric_test = self.test_biometric_monitoring_system()
        proximity_test = self.test_proximity_threat_detection()
        integration_test = self.test_integrated_music_security_balance()
        
        # Test additional endpoints for completeness
        additional_test = self.test_additional_endpoints()
        
        # Summary
        print("=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed_tests = sum([noise_test, biometric_test, proximity_test, integration_test, additional_test])
        total_tests = 5
        
        print(f"✅ Passed: {passed_tests}/{total_tests} major test suites")
        
        individual_results = [result for result in self.test_results if result["success"]]
        individual_failures = [result for result in self.test_results if not result["success"]]
        
        print(f"✅ Individual tests passed: {len(individual_results)}")
        print(f"❌ Individual tests failed: {len(individual_failures)}")
        
        if individual_failures:
            print("\n❌ FAILED TESTS:")
            for failure in individual_failures:
                print(f"   - {failure['test']}: {failure['details']}")
        
        return passed_tests == total_tests

if __name__ == "__main__":
    tester = StreetShieldTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 All backend tests passed! Street Shield is ready for music/security balance.")
    else:
        print("\n⚠️ Some tests failed. Check the details above.")