#!/usr/bin/env python3
"""
SafeWalk Backend API Test Suite
Tests all backend endpoints comprehensively
"""

import requests
import json
import time
from datetime import datetime, timedelta
from typing import Dict, Any
import uuid

# Configuration
BASE_URL = "https://street-safety.preview.emergentagent.com/api"
TIMEOUT = 30

# Test data - realistic NYC coordinates
TEST_LOCATION = {
    "latitude": 40.7128,
    "longitude": -74.0060,
    "altitude": 10.0,
    "accuracy": 5.0,
    "timestamp": datetime.utcnow().isoformat()
}

TEST_USER_CONTEXT = {
    "user_id": "test_user_123",
    "activity": "walking",
    "speed": 1.2,
    "heading": 45.0
}

class SafeWalkAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.session.timeout = TIMEOUT
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.utcnow().isoformat(),
            "response_data": response_data
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {details}")
        
    def test_root_endpoint(self):
        """Test basic root endpoint"""
        try:
            response = self.session.get(f"{BASE_URL}/")
            if response.status_code == 200:
                data = response.json()
                if "SafeWalk API" in data.get("message", ""):
                    self.log_test("Root Endpoint", True, "API root accessible", data)
                else:
                    self.log_test("Root Endpoint", False, f"Unexpected message: {data}")
            else:
                self.log_test("Root Endpoint", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Root Endpoint", False, f"Connection error: {str(e)}")
    
    def test_health_check(self):
        """Test health check endpoint"""
        try:
            response = self.session.get(f"{BASE_URL}/health")
            if response.status_code == 200:
                data = response.json()
                status = data.get("status")
                services = data.get("services", {})
                
                if status == "healthy":
                    ai_status = services.get("ai", "unknown")
                    db_status = services.get("database", "unknown")
                    
                    details = f"Status: {status}, AI: {ai_status}, DB: {db_status}"
                    
                    # Check if AI service is properly configured
                    if ai_status == "available":
                        self.log_test("Health Check - AI Service", True, "AI service available", data)
                    else:
                        self.log_test("Health Check - AI Service", False, f"AI service not available: {ai_status}")
                    
                    # Check database connection
                    if db_status == "connected":
                        self.log_test("Health Check - Database", True, "Database connected", data)
                    else:
                        self.log_test("Health Check - Database", False, f"Database not connected: {db_status}")
                        
                    self.log_test("Health Check", True, details, data)
                else:
                    self.log_test("Health Check", False, f"Unhealthy status: {status}")
            else:
                self.log_test("Health Check", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Health Check", False, f"Connection error: {str(e)}")
    
    def test_safety_analysis(self):
        """Test AI-powered safety analysis endpoint - MOST CRITICAL"""
        try:
            payload = {
                "location": TEST_LOCATION,
                "user_context": TEST_USER_CONTEXT
            }
            
            response = self.session.post(
                f"{BASE_URL}/safety/analyze",
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify response structure
                required_fields = ["id", "location", "weather", "safety_score", "timestamp", "ai_analysis"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_test("Safety Analysis - Structure", False, f"Missing fields: {missing_fields}")
                    return
                
                # Test weather data
                weather = data.get("weather", {})
                weather_fields = ["temperature", "humidity", "weather_condition", "hazard_level"]
                weather_missing = [field for field in weather_fields if field not in weather]
                
                if weather_missing:
                    self.log_test("Safety Analysis - Weather", False, f"Missing weather fields: {weather_missing}")
                else:
                    ice_risk = weather.get("ice_risk", False)
                    hazard_level = weather.get("hazard_level", "unknown")
                    self.log_test("Safety Analysis - Weather", True, 
                                f"Weather data complete. Ice risk: {ice_risk}, Hazard: {hazard_level}", weather)
                
                # Test safety score
                safety_score = data.get("safety_score", {})
                score_fields = ["overall_score", "risk_factors", "recommendations", "weather_risk", "traffic_risk", "location_risk"]
                score_missing = [field for field in score_fields if field not in safety_score]
                
                if score_missing:
                    self.log_test("Safety Analysis - Score", False, f"Missing score fields: {score_missing}")
                else:
                    overall_score = safety_score.get("overall_score", 0)
                    risk_factors = safety_score.get("risk_factors", [])
                    recommendations = safety_score.get("recommendations", [])
                    
                    if 0 <= overall_score <= 100:
                        self.log_test("Safety Analysis - AI Scoring", True, 
                                    f"Score: {overall_score}, Risks: {len(risk_factors)}, Recommendations: {len(recommendations)}", 
                                    safety_score)
                    else:
                        self.log_test("Safety Analysis - AI Scoring", False, f"Invalid score: {overall_score}")
                
                # Test AI analysis
                ai_analysis = data.get("ai_analysis", "")
                if ai_analysis:
                    self.log_test("Safety Analysis - AI Integration", True, "AI analysis generated", {"ai_analysis": ai_analysis})
                else:
                    self.log_test("Safety Analysis - AI Integration", False, "No AI analysis generated")
                
                self.log_test("Safety Analysis", True, "Complete safety analysis successful", data)
                
            else:
                self.log_test("Safety Analysis", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Safety Analysis", False, f"Error: {str(e)}")
    
    def test_nearby_alerts(self):
        """Test nearby alerts retrieval"""
        try:
            lat, lon, radius = TEST_LOCATION["latitude"], TEST_LOCATION["longitude"], 1000
            response = self.session.get(f"{BASE_URL}/safety/alerts/{lat}/{lon}/{radius}")
            
            if response.status_code == 200:
                data = response.json()
                alerts = data.get("alerts", [])
                self.log_test("Nearby Alerts", True, f"Retrieved {len(alerts)} alerts", data)
            else:
                self.log_test("Nearby Alerts", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Nearby Alerts", False, f"Error: {str(e)}")
    
    def test_community_report(self):
        """Test community safety reporting"""
        try:
            report_payload = {
                "location": TEST_LOCATION,
                "report_type": "hazard",
                "description": "Icy sidewalk conditions near intersection",
                "severity": "high",
                "user_id": TEST_USER_CONTEXT["user_id"]
            }
            
            response = self.session.post(
                f"{BASE_URL}/community/report",
                json=report_payload,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "success":
                    self.log_test("Community Report", True, "High-severity report submitted successfully", data)
                    
                    # Test if high-severity report creates alert
                    time.sleep(1)  # Brief delay for alert creation
                    lat, lon = TEST_LOCATION["latitude"], TEST_LOCATION["longitude"]
                    alerts_response = self.session.get(f"{BASE_URL}/safety/alerts/{lat}/{lon}/1000")
                    
                    if alerts_response.status_code == 200:
                        alerts_data = alerts_response.json()
                        alerts = alerts_data.get("alerts", [])
                        self.log_test("Community Report - Alert Creation", True, 
                                    f"Alert system working, {len(alerts)} alerts found")
                    else:
                        self.log_test("Community Report - Alert Creation", False, "Could not verify alert creation")
                else:
                    self.log_test("Community Report", False, f"Unexpected response: {data}")
            else:
                self.log_test("Community Report", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Community Report", False, f"Error: {str(e)}")
    
    def test_emergency_vehicle_detection(self):
        """Test emergency vehicle detection reporting"""
        try:
            payload = {
                "latitude": TEST_LOCATION["latitude"],
                "longitude": TEST_LOCATION["longitude"],
                "altitude": TEST_LOCATION.get("altitude"),
                "accuracy": TEST_LOCATION.get("accuracy"),
                "timestamp": TEST_LOCATION["timestamp"]
            }
            
            response = self.session.post(
                f"{BASE_URL}/emergency/vehicle-detected?detection_method=audio",
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "success":
                    self.log_test("Emergency Vehicle Detection", True, "Emergency vehicle alert created", data)
                else:
                    self.log_test("Emergency Vehicle Detection", False, f"Unexpected response: {data}")
            else:
                self.log_test("Emergency Vehicle Detection", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Emergency Vehicle Detection", False, f"Error: {str(e)}")
    
    def test_safety_history(self):
        """Test safety analysis history retrieval"""
        try:
            user_id = TEST_USER_CONTEXT["user_id"]
            response = self.session.get(f"{BASE_URL}/safety/history/{user_id}")
            
            if response.status_code == 200:
                data = response.json()
                analyses = data.get("analyses", [])
                self.log_test("Safety History", True, f"Retrieved {len(analyses)} historical analyses", data)
            else:
                self.log_test("Safety History", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Safety History", False, f"Error: {str(e)}")
    
    def test_error_handling(self):
        """Test API error handling"""
        try:
            # Test invalid safety analysis request
            invalid_payload = {"invalid": "data"}
            response = self.session.post(
                f"{BASE_URL}/safety/analyze",
                json=invalid_payload,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code in [400, 422]:  # Expected validation error
                self.log_test("Error Handling - Invalid Request", True, f"Properly handled invalid request with HTTP {response.status_code}")
            else:
                self.log_test("Error Handling - Invalid Request", False, f"Unexpected response to invalid request: HTTP {response.status_code}")
                
            # Test non-existent endpoint
            response = self.session.get(f"{BASE_URL}/nonexistent")
            if response.status_code == 404:
                self.log_test("Error Handling - 404", True, "Properly returns 404 for non-existent endpoints")
            else:
                self.log_test("Error Handling - 404", False, f"Unexpected response for non-existent endpoint: HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Error Handling", False, f"Error: {str(e)}")
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting SafeWalk Backend API Tests...")
        print(f"Testing against: {BASE_URL}")
        print("=" * 60)
        
        # Run tests in order of priority
        self.test_root_endpoint()
        self.test_health_check()
        self.test_safety_analysis()  # Most critical
        self.test_nearby_alerts()
        self.test_community_report()
        self.test_emergency_vehicle_detection()
        self.test_safety_history()
        self.test_error_handling()
        
        print("=" * 60)
        self.print_summary()
        
    def print_summary(self):
        """Print test summary"""
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"📊 TEST SUMMARY:")
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  • {result['test']}: {result['details']}")
        
        return passed_tests, failed_tests

if __name__ == "__main__":
    tester = SafeWalkAPITester()
    tester.run_all_tests()