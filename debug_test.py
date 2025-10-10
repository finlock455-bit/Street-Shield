#!/usr/bin/env python3
"""
Debug test for SafeWalk API issues
"""

import requests
import json
from datetime import datetime

BASE_URL = "https://shield-alert-1.preview.emergentagent.com/api"

def test_community_report_debug():
    """Debug community report and alert creation"""
    print("🔍 Debugging Community Report and Alert Creation...")
    
    # Test community report
    report_payload = {
        "location": {
            "latitude": 40.7128,
            "longitude": -74.0060,
            "altitude": 10.0,
            "accuracy": 5.0,
            "timestamp": datetime.utcnow().isoformat()
        },
        "report_type": "hazard",
        "description": "Debug test - icy sidewalk conditions",
        "severity": "high",
        "user_id": "debug_user_123"
    }
    
    print("Submitting community report...")
    try:
        response = requests.post(
            f"{BASE_URL}/community/report",
            json=report_payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            print("✅ Community report submitted successfully")
        else:
            print(f"❌ Community report failed: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error submitting community report: {e}")

def test_alerts_debug():
    """Debug alerts retrieval"""
    print("\n🔍 Debugging Alerts Retrieval...")
    
    try:
        lat, lon, radius = 40.7128, -74.0060, 1000
        response = requests.get(f"{BASE_URL}/safety/alerts/{lat}/{lon}/{radius}", timeout=30)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            alerts = data.get("alerts", [])
            print(f"✅ Retrieved {len(alerts)} alerts")
            if alerts:
                print("Alert details:")
                for i, alert in enumerate(alerts):
                    print(f"  Alert {i+1}: {alert}")
        else:
            print(f"❌ Alerts retrieval failed: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error retrieving alerts: {e}")

def test_safety_analysis_debug():
    """Debug safety analysis with detailed output"""
    print("\n🔍 Debugging Safety Analysis...")
    
    payload = {
        "location": {
            "latitude": 40.7128,
            "longitude": -74.0060,
            "altitude": 10.0,
            "accuracy": 5.0,
            "timestamp": datetime.utcnow().isoformat()
        },
        "user_context": {
            "user_id": "debug_user_123",
            "activity": "walking",
            "speed": 1.2
        }
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/safety/analyze",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Safety analysis successful")
            print(f"Overall Score: {data.get('safety_score', {}).get('overall_score', 'N/A')}")
            print(f"Weather Condition: {data.get('weather', {}).get('weather_condition', 'N/A')}")
            print(f"AI Analysis: {data.get('ai_analysis', 'N/A')}")
        else:
            print(f"❌ Safety analysis failed: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Error in safety analysis: {e}")

if __name__ == "__main__":
    test_community_report_debug()
    test_alerts_debug()
    test_safety_analysis_debug()