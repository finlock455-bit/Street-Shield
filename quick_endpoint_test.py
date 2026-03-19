#!/usr/bin/env python3
"""
Quick endpoint test for the review request
"""

import requests
import json

BASE_URL = "https://urban-safety-radar.preview.emergentagent.com"

def test_endpoint(method, url, data=None):
    try:
        if method == "GET":
            response = requests.get(url, timeout=30)
        elif method == "POST":
            headers = {"Content-Type": "application/json"}
            response = requests.post(url, json=data, headers=headers, timeout=30)
        
        print(f"{method} {url}")
        print(f"Status: {response.status_code}")
        
        try:
            json_data = response.json()
            print(f"Response: {json.dumps(json_data, indent=2, default=str)[:500]}...")
        except:
            print(f"Response (text): {response.text[:200]}...")
        
        print("-" * 80)
        return response.status_code == 200
        
    except Exception as e:
        print(f"{method} {url}")
        print(f"ERROR: {e}")
        print("-" * 80)
        return False

# Test the endpoints from the review request
print("Testing Review Request Endpoints...")
print("=" * 80)

# 1. GET /api/health 
test_endpoint("GET", f"{BASE_URL}/api/health")

# 2. GET /api/app-info
test_endpoint("GET", f"{BASE_URL}/api/app-info")

# 3. GET /api/
test_endpoint("GET", f"{BASE_URL}/api/")

# 4. GET /health (root level - expected to fail with frontend HTML)
test_endpoint("GET", f"{BASE_URL}/health")

# 5. POST /api/analyze (check if exists - likely should be /api/safety/analyze)
analyze_data = {
    "location": {"latitude": 51.5074, "longitude": -0.1278, "timestamp": "2026-03-19T12:00:00"},
    "user_context": {"activity_type": "walking"}
}
test_endpoint("POST", f"{BASE_URL}/api/analyze", analyze_data)

# 5b. POST /api/safety/analyze (actual endpoint)
test_endpoint("POST", f"{BASE_URL}/api/safety/analyze", analyze_data)

# 6. GET /api/emergency/contacts (likely doesn't exist)
test_endpoint("GET", f"{BASE_URL}/api/emergency/contacts?user_id=test_user")

# 7. POST /api/emergency/contacts (likely doesn't exist)
contact_data = {
    "user_id": "test_user",
    "name": "Test Contact", 
    "phone_number": "+44123456789",
    "relationship": "family"
}
test_endpoint("POST", f"{BASE_URL}/api/emergency/contacts", contact_data)

print("Test completed!")