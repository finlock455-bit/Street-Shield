#!/usr/bin/env python3
"""
Street Shield Store-Compliance Rebrand Testing
Tests the backend API at https://street-shield-demo.preview.emergentagent.com
to verify store-compliance rebrand changes.
"""

import requests
import json
import sys
from datetime import datetime

# Backend URL from frontend/.env
BACKEND_URL = "https://street-shield-demo.preview.emergentagent.com"

# Forbidden words that should NOT appear in any response
FORBIDDEN_WORDS = [
    "panic button", "panic", "SOS", "medical attention required", 
    "Call emergency services immediately", "call emergency services", 
    "ambulance", "hospital", "911", "112", "emergency services", 
    "medical attention", "call your local authorities"
]

# Required words that SHOULD appear in app-info
REQUIRED_WORDS = [
    "Quick Alert Button", "Activity Insights", "Offline Safety Mode", 
    "Voice-Activated Alerts", "disclaimer"
]

# Forbidden feature names that should NOT appear in app-info
FORBIDDEN_FEATURES = [
    "Emergency Panic Button", "Emergency SOS", "Health Monitoring", 
    "Offline Emergency Mode", "Voice-Activated SOS"
]

def check_forbidden_words(text, endpoint_name):
    """Check if response contains any forbidden words"""
    issues = []
    text_lower = text.lower()
    
    for word in FORBIDDEN_WORDS:
        if word.lower() in text_lower:
            issues.append(f"❌ FORBIDDEN WORD FOUND in {endpoint_name}: '{word}'")
    
    return issues

