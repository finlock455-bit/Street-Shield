#!/usr/bin/env python3
"""
Focused Journey Report Testing for Street Shield Backend API
Testing the specific NEW Journey Report endpoints requested in review
"""

import requests
import json
from datetime import datetime

# Backend URL
BASE_URL = "https://street-shield-demo.preview.emergentagent.com/api"

def test_journey_endpoints():
    """Test the specific journey endpoints requested"""
    session = requests.Session()
    session.headers.update({
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    })
    
    print("🗺️ Testing NEW Journey Report Feature...")
    
    # Test 1: POST /api/journey/complete with walking activity
    print("\n1. Testing POST /api/journey/complete (walking)...")
    walking_data = {
        "user_id": "test_user",
        "activity_type": "walking",
        "route_points": [{"lat": 51.5074, "lon": -0.1278}, {"lat": 51.508, "lon": -0.127}, {"lat": 51.5085, "lon": -0.1265}],
        "distance_km": 1.2,
        "duration_minutes": 15.5,
        "avg_safety_score": 82,
        "steps": 1850,
        "avg_heart_rate": 78
    }
    
    response = session.post(f"{BASE_URL}/journey/complete", json=walking_data)
    if response.status_code == 200:
        data = response.json()
        share_token = data.get('share_token')
        print(f"✅ SUCCESS: Journey completed with share_token: {share_token}")
        print(f"   Response includes: id, user_id, activity_type, distance_km({data.get('distance_km')}), started_at, completed_at")
        
        # Test 2: GET /api/journey/report/{share_token}
        if share_token:
            print(f"\n2. Testing GET /api/journey/report/{share_token}...")
            response = session.get(f"{BASE_URL}/journey/report/{share_token}")
            if response.status_code == 200:
                report_data = response.json()
                print("✅ SUCCESS: Retrieved journey report")
                print(f"   Retrieved: {report_data.get('activity_type')} journey, {report_data.get('distance_km')}km, {report_data.get('duration_minutes')}min")
            else:
                print(f"❌ FAILED: Status {response.status_code}")
    else:
        print(f"❌ FAILED: Status {response.status_code}")
        share_token = None
    
    # Test 3: GET /api/journey/report/nonexistent
    print("\n3. Testing GET /api/journey/report/nonexistent...")
    response = session.get(f"{BASE_URL}/journey/report/nonexistent")
    if response.status_code == 404:
        print("✅ SUCCESS: Correctly returned 404 for non-existent report")
    else:
        print(f"❌ FAILED: Expected 404, got {response.status_code}")
    
    # Test 4: POST /api/journey/complete with cycling activity
    print("\n4. Testing POST /api/journey/complete (cycling)...")
    cycling_data = {
        "user_id": "cyclist_user",
        "activity_type": "cycling",
        "route_points": [{"lat": 51.5, "lon": -0.12}, {"lat": 51.51, "lon": -0.11}, {"lat": 51.52, "lon": -0.10}],
        "distance_km": 5.5,
        "duration_minutes": 22.0,
        "avg_safety_score": 65,
        "steps": 0,
        "avg_heart_rate": 120
    }
    
    response = session.post(f"{BASE_URL}/journey/complete", json=cycling_data)
    if response.status_code == 200:
        data = response.json()
        cycling_share_token = data.get('share_token')
        print(f"✅ SUCCESS: Cycling journey completed with share_token: {cycling_share_token}")
        print(f"   Activity: {data.get('activity_type')}, Distance: {data.get('distance_km')}km, Steps: {data.get('steps')} (should be 0)")
        
        # Retrieve cycling report
        if cycling_share_token:
            response = session.get(f"{BASE_URL}/journey/report/{cycling_share_token}")
            if response.status_code == 200:
                print(f"✅ SUCCESS: Retrieved cycling report via share_token")
            else:
                print(f"❌ FAILED: Could not retrieve cycling report")
    else:
        print(f"❌ FAILED: Status {response.status_code}")
    
    # Test 5: GET /api/app-info (SEO endpoint)
    print("\n5. Testing GET /api/app-info (SEO endpoint)...")
    response = session.get(f"{BASE_URL}/app-info")
    if response.status_code == 200:
        data = response.json()
        print(f"✅ SUCCESS: App info retrieved")
        print(f"   Name: {data.get('name')}, Features: {len(data.get('features', []))}, Use cases: {len(data.get('use_cases', []))}")
    else:
        print(f"❌ FAILED: Status {response.status_code}")
    
    # Test 6: GET /api/health (health check)
    print("\n6. Testing GET /api/health (health check)...")
    response = session.get(f"{BASE_URL}/health")
    if response.status_code == 200:
        data = response.json()
        print(f"✅ SUCCESS: Health check passed")
        print(f"   Status: {data.get('status')}, Services: {list(data.get('services', {}).keys())}")
    else:
        print(f"❌ FAILED: Status {response.status_code}")

if __name__ == "__main__":
    test_journey_endpoints()
    print("\n🎉 Journey Report Feature Testing Complete!")