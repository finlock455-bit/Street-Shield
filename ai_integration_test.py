#!/usr/bin/env python3
"""
AI Integration Test for SafeWalk - Test Gemini AI responses
"""

import requests
import json
from datetime import datetime

BASE_URL = "https://street-shield-demo.preview.emergentagent.com/api"

def test_ai_integration_scenarios():
    """Test AI integration with different scenarios"""
    print("🤖 Testing AI Integration Scenarios...")
    
    scenarios = [
        {
            "name": "Rainy Weather Scenario",
            "location": {"latitude": 40.7128, "longitude": -74.0060, "timestamp": datetime.utcnow().isoformat()},
            "user_context": {"activity": "running", "speed": 2.5, "user_id": "ai_test_1"}
        },
        {
            "name": "Night Walking Scenario", 
            "location": {"latitude": 37.7749, "longitude": -122.4194, "timestamp": datetime.utcnow().isoformat()},
            "user_context": {"activity": "walking", "speed": 1.0, "time_of_day": "night", "user_id": "ai_test_2"}
        },
        {
            "name": "High Traffic Area",
            "location": {"latitude": 40.7589, "longitude": -73.9851, "timestamp": datetime.utcnow().isoformat()},
            "user_context": {"activity": "walking", "speed": 1.2, "area_type": "busy_street", "user_id": "ai_test_3"}
        }
    ]
    
    for scenario in scenarios:
        print(f"\n🔍 Testing: {scenario['name']}")
        
        try:
            response = requests.post(
                f"{BASE_URL}/safety/analyze",
                json=scenario,
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                safety_score = data.get("safety_score", {})
                weather = data.get("weather", {})
                
                print(f"  ✅ Overall Score: {safety_score.get('overall_score', 'N/A')}")
                print(f"  🌤️  Weather: {weather.get('weather_condition', 'N/A')} (Hazard: {weather.get('hazard_level', 'N/A')})")
                print(f"  🚨 Risk Factors: {len(safety_score.get('risk_factors', []))}")
                print(f"  💡 Recommendations: {len(safety_score.get('recommendations', []))}")
                print(f"  🤖 AI Analysis: {data.get('ai_analysis', 'N/A')}")
                
                # Verify AI is providing meaningful data
                if safety_score.get('overall_score', 0) > 0:
                    print(f"  ✅ AI scoring working")
                else:
                    print(f"  ❌ AI scoring may not be working properly")
                    
            else:
                print(f"  ❌ Failed: HTTP {response.status_code}")
                
        except Exception as e:
            print(f"  ❌ Error: {e}")

def test_gemini_availability():
    """Test if Gemini AI service is properly configured"""
    print("\n🔍 Testing Gemini AI Service Availability...")
    
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=30)
        if response.status_code == 200:
            data = response.json()
            ai_status = data.get("services", {}).get("ai", "unknown")
            
            if ai_status == "available":
                print("✅ Gemini AI service is available and configured")
                return True
            else:
                print(f"❌ Gemini AI service status: {ai_status}")
                return False
        else:
            print(f"❌ Health check failed: HTTP {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error checking AI service: {e}")
        return False

if __name__ == "__main__":
    print("🚀 SafeWalk AI Integration Test")
    print("=" * 50)
    
    # Test AI service availability first
    ai_available = test_gemini_availability()
    
    if ai_available:
        # Test different AI scenarios
        test_ai_integration_scenarios()
        print("\n✅ AI Integration Test Complete")
    else:
        print("\n❌ AI service not available - skipping scenario tests")