def test_health_endpoint():
    """Test GET /api/health endpoint"""
    print("\n🔍 Testing GET /api/health...")
    try:
        response = requests.get(f"{BACKEND_URL}/api/health", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            
            # Check for forbidden words
            response_text = json.dumps(data)
            issues = check_forbidden_words(response_text, "GET /api/health")
            
            if data.get("status") == "healthy":
                print("✅ Health endpoint returns healthy status")
            else:
                print("❌ Health endpoint does not return healthy status")
                
            return len(issues) == 0, issues
        else:
            print(f"❌ Health endpoint failed with status {response.status_code}")
            return False, [f"Health endpoint returned {response.status_code}"]
            
    except Exception as e:
        print(f"❌ Error testing health endpoint: {e}")
        return False, [f"Health endpoint error: {e}"]

def test_app_info_endpoint():
    """Test GET /api/app-info endpoint for rebranded content"""
    print("\n🔍 Testing GET /api/app-info...")
    try:
        response = requests.get(f"{BACKEND_URL}/api/app-info", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            
            response_text = json.dumps(data)
            issues = []
            
            # Check for forbidden words
            issues.extend(check_forbidden_words(response_text, "GET /api/app-info"))
            
            # Check for forbidden feature names
            features = data.get("features", [])
            for feature in features:
                feature_name = feature.get("name", "")
                for forbidden in FORBIDDEN_FEATURES:
                    if forbidden.lower() in feature_name.lower():
                        issues.append(f"❌ FORBIDDEN FEATURE FOUND: '{feature_name}' contains '{forbidden}'")
            
            # Check for required words
            for required in REQUIRED_WORDS:
                if required.lower() not in response_text.lower():
                    issues.append(f"❌ REQUIRED WORD MISSING: '{required}' not found in app-info")
            
            # Check for disclaimer field
            if "disclaimer" not in data:
                issues.append("❌ MISSING FIELD: 'disclaimer' field not found in app-info")
            else:
                print("✅ Disclaimer field present")
            
            # Check use cases for forbidden words
            use_cases = data.get("use_cases", [])
            for use_case in use_cases:
                if "emergency alerts" in use_case.lower() or "protection" in use_case.lower():
                    issues.append(f"❌ FORBIDDEN USE CASE: '{use_case}' contains forbidden words")
            
            if len(issues) == 0:
                print("✅ App-info endpoint passes all rebrand checks")
            
            return len(issues) == 0, issues
        else:
            print(f"❌ App-info endpoint failed with status {response.status_code}")
            return False, [f"App-info endpoint returned {response.status_code}"]
            
    except Exception as e:
        print(f"❌ Error testing app-info endpoint: {e}")
        return False, [f"App-info endpoint error: {e}"]

def test_root_endpoint():
    """Test GET /api/ (root API) endpoint"""
    print("\n🔍 Testing GET /api/ (root API)...")
    try:
        response = requests.get(f"{BACKEND_URL}/api/", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            
            response_text = json.dumps(data)
            issues = []
            
            # Check for forbidden words
            issues.extend(check_forbidden_words(response_text, "GET /api/"))
            
            # Check if it says "safety awareness" not "protection"
            message = data.get("message", "").lower()
            if "safety awareness" in message:
                print("✅ Root endpoint contains 'safety awareness'")
            else:
                issues.append("❌ Root endpoint should contain 'safety awareness'")
                
            if "protection" in message:
                issues.append("❌ Root endpoint should NOT contain 'protection'")
            
            return len(issues) == 0, issues
        else:
            print(f"❌ Root endpoint failed with status {response.status_code}")
            return False, [f"Root endpoint returned {response.status_code}"]
            
    except Exception as e:
        print(f"❌ Error testing root endpoint: {e}")
        return False, [f"Root endpoint error: {e}"]

def test_biometric_analysis_endpoint():
    """Test POST /api/health/biometric-analysis with high heart rate data"""
    print("\n🔍 Testing POST /api/health/biometric-analysis...")
    try:
        # Test data with high heart rate as specified in review request
        test_data = {
            "heart_rate": 210,
            "blood_pressure": {
                "systolic": 185,
                "diastolic": 125
            },
            "blood_oxygen": 88,
            "stress_level": 95,
            "user_age": 30
        }
        
        # The endpoint expects BiometricData and LocationData
        payload = {
            "biometric_data": {
                "heart_rate": 210,
                "blood_pressure_systolic": 185,
                "blood_pressure_diastolic": 125,
                "blood_oxygen": 88,
                "stress_level": 0.95,  # Convert to 0-1 scale
                "user_age": 30,
                "activity_level": "vigorous",
                "user_fitness_level": "average"
            },
            "location": {
                "latitude": 51.5074,
                "longitude": -0.1278
            },
            "safety_context": {}
        }
        
        response = requests.post(f"{BACKEND_URL}/api/health/biometric-analysis", 
                               json=payload, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            
            response_text = json.dumps(data)
            issues = []
            
            # Check for forbidden words
            issues.extend(check_forbidden_words(response_text, "POST /api/health/biometric-analysis"))
            
            # Check for softer language requirements
            if "consider stopping" in response_text.lower():
                print("✅ Contains softer language: 'consider stopping'")
            if "rest" in response_text.lower():
                print("✅ Contains softer language: 'rest'")
            if "feel unwell" in response_text.lower():
                print("✅ Contains softer language: 'feel unwell'")
            
            return len(issues) == 0, issues
        else:
            print(f"❌ Biometric analysis endpoint failed with status {response.status_code}")
            if response.status_code == 422:
                print(f"Validation error: {response.text}")
            return False, [f"Biometric analysis endpoint returned {response.status_code}"]
            
    except Exception as e:
        print(f"❌ Error testing biometric analysis endpoint: {e}")
        return False, [f"Biometric analysis endpoint error: {e}"]

def test_emergency_trigger_endpoint():
    """Test POST /api/emergency/trigger endpoint"""
    print("\n🔍 Testing POST /api/emergency/trigger...")
    try:
        # Test data as specified in review request
        payload = {
            "user_id": "test_user_rebrand",
            "location": {
                "latitude": 51.5074,
                "longitude": -0.1278
            },
            "trigger_method": "voice_trigger",
            "trigger_word_used": "RedAlert"
        }
        
        response = requests.post(f"{BACKEND_URL}/api/emergency/trigger", 
                               json=payload, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        # This endpoint might return 404 if no emergency settings exist for user
        # That's expected behavior, we just want to verify it functions
        if response.status_code in [200, 404]:
            if response.status_code == 200:
                data = response.json()
                print(f"Response: {json.dumps(data, indent=2)}")
                response_text = json.dumps(data)
            else:
                print("Expected 404 - no emergency settings for test user")
                response_text = response.text
            
            issues = []
            # Check for forbidden words
            issues.extend(check_forbidden_words(response_text, "POST /api/emergency/trigger"))
            
            print("✅ Emergency trigger endpoint functions correctly")
            return len(issues) == 0, issues
        else:
            print(f"❌ Emergency trigger endpoint failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False, [f"Emergency trigger endpoint returned {response.status_code}"]
            
    except Exception as e:
        print(f"❌ Error testing emergency trigger endpoint: {e}")
        return False, [f"Emergency trigger endpoint error: {e}"]

def main():
    """Run all rebrand compliance tests"""
    print("🧪 STREET SHIELD STORE-COMPLIANCE REBRAND TESTING")
    print("=" * 60)
    print(f"Testing backend at: {BACKEND_URL}")
    print(f"Test started at: {datetime.now()}")
    
    all_tests_passed = True
    all_issues = []
    
    # Run all tests
    tests = [
        ("Health Endpoint", test_health_endpoint),
        ("App Info Endpoint", test_app_info_endpoint),
        ("Root API Endpoint", test_root_endpoint),
        ("Biometric Analysis Endpoint", test_biometric_analysis_endpoint),
        ("Emergency Trigger Endpoint", test_emergency_trigger_endpoint)
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        try:
            passed, issues = test_func()
            results[test_name] = passed
            if not passed:
                all_tests_passed = False
                all_issues.extend(issues)
        except Exception as e:
            print(f"❌ Test {test_name} failed with exception: {e}")
            results[test_name] = False
            all_tests_passed = False
            all_issues.append(f"Test {test_name} exception: {e}")
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    
    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} {test_name}")
    
    if all_issues:
        print("\n🚨 ISSUES FOUND:")
        for issue in all_issues:
            print(f"  {issue}")
    
    print(f"\n🎯 OVERALL RESULT: {'✅ ALL TESTS PASSED' if all_tests_passed else '❌ SOME TESTS FAILED'}")
    print(f"Tests completed at: {datetime.now()}")
    
    return 0 if all_tests_passed else 1

if __name__ == "__main__":
    sys.exit(main())