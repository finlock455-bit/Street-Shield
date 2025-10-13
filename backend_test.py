#!/usr/bin/env python3
"""
Street Shield Backend API Testing Suite
Tests the 3 newly implemented high-priority features:
1. Emergency Contact Management System
2. Enhanced Health Monitoring with Medical Accuracy  
3. Cycling Mode Safety System
"""

import requests
import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Any
import sys

# Backend URL from frontend/.env
BASE_URL = "https://streetshield.preview.emergentagent.com/api"

class BackendTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.test_results = []
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        
    def log_test(self, test_name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test results"""
        result = {
            'test': test_name,
            'success': success,
            'details': details,
            'timestamp': datetime.now().isoformat()
        }
        if response_data:
            result['response'] = response_data
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        if not success and response_data:
            print(f"   Response: {response_data}")
        print()

    def test_emergency_contact_management(self):
        """Test Emergency Contact Management System"""
        print("🚨 Testing Emergency Contact Management System...")
        
        # Test data
        user_id = "test_user_" + str(uuid.uuid4())[:8]
        contact_data = {
            "user_id": user_id,
            "name": "Sarah Johnson",
            "phone_number": "+1-555-0123",
            "relationship": "family",
            "priority": 1
        }
        
        created_contact_id = None
        
        try:
            # 1. Test POST /api/emergency/contacts - Create new contact
            response = self.session.post(f"{self.base_url}/emergency/contacts", json=contact_data)
            if response.status_code == 201:
                contact_response = response.json()
                created_contact_id = contact_response.get('id')
                self.log_test(
                    "POST /api/emergency/contacts - Create contact",
                    True,
                    f"Created contact with ID: {created_contact_id}",
                    contact_response
                )
            else:
                self.log_test(
                    "POST /api/emergency/contacts - Create contact",
                    False,
                    f"Expected 201, got {response.status_code}",
                    response.text
                )
                
            # 2. Test GET /api/emergency/contacts - Retrieve all contacts
            response = self.session.get(f"{self.base_url}/emergency/contacts")
            if response.status_code == 200:
                contacts = response.json()
                self.log_test(
                    "GET /api/emergency/contacts - Retrieve contacts",
                    True,
                    f"Retrieved {len(contacts)} contacts",
                    {"count": len(contacts)}
                )
            else:
                self.log_test(
                    "GET /api/emergency/contacts - Retrieve contacts",
                    False,
                    f"Expected 200, got {response.status_code}",
                    response.text
                )
                
            # 3. Test PUT /api/emergency/contacts/{contact_id} - Update contact
            if created_contact_id:
                update_data = {
                    "name": "Sarah Johnson-Smith",
                    "phone_number": "+1-555-0124",
                    "relationship": "spouse"
                }
                response = self.session.put(f"{self.base_url}/emergency/contacts/{created_contact_id}", json=update_data)
                if response.status_code == 200:
                    updated_contact = response.json()
                    self.log_test(
                        "PUT /api/emergency/contacts/{id} - Update contact",
                        True,
                        f"Updated contact name to: {updated_contact.get('name')}",
                        updated_contact
                    )
                else:
                    self.log_test(
                        "PUT /api/emergency/contacts/{id} - Update contact",
                        False,
                        f"Expected 200, got {response.status_code}",
                        response.text
                    )
                    
            # 4. Test POST /api/emergency/report - Report emergency
            emergency_data = {
                "user_id": user_id,
                "location": {
                    "latitude": 40.7128,
                    "longitude": -74.0060,
                    "accuracy": 10.0
                },
                "trigger_method": "voice_trigger",
                "trigger_word_used": "Street Shield emergency"
            }
            response = self.session.post(f"{self.base_url}/emergency/report", json=emergency_data)
            if response.status_code in [200, 201]:
                emergency_response = response.json()
                self.log_test(
                    "POST /api/emergency/report - Report emergency",
                    True,
                    f"Emergency reported with ID: {emergency_response.get('id')}",
                    emergency_response
                )
            else:
                self.log_test(
                    "POST /api/emergency/report - Report emergency",
                    False,
                    f"Expected 200/201, got {response.status_code}",
                    response.text
                )
                
            # 5. Test DELETE /api/emergency/contacts/{contact_id} - Delete contact
            if created_contact_id:
                response = self.session.delete(f"{self.base_url}/emergency/contacts/{created_contact_id}")
                if response.status_code in [200, 204]:
                    self.log_test(
                        "DELETE /api/emergency/contacts/{id} - Delete contact",
                        True,
                        f"Successfully deleted contact {created_contact_id}"
                    )
                else:
                    self.log_test(
                        "DELETE /api/emergency/contacts/{id} - Delete contact",
                        False,
                        f"Expected 200/204, got {response.status_code}",
                        response.text
                    )
                    
            # 6. Test phone number validation
            invalid_contact = {
                "user_id": user_id,
                "name": "Invalid Contact",
                "phone_number": "invalid-phone",
                "relationship": "friend"
            }
            response = self.session.post(f"{self.base_url}/emergency/contacts", json=invalid_contact)
            if response.status_code == 422:  # Validation error expected
                self.log_test(
                    "Phone number validation test",
                    True,
                    "Correctly rejected invalid phone number"
                )
            else:
                self.log_test(
                    "Phone number validation test",
                    False,
                    f"Expected 422 validation error, got {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Emergency Contact Management System",
                False,
                f"Exception occurred: {str(e)}"
            )

    def test_enhanced_health_monitoring(self):
        """Test Enhanced Health Monitoring with Medical Accuracy"""
        print("❤️ Testing Enhanced Health Monitoring System...")
        
        user_id = "health_test_user_" + str(uuid.uuid4())[:8]
        
        try:
            # Test scenarios with different health conditions
            test_scenarios = [
                {
                    "name": "Normal heart rate scenario",
                    "data": {
                        "user_id": user_id,
                        "heart_rate": 75,
                        "blood_oxygen": 98,
                        "stress_level": 0.3,
                        "activity_level": "light",
                        "user_age": 30,
                        "user_fitness_level": "average"
                    },
                    "expected_alerts": 0
                },
                {
                    "name": "High heart rate scenario (165+ BPM)",
                    "data": {
                        "user_id": user_id,
                        "heart_rate": 170,
                        "blood_oxygen": 96,
                        "stress_level": 0.6,
                        "activity_level": "vigorous",
                        "user_age": 35,
                        "user_fitness_level": "average"
                    },
                    "expected_alerts": 1
                },
                {
                    "name": "Critical heart rate scenario (185+ BPM)",
                    "data": {
                        "user_id": user_id,
                        "heart_rate": 190,
                        "blood_oxygen": 94,
                        "stress_level": 0.8,
                        "activity_level": "maximum",
                        "user_age": 40,
                        "user_fitness_level": "below_average"
                    },
                    "expected_alerts": 2
                },
                {
                    "name": "High stress scenario (0.8+)",
                    "data": {
                        "user_id": user_id,
                        "heart_rate": 85,
                        "blood_oxygen": 97,
                        "stress_level": 0.85,
                        "activity_level": "moderate",
                        "user_age": 28,
                        "user_fitness_level": "average"
                    },
                    "expected_alerts": 1
                },
                {
                    "name": "Low blood oxygen scenario (<90%)",
                    "data": {
                        "user_id": user_id,
                        "heart_rate": 80,
                        "blood_oxygen": 88,
                        "stress_level": 0.4,
                        "activity_level": "light",
                        "user_age": 32,
                        "user_fitness_level": "average"
                    },
                    "expected_alerts": 1
                },
                {
                    "name": "Heat exhaustion scenario",
                    "data": {
                        "user_id": user_id,
                        "heart_rate": 165,
                        "blood_oxygen": 95,
                        "stress_level": 0.7,
                        "activity_level": "vigorous",
                        "ambient_temperature": 35.0,
                        "user_age": 25,
                        "user_fitness_level": "average"
                    },
                    "expected_alerts": 2
                }
            ]
            
            # Test each scenario
            for scenario in test_scenarios:
                response = self.session.post(f"{self.base_url}/health/biometric-analysis", json=scenario["data"])
                
                if response.status_code == 200:
                    health_response = response.json()
                    alerts = health_response.get('alerts', [])
                    
                    # Check if medical thresholds are working
                    success = True
                    details = f"Generated {len(alerts)} alerts"
                    
                    # Verify critical conditions trigger emergency
                    if scenario["data"]["heart_rate"] >= 185 or scenario["data"]["blood_oxygen"] <= 90:
                        emergency_alerts = [a for a in alerts if a.get('auto_emergency', False)]
                        if not emergency_alerts:
                            success = False
                            details += " - CRITICAL: No emergency alert for dangerous condition"
                    
                    # Verify high stress detection
                    if scenario["data"]["stress_level"] >= 0.8:
                        stress_alerts = [a for a in alerts if 'stress' in a.get('alert_type', '').lower()]
                        if not stress_alerts:
                            success = False
                            details += " - Missing stress alert"
                    
                    # Verify heat exhaustion detection
                    if scenario["data"].get("ambient_temperature", 0) > 30 and scenario["data"]["heart_rate"] > 160:
                        heat_alerts = [a for a in alerts if 'heat' in a.get('alert_type', '').lower()]
                        if not heat_alerts:
                            success = False
                            details += " - Missing heat stress alert"
                    
                    self.log_test(
                        f"POST /api/health/biometric-analysis - {scenario['name']}",
                        success,
                        details,
                        {"alerts_count": len(alerts), "alerts": [a.get('alert_type') for a in alerts]}
                    )
                else:
                    self.log_test(
                        f"POST /api/health/biometric-analysis - {scenario['name']}",
                        False,
                        f"Expected 200, got {response.status_code}",
                        response.text
                    )
            
            # Test GET /api/health/history endpoint
            response = self.session.get(f"{self.base_url}/health/history")
            if response.status_code == 200:
                history = response.json()
                self.log_test(
                    "GET /api/health/history - Retrieve health history",
                    True,
                    f"Retrieved health history with {len(history)} entries",
                    {"count": len(history)}
                )
            else:
                self.log_test(
                    "GET /api/health/history - Retrieve health history",
                    False,
                    f"Expected 200, got {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Enhanced Health Monitoring System",
                False,
                f"Exception occurred: {str(e)}"
            )

    def test_cycling_mode_safety(self):
        """Test Cycling Mode Safety System"""
        print("🚴 Testing Cycling Mode Safety System...")
        
        user_id = "cycling_test_user_" + str(uuid.uuid4())[:8]
        
        try:
            # Test cycling threat detection scenarios
            cycling_scenarios = [
                {
                    "name": "Vehicle proximity detection",
                    "data": {
                        "user_id": user_id,
                        "location": {
                            "latitude": 40.7589,
                            "longitude": -73.9851,
                            "accuracy": 5.0
                        },
                        "cycling_context": {
                            "speed_kmh": 25.0,
                            "avg_speed_kmh": 22.0,
                            "road_type": "road",
                            "traffic_density": "heavy",
                            "bike_type": "road",
                            "rider_experience": "intermediate",
                            "time_of_ride": "day"
                        },
                        "movement_history": [
                            {"latitude": 40.7588, "longitude": -73.9850, "timestamp": datetime.utcnow().isoformat()},
                            {"latitude": 40.7587, "longitude": -73.9849, "timestamp": datetime.utcnow().isoformat()}
                        ]
                    }
                },
                {
                    "name": "Road surface hazard detection",
                    "data": {
                        "user_id": user_id,
                        "location": {
                            "latitude": 40.7580,
                            "longitude": -73.9840,
                            "accuracy": 8.0
                        },
                        "cycling_context": {
                            "speed_kmh": 30.0,
                            "road_type": "mixed",
                            "traffic_density": "medium",
                            "bike_type": "road",
                            "rider_experience": "advanced"
                        }
                    }
                },
                {
                    "name": "Intersection warning scenario",
                    "data": {
                        "user_id": user_id,
                        "location": {
                            "latitude": 40.7570,
                            "longitude": -73.9830,
                            "accuracy": 3.0
                        },
                        "cycling_context": {
                            "speed_kmh": 20.0,
                            "road_type": "bike_lane",
                            "traffic_density": "heavy",
                            "bike_type": "electric",
                            "rider_experience": "beginner"
                        },
                        "movement_history": [
                            {"latitude": 40.7572, "longitude": -73.9832, "timestamp": datetime.utcnow().isoformat()},
                            {"latitude": 40.7571, "longitude": -73.9831, "timestamp": datetime.utcnow().isoformat()},
                            {"latitude": 40.7570, "longitude": -73.9830, "timestamp": datetime.utcnow().isoformat()}
                        ]
                    }
                },
                {
                    "name": "Blind spot detection",
                    "data": {
                        "user_id": user_id,
                        "location": {
                            "latitude": 40.7560,
                            "longitude": -73.9820,
                            "accuracy": 4.0
                        },
                        "cycling_context": {
                            "speed_kmh": 18.0,
                            "road_type": "road",
                            "traffic_density": "heavy",
                            "bike_type": "mountain",
                            "rider_experience": "intermediate",
                            "group_riding": False
                        }
                    }
                }
            ]
            
            # Test each cycling scenario
            for scenario in cycling_scenarios:
                response = self.session.post(f"{self.base_url}/cycling/threats", json=scenario["data"])
                
                if response.status_code == 200:
                    cycling_response = response.json()
                    threats = cycling_response.get('threats', [])
                    
                    # Verify cycling-specific threat detection
                    success = True
                    details = f"Detected {len(threats)} cycling threats"
                    
                    # Check for cycling-specific threat types
                    threat_types = [t.get('threat_type') for t in threats]
                    expected_types = ['vehicle_behind', 'door_zone', 'intersection', 'road_hazard', 'wind_gust']
                    
                    if threats:
                        # Verify threat levels and recommendations are appropriate
                        for threat in threats:
                            if not threat.get('threat_type') or not threat.get('recommended_action'):
                                success = False
                                details += " - Missing threat details"
                                break
                            
                            # Verify cycling-specific recommendations
                            action = threat.get('recommended_action', '')
                            cycling_actions = ['move_right', 'move_left_safe', 'reduce_speed_scan', 'avoid_obstacle', 'grip_handlebars_firm']
                            if not any(ca in action for ca in cycling_actions):
                                details += f" - Non-cycling action: {action}"
                    
                    self.log_test(
                        f"POST /api/cycling/threats - {scenario['name']}",
                        success,
                        details,
                        {"threats_count": len(threats), "threat_types": threat_types}
                    )
                else:
                    self.log_test(
                        f"POST /api/cycling/threats - {scenario['name']}",
                        False,
                        f"Expected 200, got {response.status_code}",
                        response.text
                    )
            
            # Test GET /api/cycling/data - Retrieve cycling history
            response = self.session.get(f"{self.base_url}/cycling/data")
            if response.status_code == 200:
                cycling_data = response.json()
                self.log_test(
                    "GET /api/cycling/data - Retrieve cycling history",
                    True,
                    f"Retrieved cycling data with {len(cycling_data)} entries",
                    {"count": len(cycling_data)}
                )
            else:
                self.log_test(
                    "GET /api/cycling/data - Retrieve cycling history",
                    False,
                    f"Expected 200, got {response.status_code}",
                    response.text
                )
                
            # Test cycling model validation
            invalid_cycling_data = {
                "user_id": user_id,
                "location": {
                    "latitude": "invalid",  # Should be float
                    "longitude": -73.9820
                },
                "cycling_context": {
                    "speed_kmh": -10  # Invalid negative speed
                }
            }
            response = self.session.post(f"{self.base_url}/cycling/threats", json=invalid_cycling_data)
            if response.status_code == 422:  # Validation error expected
                self.log_test(
                    "Cycling data validation test",
                    True,
                    "Correctly rejected invalid cycling data"
                )
            else:
                self.log_test(
                    "Cycling data validation test",
                    False,
                    f"Expected 422 validation error, got {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "Cycling Mode Safety System",
                False,
                f"Exception occurred: {str(e)}"
            )

    def run_all_tests(self):
        """Run all backend tests"""
        print("🧪 Starting Street Shield Backend API Tests...")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)
        
        # Test all three high-priority features
        self.test_emergency_contact_management()
        self.test_enhanced_health_monitoring()
        self.test_cycling_mode_safety()
        
        # Generate summary
        self.generate_summary()
        
    def generate_summary(self):
        """Generate test summary"""
        print("=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = len([t for t in self.test_results if t['success']])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests} ✅")
        print(f"Failed: {failed_tests} ❌")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        print()
        
        if failed_tests > 0:
            print("❌ FAILED TESTS:")
            for test in self.test_results:
                if not test['success']:
                    print(f"  - {test['test']}: {test['details']}")
            print()
        
        # Feature-specific summary
        emergency_tests = [t for t in self.test_results if 'emergency' in t['test'].lower()]
        health_tests = [t for t in self.test_results if 'health' in t['test'].lower() or 'biometric' in t['test'].lower()]
        cycling_tests = [t for t in self.test_results if 'cycling' in t['test'].lower()]
        
        print("📋 FEATURE SUMMARY:")
        print(f"Emergency Contact Management: {len([t for t in emergency_tests if t['success']])}/{len(emergency_tests)} tests passed")
        print(f"Enhanced Health Monitoring: {len([t for t in health_tests if t['success']])}/{len(health_tests)} tests passed")
        print(f"Cycling Mode Safety: {len([t for t in cycling_tests if t['success']])}/{len(cycling_tests)} tests passed")
        
        return passed_tests == total_tests

if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)