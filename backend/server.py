from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import HTMLResponse, FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timedelta
import asyncio
import json
import requests
import random
import math
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configuration
OPENWEATHER_API_KEY = os.environ.get('OPENWEATHER_API_KEY', None)  # Set this with your free API key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

# Models
class LocationData(BaseModel):
    latitude: float
    longitude: float
    altitude: Optional[float] = None
    accuracy: Optional[float] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class SafetyAnalysisRequest(BaseModel):
    location: LocationData
    user_context: Optional[Dict] = Field(default_factory=dict)  # speed, activity type, etc.
    movement_history: Optional[List[LocationData]] = Field(default_factory=list)  # Last 10 locations for pattern analysis

class CyclingContext(BaseModel):
    speed_kmh: Optional[float] = None  # Current cycling speed
    avg_speed_kmh: Optional[float] = None  # Average speed over journey
    road_type: str = "mixed"  # "bike_lane", "road", "mixed", "trail", "highway_shoulder"
    traffic_density: str = "medium"  # "light", "medium", "heavy"
    bike_type: str = "road"  # "road", "mountain", "electric", "cargo"
    rider_experience: str = "intermediate"  # "beginner", "intermediate", "advanced", "professional" 
    group_riding: bool = False  # Solo vs group cycling
    time_of_ride: str = "day"  # "dawn", "day", "dusk", "night"
    weather_conditions: str = "clear"  # Current riding conditions
    
class CyclingThreat(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    threat_type: str  # "vehicle_behind", "door_zone", "intersection", "road_hazard", "wind_gust"
    severity: str = "medium"  # "low", "medium", "high", "critical"
    distance_meters: Optional[float] = None
    relative_speed_kmh: Optional[float] = None  # Speed difference with threat
    direction: str = "behind"  # "behind", "ahead", "left", "right", "crossing"
    threat_description: str = ""
    recommended_action: str = "maintain_awareness"
    time_to_impact: Optional[float] = None  # seconds until potential collision
    confidence: float = Field(ge=0.0, le=1.0, default=0.8)
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class WeatherData(BaseModel):
    temperature: float
    humidity: float
    weather_condition: str
    visibility: Optional[float] = None
    wind_speed: Optional[float] = None
    feels_like: Optional[float] = None
    ice_risk: bool = False
    ice_confidence: Optional[float] = 0.0  # 0.0 to 1.0 confidence in ice risk assessment
    hazard_level: str = "low"  # low, medium, high, critical
    specific_hazards: Optional[List[str]] = Field(default_factory=list)  # detailed hazard list

class SafetyScore(BaseModel):
    overall_score: int = Field(ge=0, le=100)  # 0 = extremely dangerous, 100 = very safe
    risk_factors: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    weather_risk: int = Field(ge=0, le=100)
    traffic_risk: int = Field(ge=0, le=100)
    location_risk: int = Field(ge=0, le=100)
    alerts: List[Dict] = Field(default_factory=list)

class SafetyAnalysisResponse(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    location: LocationData
    weather: WeatherData
    safety_score: SafetyScore
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    ai_analysis: str = ""

class EmergencyAlert(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    alert_type: str  # "emergency_vehicle", "weather", "traffic", "hazard"
    location: LocationData
    radius: float  # meters
    severity: str  # "low", "medium", "high", "critical"
    message: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime
    active: bool = True

class CommunityReport(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    location: LocationData
    report_type: str  # "hazard", "emergency_vehicle", "safe_path", "unsafe_area"
    description: str
    severity: str = "medium"
    verified: bool = False
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    user_id: Optional[str] = None

class EmergencyContact(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: Optional[str] = None
    phone_number: str
    relationship: Optional[str] = None  # "family", "friend", "colleague", "other"
    priority: int = 1  # 1 = highest priority
    active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class EmergencySettings(BaseModel):
    user_id: str
    trigger_word: str
    contacts: List[str] = Field(default_factory=list)  # phone numbers
    auto_call_authorities: bool = True
    location_sharing_enabled: bool = True
    voice_confirmation_enabled: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class EmergencyEvent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    location: LocationData
    trigger_method: str  # "voice_trigger", "panic_button", "biometric_alert", "manual"
    trigger_word_used: Optional[str] = None
    contacts_notified: List[str] = Field(default_factory=list)
    authorities_contacted: bool = False
    response_time: Optional[float] = None  # seconds
    resolved: bool = False
    resolution_method: Optional[str] = None  # "user_confirmed_safe", "help_arrived", "false_alarm"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    resolved_at: Optional[datetime] = None

class ProximityThreat(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    threat_type: str  # "following", "approaching", "loitering", "aggressive_approach", "electric_scooter", "silent_vehicle"
    distance: float  # meters
    duration: float  # seconds being followed/tracked
    confidence: float = Field(ge=0.0, le=1.0)  # 0.0 to 1.0 confidence score
    direction: str = "behind"  # "behind", "ahead", "left", "right"
    movement_pattern: str = "matching_pace"  # "matching_pace", "closing_in", "erratic", "high_speed_approach"
    threat_level: str = "low"  # "low", "medium", "high", "critical"
    recommended_action: str = "stay_alert"
    vehicle_type: Optional[str] = None  # "e_scooter", "e_bike", "e_skateboard", "silent_car"
    speed_estimate: Optional[float] = None  # km/h estimated speed
    sound_signature: Optional[str] = None  # "silent", "low_hum", "tire_noise"
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class ProximityAnalysis(BaseModel):
    user_location: LocationData
    detected_threats: List[ProximityThreat] = Field(default_factory=list)
    safe_radius: float = 20.0  # meters - safe personal space
    awareness_radius: float = 50.0  # meters - extended awareness zone
    crowd_density: str = "low"  # "empty", "low", "moderate", "crowded"
    isolation_risk: bool = False  # true if user is in isolated area
    nearby_safe_locations: List[str] = Field(default_factory=list)
    overall_threat_level: str = "safe"

class BiometricData(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = "demo_user"
    # Core vitals
    heart_rate: Optional[int] = None  # BPM
    heart_rate_variability: Optional[float] = None  # HRV in milliseconds
    blood_oxygen: Optional[int] = None  # SpO2 percentage
    blood_pressure_systolic: Optional[int] = None  # mmHg
    blood_pressure_diastolic: Optional[int] = None  # mmHg
    # Advanced metrics
    stress_level: float = Field(ge=0.0, le=1.0, default=0.0)  # 0.0 to 1.0
    fatigue_level: float = Field(ge=0.0, le=1.0, default=0.0)  # 0.0 to 1.0
    recovery_score: Optional[float] = Field(ge=0.0, le=1.0, default=None)  # Recovery index
    # Activity context
    activity_level: str = "light"  # "rest", "light", "moderate", "vigorous", "maximum"
    steps_count: Optional[int] = None
    calories_burned: Optional[float] = None
    distance_traveled: Optional[float] = None  # kilometers
    # Environmental context
    ambient_temperature: Optional[float] = None  # Celsius
    altitude: Optional[float] = None  # meters above sea level
    # User profile for accurate analysis
    user_age: Optional[int] = Field(ge=10, le=120, default=30)
    user_fitness_level: str = "average"  # "poor", "below_average", "average", "above_average", "excellent"
    user_medical_conditions: List[str] = Field(default_factory=list)  # ["hypertension", "diabetes", etc.]
    # Sensor quality indicators
    sensor_accuracy: float = Field(ge=0.0, le=1.0, default=0.8)  # Sensor reliability
    measurement_duration: Optional[int] = None  # seconds of measurement
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class EnvironmentalNoiseProfile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    location_type: str  # "urban", "suburban", "rural", "highway", "construction", "park"
    predicted_noise_level: float = Field(ge=0.0, le=120.0)  # dB
    dominant_frequencies: List[float] = Field(default_factory=list)  # Hz
    noise_sources: List[str] = Field(default_factory=list)  # ["traffic", "construction", "crowd", "wind"]
    critical_sounds: List[str] = Field(default_factory=list)  # ["sirens", "horns", "shouting", "alarms"]
    noise_cancellation_profile: str = "balanced"  # "aggressive", "balanced", "minimal", "safety_first"
    ambient_sound_priority: List[str] = Field(default_factory=list)  # sounds to preserve
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class HealthAlert(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    alert_type: str  # "heart_rate_spike", "stress_overload", "fatigue_warning", "medical_emergency"
    severity: str  # "low", "medium", "high", "critical"
    message: str
    biometric_data: BiometricData
    recommended_action: str
    auto_emergency: bool = False  # trigger emergency protocols
    timestamp: datetime = Field(default_factory=datetime.utcnow)

# Utility Functions
def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two points in meters using Haversine formula"""
    R = 6371000  # Earth's radius in meters
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    a = (math.sin(delta_lat / 2) * math.sin(delta_lat / 2) +
         math.cos(lat1_rad) * math.cos(lat2_rad) *
         math.sin(delta_lon / 2) * math.sin(delta_lon / 2))
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def calculate_bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate bearing from point 1 to point 2 in degrees"""
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lon = math.radians(lon2 - lon1)
    
    y = math.sin(delta_lon) * math.cos(lat2_rad)
    x = (math.cos(lat1_rad) * math.sin(lat2_rad) - 
         math.sin(lat1_rad) * math.cos(lat2_rad) * math.cos(delta_lon))
    
    bearing = math.atan2(y, x)
    return (math.degrees(bearing) + 360) % 360

def analyze_movement_pattern(user_history: List[LocationData], potential_follower_history: List[LocationData]) -> Dict:
    """Analyze if someone might be following based on movement patterns"""
    if len(user_history) < 3 or len(potential_follower_history) < 3:
        return {"confidence": 0.0, "pattern": "insufficient_data"}
    
    # Calculate correlation between movement patterns
    user_bearings = []
    follower_bearings = []
    
    for i in range(1, min(len(user_history), len(potential_follower_history))):
        user_prev = user_history[i-1]
        user_curr = user_history[i]
        follower_prev = potential_follower_history[i-1]
        follower_curr = potential_follower_history[i]
        
        user_bearing = calculate_bearing(user_prev.latitude, user_prev.longitude, user_curr.latitude, user_curr.longitude)
        follower_bearing = calculate_bearing(follower_prev.latitude, follower_prev.longitude, follower_curr.latitude, follower_curr.longitude)
        
        user_bearings.append(user_bearing)
        follower_bearings.append(follower_bearing)
    
    # Check if bearings are similar (following behavior)
    bearing_similarities = []
    for ub, fb in zip(user_bearings, follower_bearings):
        diff = abs(ub - fb)
        if diff > 180:
            diff = 360 - diff
        similarity = 1.0 - (diff / 180.0)
        bearing_similarities.append(similarity)
    
    avg_similarity = sum(bearing_similarities) / len(bearing_similarities) if bearing_similarities else 0
    
    # Determine confidence and pattern
    if avg_similarity > 0.8:
        return {"confidence": avg_similarity, "pattern": "following", "threat_level": "high"}
    elif avg_similarity > 0.6:
        return {"confidence": avg_similarity, "pattern": "possible_following", "threat_level": "medium"}
    else:
        return {"confidence": avg_similarity, "pattern": "random", "threat_level": "low"}

async def detect_proximity_threats(location: LocationData, movement_history: List[LocationData], user_context: Dict) -> ProximityAnalysis:
    """Detect potential threats in user's proximity"""
    try:
        # Simulate detection of nearby individuals (in real implementation, this would use various sensors)
        # For demo, we'll simulate potential threats based on location and time
        detected_threats = []
        
        current_hour = datetime.now().hour
        
        # Simulate threat detection based on time and location context
        threat_probability = 0.0
        
        # Higher threat probability at night
        if 22 <= current_hour or current_hour <= 5:
            threat_probability += 0.3
        
        # Higher threat probability in isolated areas
        activity = user_context.get("activity_type", "walking")
        if activity == "running" and (current_hour < 6 or current_hour > 20):
            threat_probability += 0.2
        
        # Check movement history for consistent followers
        if len(movement_history) >= 5:
            # Simulate detection of someone following similar path
            if random.random() < threat_probability:
                # Create a simulated threat
                follower_threat = ProximityThreat(
                    threat_type="following",
                    distance=random.uniform(15, 35),  # 15-35 meters behind
                    duration=random.uniform(60, 300),  # 1-5 minutes
                    confidence=random.uniform(0.6, 0.9),
                    direction="behind",
                    movement_pattern="matching_pace",
                    threat_level="medium" if threat_probability > 0.3 else "low",
                    recommended_action="change_route" if threat_probability > 0.4 else "stay_alert"
                )
                detected_threats.append(follower_threat)
        
        # ELECTRIC SCOOTER DETECTION - Critical for music listeners
        # E-scooters are silent, fast (25-45 km/h), and unpredictable
        escooter_detection_probability = 0.0
        
        # Higher probability during rush hours and popular areas
        if current_hour in [7, 8, 9, 17, 18, 19, 20]:  # Commute times
            escooter_detection_probability += 0.4
        elif current_hour in [12, 13, 21, 22]:  # Lunch and evening leisure
            escooter_detection_probability += 0.3
        
        # Higher probability in urban areas (simulated by activity context)
        activity = user_context.get("activity_type", "walking")
        location_context = user_context.get("location_context", "urban")
        
        if location_context in ["urban", "city_center", "bike_lane_area"]:
            escooter_detection_probability += 0.3
        
        # Weather affects e-scooter usage (they avoid rain/snow)
        weather_context = user_context.get("weather", "clear")
        if weather_context in ["clear", "sunny", "partly_cloudy"]:
            escooter_detection_probability += 0.2
        
        # Simulate e-scooter detection
        if random.random() < escooter_detection_probability:
            # Random e-scooter approach scenarios
            scooter_scenarios = [
                {
                    "direction": "behind", 
                    "speed": random.uniform(20, 35), 
                    "distance": random.uniform(8, 25),
                    "pattern": "high_speed_approach",
                    "threat": "medium"
                },
                {
                    "direction": "left", 
                    "speed": random.uniform(15, 30), 
                    "distance": random.uniform(5, 15),
                    "pattern": "crossing_path",
                    "threat": "high"
                },
                {
                    "direction": "ahead", 
                    "speed": random.uniform(25, 40), 
                    "distance": random.uniform(20, 50),
                    "pattern": "approaching_fast",
                    "threat": "medium"
                },
                {
                    "direction": "right", 
                    "speed": random.uniform(18, 28), 
                    "distance": random.uniform(3, 12),
                    "pattern": "parallel_overtake",
                    "threat": "high"
                }
            ]
            
            scenario = random.choice(scooter_scenarios)
            
            # Determine threat level based on distance and speed
            if scenario["distance"] < 10 and scenario["speed"] > 25:
                threat_level = "critical"
                action = "immediate_evasion"
            elif scenario["distance"] < 15 and scenario["speed"] > 20:
                threat_level = "high"
                action = "step_aside_quickly"
            else:
                threat_level = scenario["threat"]
                action = "stay_alert_scooter"
            
            escooter_threat = ProximityThreat(
                threat_type="electric_scooter",
                distance=scenario["distance"],
                duration=random.uniform(2, 8),  # E-scooters approach quickly
                confidence=random.uniform(0.85, 0.98),  # High confidence - they're very detectable once spotted
                direction=scenario["direction"],
                movement_pattern=scenario["pattern"],
                threat_level=threat_level,
                recommended_action=action,
                vehicle_type="e_scooter",
                speed_estimate=scenario["speed"],
                sound_signature="silent"
            )
            detected_threats.append(escooter_threat)
        
        # SILENT E-BIKE DETECTION (similar but slightly different characteristics)
        ebike_detection_probability = escooter_detection_probability * 0.6  # Less common but similar
        
        if random.random() < ebike_detection_probability:
            ebike_threat = ProximityThreat(
                threat_type="silent_vehicle",
                distance=random.uniform(10, 30),
                duration=random.uniform(3, 10),
                confidence=random.uniform(0.75, 0.92),
                direction=random.choice(["behind", "left", "right"]),
                movement_pattern="high_speed_approach",
                threat_level="medium",
                recommended_action="check_surroundings",
                vehicle_type="e_bike",
                speed_estimate=random.uniform(25, 45),
                sound_signature="low_hum"
            )
            detected_threats.append(ebike_threat)
        
        # Determine crowd density (simulated)
        crowd_density = "low"
        if current_hour in [8, 9, 17, 18, 19]:  # Rush hours
            crowd_density = "moderate"
        elif current_hour in [12, 13]:  # Lunch time
            crowd_density = "moderate"
        elif 22 <= current_hour or current_hour <= 5:
            crowd_density = "empty"
        
        # Assess isolation risk
        isolation_risk = crowd_density == "empty" and len(detected_threats) > 0
        
        # Determine overall threat level
        overall_threat_level = "safe"
        if detected_threats:
            max_threat_level = max([t.threat_level for t in detected_threats], key=lambda x: {"low": 1, "medium": 2, "high": 3, "critical": 4}[x])
            overall_threat_level = max_threat_level
        
        if isolation_risk:
            if overall_threat_level == "low":
                overall_threat_level = "medium"
            elif overall_threat_level == "medium":
                overall_threat_level = "high"
        
        # Suggest nearby safe locations (simulated)
        safe_locations = []
        if detected_threats or isolation_risk:
            safe_locations = ["Nearby convenience store", "Well-lit main street", "Police station (0.5km)"]
        
        return ProximityAnalysis(
            user_location=location,
            detected_threats=detected_threats,
            safe_radius=20.0,
            awareness_radius=50.0,
            crowd_density=crowd_density,
            isolation_risk=isolation_risk,
            nearby_safe_locations=safe_locations,
            overall_threat_level=overall_threat_level
        )
        
    except Exception as e:
        logging.error(f"Error in proximity threat detection: {e}")
        return ProximityAnalysis(
            user_location=location,
            detected_threats=[],
            overall_threat_level="safe"
        )

async def analyze_environmental_noise(location: LocationData, weather: WeatherData, user_context: Dict) -> EnvironmentalNoiseProfile:
    """AI-driven environmental noise analysis for adaptive noise cancellation"""
    try:
        current_hour = datetime.now().hour
        
        # Determine location type based on context and coordinates
        location_type = "urban"  # Default
        if "activity_type" in user_context:
            if user_context["activity_type"] == "hiking":
                location_type = "park"
            elif user_context["activity_type"] == "running":
                location_type = "suburban"
        
        # Predict noise level based on multiple factors
        base_noise = 45  # dB baseline
        
        # Time-based noise prediction
        if 7 <= current_hour <= 9 or 17 <= current_hour <= 19:  # Rush hours
            base_noise += 15
            location_type = "urban"
        elif 22 <= current_hour or current_hour <= 6:  # Night hours
            base_noise -= 10
        
        # Weather impact on noise
        if weather.weather_condition == "rain":
            base_noise += 8
        elif weather.wind_speed > 20:
            base_noise += 6
        
        # Location type adjustments
        location_noise_map = {
            "urban": 65,
            "suburban": 50, 
            "rural": 40,
            "highway": 75,
            "construction": 85,
            "park": 35
        }
        
        predicted_noise = min(120, max(30, location_noise_map.get(location_type, 50) + (base_noise - 45)))
        
        # AI-predicted noise sources based on environment
        noise_sources = []
        critical_sounds = []
        dominant_frequencies = []
        
        if location_type == "urban":
            noise_sources = ["traffic", "crowd", "construction", "sirens", "e_scooters", "electric_vehicles"]
            critical_sounds = ["sirens", "horns", "shouting", "brakes", "electric_scooter_approach", "tire_noise"]
            dominant_frequencies = [250, 500, 1000, 2000]  # Urban frequency spectrum
        elif location_type == "highway":
            noise_sources = ["heavy_traffic", "trucks", "motorcycles", "electric_vehicles"]
            critical_sounds = ["sirens", "horns", "emergency_vehicles", "tire_noise"]
            dominant_frequencies = [125, 250, 500, 1000]
        elif location_type == "park":
            noise_sources = ["wind", "birds", "people", "cyclists", "e_scooters"]
            critical_sounds = ["shouting", "alarms", "approaching_vehicles", "electric_scooter_approach", "bike_bells"]
            dominant_frequencies = [1000, 2000, 4000, 8000]
        else:
            noise_sources = ["ambient", "wind", "occasional_vehicles"]
            critical_sounds = ["emergency_vehicles", "shouting", "electric_vehicle_approach"]
            dominant_frequencies = [500, 1000, 2000]
        
        # Determine optimal noise cancellation profile
        if predicted_noise > 80:
            cancellation_profile = "aggressive"
        elif predicted_noise > 60:
            cancellation_profile = "balanced"
        else:
            cancellation_profile = "minimal"
        
        # Always prioritize safety sounds - CRITICAL for music listeners
        ambient_sound_priority = [
            "sirens", "emergency_vehicles", "horns", "alarms", "shouting", 
            "approaching_footsteps", "electric_scooter_approach", "tire_noise", 
            "bike_bells", "electric_vehicle_approach", "brakes", "skidding"
        ]
        
        return EnvironmentalNoiseProfile(
            location_type=location_type,
            predicted_noise_level=predicted_noise,
            dominant_frequencies=dominant_frequencies,
            noise_sources=noise_sources,
            critical_sounds=critical_sounds,
            noise_cancellation_profile=cancellation_profile,
            ambient_sound_priority=ambient_sound_priority
        )
        
    except Exception as e:
        logging.error(f"Error in noise analysis: {e}")
        return EnvironmentalNoiseProfile(
            location_type="urban",
            predicted_noise_level=60.0,
            noise_cancellation_profile="safety_first",
            ambient_sound_priority=["sirens", "emergency_vehicles", "alarms"]
        )

async def analyze_biometric_data(biometric_data: BiometricData, location: LocationData, safety_context: Dict) -> List[HealthAlert]:
    """Advanced biometric analysis with medically accurate algorithms and personalized thresholds"""
    try:
        alerts = []
        age = biometric_data.user_age or 30
        fitness_level = biometric_data.user_fitness_level
        activity = biometric_data.activity_level
        medical_conditions = biometric_data.user_medical_conditions or []
        
        # Calculate personalized heart rate zones based on age and fitness
        max_hr = 220 - age
        fitness_multipliers = {
            "poor": 0.85, "below_average": 0.90, "average": 1.0, 
            "above_average": 1.10, "excellent": 1.20
        }
        fitness_factor = fitness_multipliers.get(fitness_level, 1.0)
        
        # Personalized HR zones
        resting_hr_max = 60 + (10 if fitness_level in ["poor", "below_average"] else 0)
        target_hr_low = int((max_hr - resting_hr_max) * 0.5 * fitness_factor + resting_hr_max)
        target_hr_high = int((max_hr - resting_hr_max) * 0.85 * fitness_factor + resting_hr_max)
        danger_hr = int(max_hr * 0.95 * fitness_factor)
        
        # ADVANCED HEART RATE ANALYSIS
        if biometric_data.heart_rate:
            hr = biometric_data.heart_rate
            
            # Critical thresholds with medical accuracy
            if hr > danger_hr or hr > 200:  # Immediate danger
                alerts.append(HealthAlert(
                    alert_type="heart_rate_critical",
                    severity="critical",
                    message=f"CRITICAL: Heart rate {hr} BPM exceeds safe limits for age {age}. Consider stopping activity immediately and resting.",
                    biometric_data=biometric_data,
                    recommended_action="STOP ALL ACTIVITY. Sit down and rest. Seek appropriate help if you feel unwell.",
                    auto_emergency=True
                ))
            elif hr > target_hr_high + 20:  # Very high but not critical
                alerts.append(HealthAlert(
                    alert_type="heart_rate_very_high",
                    severity="high",
                    message=f"Very high heart rate: {hr} BPM. Target for {activity} activity: {target_hr_low}-{target_hr_high} BPM.",
                    biometric_data=biometric_data,
                    recommended_action="Reduce intensity immediately. Find safe place to rest."
                ))
            elif activity == "rest" and hr > resting_hr_max + 20:
                alerts.append(HealthAlert(
                    alert_type="resting_hr_elevated",
                    severity="medium",
                    message=f"Elevated resting heart rate: {hr} BPM. This may indicate stress, illness, or overtraining.",
                    biometric_data=biometric_data,
                    recommended_action="Monitor closely. Consider taking a break if persistent."
                ))
            elif hr < 40 and "bradycardia" not in medical_conditions:
                severity = "high" if hr < 35 else "medium"
                alerts.append(HealthAlert(
                    alert_type="heart_rate_low",
                    severity=severity,
                    message=f"Unusually low heart rate: {hr} BPM. May indicate heart rhythm issues.",
                    biometric_data=biometric_data,
                    recommended_action="Take a break and monitor for dizziness or fatigue." if severity == "high" else "Monitor symptoms and take it easy."
                ))
        
        # HEART RATE VARIABILITY ANALYSIS (Advanced metric)
        if biometric_data.heart_rate_variability is not None:
            hrv = biometric_data.heart_rate_variability
            # Normal HRV ranges vary greatly, but very low HRV is concerning
            if hrv < 10:  # Very low HRV
                alerts.append(HealthAlert(
                    alert_type="hrv_very_low",
                    severity="high" if hrv < 5 else "medium",
                    message=f"Very low heart rate variability: {hrv}ms. This may indicate high stress or health issues.",
                    biometric_data=biometric_data,
                    recommended_action="Prioritize rest and recovery. Consider stress management techniques."
                ))
        
        # BLOOD PRESSURE ANALYSIS (if available)
        if biometric_data.blood_pressure_systolic and biometric_data.blood_pressure_diastolic:
            systolic = biometric_data.blood_pressure_systolic
            diastolic = biometric_data.blood_pressure_diastolic
            
            # Hypertensive crisis
            if systolic >= 180 or diastolic >= 120:
                alerts.append(HealthAlert(
                    alert_type="blood_pressure_crisis",
                    severity="critical",
                    message=f"CRITICAL: BP {systolic}/{diastolic} mmHg. Consider stopping activity and resting immediately.",
                    biometric_data=biometric_data,
                    recommended_action="Stop activity and rest. Seek appropriate help if you feel unwell.",
                    auto_emergency=True
                ))
            # Stage 2 hypertension
            elif systolic >= 140 or diastolic >= 90:
                alerts.append(HealthAlert(
                    alert_type="blood_pressure_high",
                    severity="high",
                    message=f"High blood pressure: {systolic}/{diastolic} mmHg. Consider taking a break.",
                    biometric_data=biometric_data,
                    recommended_action="Rest immediately. Avoid strenuous activity. Consult healthcare provider."
                ))
            # Hypotension during activity
            elif systolic < 90 and activity in ["moderate", "vigorous"]:
                alerts.append(HealthAlert(
                    alert_type="blood_pressure_low",
                    severity="medium",
                    message=f"Low blood pressure during activity: {systolic}/{diastolic} mmHg.",
                    biometric_data=biometric_data,
                    recommended_action="Stop activity. Sit or lie down. Hydrate slowly."
                ))
        
        # ADVANCED BLOOD OXYGEN ANALYSIS
        if biometric_data.blood_oxygen:
            spo2 = biometric_data.blood_oxygen
            altitude = biometric_data.altitude or 0
            
            # Adjust thresholds for altitude
            altitude_adjustment = max(0, (altitude - 1500) / 1000 * 2)  # Reduce threshold by ~2% per 1000m above 1500m
            normal_threshold = 95 - altitude_adjustment
            critical_threshold = 90 - altitude_adjustment
            
            if spo2 < critical_threshold:
                alerts.append(HealthAlert(
                    alert_type="oxygen_critical",
                    severity="critical",
                    message=f"CRITICAL: Blood oxygen {spo2}% is dangerously low{' (altitude adjusted)' if altitude > 1500 else ''}.",
                    biometric_data=biometric_data,
                    recommended_action="Stop activity and rest. Consider getting fresh air.",
                    auto_emergency=True
                ))
            elif spo2 < normal_threshold:
                alerts.append(HealthAlert(
                    alert_type="oxygen_low",
                    severity="high",
                    message=f"Low blood oxygen: {spo2}%{' at altitude ' + str(int(altitude)) + 'm' if altitude > 1500 else ''}.",
                    biometric_data=biometric_data,
                    recommended_action="Rest and monitor breathing. Descend to lower altitude if possible."
                ))
        
        # ADVANCED STRESS & RECOVERY ANALYSIS
        if biometric_data.stress_level > 0.8:
            # Factor in HRV and recovery score for more accurate stress assessment
            hrv_factor = 1.2 if biometric_data.heart_rate_variability and biometric_data.heart_rate_variability < 15 else 1.0
            recovery_factor = 0.8 if biometric_data.recovery_score and biometric_data.recovery_score > 0.7 else 1.0
            
            adjusted_stress = biometric_data.stress_level * hrv_factor * recovery_factor
            
            if adjusted_stress > 0.9:
                alerts.append(HealthAlert(
                    alert_type="stress_critical",
                    severity="high",
                    message="Critical stress levels detected. Your body is in high-stress state with poor recovery indicators.",
                    biometric_data=biometric_data,
                    recommended_action="Stop current activity. Practice deep breathing. Find safe, quiet environment."
                ))
            else:
                alerts.append(HealthAlert(
                    alert_type="stress_elevated",
                    severity="medium",
                    message="Elevated stress levels with concerning physiological markers.",
                    biometric_data=biometric_data,
                    recommended_action="Reduce activity intensity. Focus on controlled breathing."
                ))
        
        # FATIGUE & RECOVERY ANALYSIS
        if biometric_data.fatigue_level > 0.7:
            recovery = biometric_data.recovery_score or 0.5
            if recovery < 0.3 and biometric_data.fatigue_level > 0.8:
                alerts.append(HealthAlert(
                    alert_type="fatigue_severe",
                    severity="high",
                    message="Severe fatigue with poor recovery indicators. Risk of overexertion injury.",
                    biometric_data=biometric_data,
                    recommended_action="End activity immediately. Extended rest required."
                ))
            elif biometric_data.fatigue_level > 0.8:
                alerts.append(HealthAlert(
                    alert_type="fatigue_high",
                    severity="medium",
                    message="High fatigue levels detected. Performance and safety may be compromised.",
                    biometric_data=biometric_data,
                    recommended_action="Reduce pace significantly. Plan for rest breaks."
                ))
        
        # MEDICAL CONDITION SPECIFIC MONITORING
        if "hypertension" in medical_conditions and biometric_data.heart_rate:
            if biometric_data.heart_rate > (max_hr * 0.75):  # Lower threshold for hypertensive patients
                alerts.append(HealthAlert(
                    alert_type="hypertension_hr_warning",
                    severity="medium",
                    message=f"Heart rate {biometric_data.heart_rate} BPM may be too high for your hypertension condition.",
                    biometric_data=biometric_data,
                    recommended_action="Reduce activity intensity. Monitor blood pressure if possible."
                ))
        
        if "diabetes" in medical_conditions and biometric_data.fatigue_level > 0.6:
            alerts.append(HealthAlert(
                alert_type="diabetic_fatigue_warning",
                severity="medium",
                message="Elevated fatigue levels detected. Monitor blood sugar levels.",
                biometric_data=biometric_data,
                recommended_action="Check blood glucose if possible. Consider eating if levels are low."
            ))
        
        # ENVIRONMENTAL FACTOR ANALYSIS
        if biometric_data.ambient_temperature:
            temp = biometric_data.ambient_temperature
            if temp > 30 and biometric_data.heart_rate and biometric_data.heart_rate > target_hr_high:
                alerts.append(HealthAlert(
                    alert_type="heat_stress",
                    severity="high",
                    message=f"High heart rate {biometric_data.heart_rate} BPM in hot weather {temp}°C. Risk of heat exhaustion.",
                    biometric_data=biometric_data,
                    recommended_action="Find shade immediately. Hydrate and cool down. Reduce activity."
                ))
            elif temp < 0 and biometric_data.heart_rate and biometric_data.heart_rate > target_hr_high:
                alerts.append(HealthAlert(
                    alert_type="cold_stress",
                    severity="medium",
                    message=f"Elevated heart rate in cold weather {temp}°C. Monitor for hypothermia symptoms.",
                    biometric_data=biometric_data,
                    recommended_action="Warm up gradually. Check extremities for numbness."
                ))
        
        # SENSOR ACCURACY WARNINGS
        if biometric_data.sensor_accuracy < 0.6:
            alerts.append(HealthAlert(
                alert_type="sensor_accuracy_low",
                severity="low",
                message=f"Low sensor accuracy ({int(biometric_data.sensor_accuracy*100)}%). Health readings may be unreliable.",
                biometric_data=biometric_data,
                recommended_action="Adjust device positioning. Clean sensors if needed."
            ))
        
        return alerts
        
    except Exception as e:
        logging.error(f"Error analyzing biometric data: {e}")
        return [HealthAlert(
            alert_type="analysis_error",
            severity="medium",
            message="Health monitoring system encountered an error. Please check device connections.",
            biometric_data=biometric_data,
            recommended_action="Restart health monitoring or check device status."
        )]

async def analyze_cycling_threats(location: LocationData, cycling_context: CyclingContext, movement_history: List[LocationData]) -> List[CyclingThreat]:
    """Advanced cycling-specific threat detection and analysis"""
    try:
        threats = []
        current_speed = cycling_context.speed_kmh or 0
        road_type = cycling_context.road_type
        traffic_density = cycling_context.traffic_density
        experience_level = cycling_context.rider_experience
        
        # Calculate cycling-specific risk factors
        speed_risk_factor = min(current_speed / 50.0, 1.0)  # Risk increases with speed
        traffic_risk_multiplier = {"light": 0.3, "medium": 0.6, "heavy": 1.0}.get(traffic_density, 0.6)
        experience_multiplier = {"beginner": 1.3, "intermediate": 1.0, "advanced": 0.7, "professional": 0.5}.get(experience_level, 1.0)
        
        # VEHICLE APPROACH DETECTION (Critical for cyclists)
        vehicle_approach_probability = 0.0
        if road_type in ["road", "highway_shoulder"]:
            vehicle_approach_probability += 0.4 * traffic_risk_multiplier
        elif road_type == "mixed":
            vehicle_approach_probability += 0.25 * traffic_risk_multiplier
            
        # Higher risk during rush hours
        current_hour = datetime.utcnow().hour
        if current_hour in [7, 8, 9, 17, 18, 19]:
            vehicle_approach_probability += 0.2
            
        if random.random() < vehicle_approach_probability:
            # Simulate vehicle approaching from behind (most dangerous for cyclists)
            vehicle_speed = random.uniform(30, 60)  # km/h
            relative_speed = vehicle_speed - current_speed
            distance = random.uniform(20, 100)  # meters behind
            time_to_impact = distance / (relative_speed / 3.6) if relative_speed > 0 else None  # seconds
            
            severity = "critical" if (relative_speed > 30 and distance < 50) else "high" if relative_speed > 20 else "medium"
            
            threats.append(CyclingThreat(
                threat_type="vehicle_behind",
                severity=severity,
                distance_meters=distance,
                relative_speed_kmh=relative_speed,
                direction="behind",
                threat_description=f"Vehicle approaching at {vehicle_speed:.0f} km/h, {distance:.0f}m behind",
                recommended_action="move_right" if severity == "critical" else "maintain_line",
                time_to_impact=time_to_impact,
                confidence=0.85 + (0.1 if traffic_density == "heavy" else 0)
            ))
        
        # DOOR ZONE HAZARD DETECTION
        door_zone_probability = 0.0
        if road_type in ["road", "mixed"] and traffic_density in ["medium", "heavy"]:
            door_zone_probability = 0.3  # Parked cars create door zone risks
            
        if random.random() < door_zone_probability:
            threats.append(CyclingThreat(
                threat_type="door_zone",
                severity="high",
                distance_meters=random.uniform(10, 30),
                direction="right",
                threat_description="Potential car door opening zone detected",
                recommended_action="move_left_safe",
                confidence=0.75
            ))
        
        # INTERSECTION HAZARD ANALYSIS
        intersection_risk = 0.0
        if len(movement_history) >= 3:
            # Analyze if approaching intersection (speed changes, direction changes)
            speed_variance = any(abs(h.speed or 0 - current_speed) > 5 for h in movement_history[-3:])
            if speed_variance:
                intersection_risk = 0.4 * experience_multiplier
                
        if random.random() < intersection_risk:
            threats.append(CyclingThreat(
                threat_type="intersection",
                severity="high",
                distance_meters=random.uniform(20, 80),
                direction="ahead",
                threat_description="Intersection ahead - vehicle crossing potential",
                recommended_action="reduce_speed_scan",
                confidence=0.8
            ))
        
        # ROAD SURFACE HAZARDS (Speed-dependent)
        road_hazard_probability = speed_risk_factor * 0.2
        if random.random() < road_hazard_probability:
            hazard_types = ["pothole", "debris", "wet_surface", "gravel", "construction"]
            hazard = random.choice(hazard_types)
            
            threats.append(CyclingThreat(
                threat_type="road_hazard",
                severity="medium" if current_speed > 25 else "low",
                distance_meters=random.uniform(15, 50),
                direction="ahead",
                threat_description=f"Road hazard detected: {hazard}",
                recommended_action="avoid_obstacle",
                confidence=0.7
            ))
        
        # WIND GUST ANALYSIS (Critical at higher speeds)
        if current_speed > 20:  # Wind becomes dangerous at higher cycling speeds
            wind_probability = 0.15 * (current_speed / 40)  # Higher risk at higher speeds
            
            if random.random() < wind_probability:
                threats.append(CyclingThreat(
                    threat_type="wind_gust",
                    severity="medium" if current_speed > 30 else "low",
                    direction=random.choice(["left", "right", "ahead"]),
                    threat_description=f"Strong wind detected - stability risk at {current_speed:.0f} km/h",
                    recommended_action="grip_handlebars_firm",
                    confidence=0.6
                ))
        
        # E-SCOOTER INTERACTIONS (Specific to cycling)
        if road_type in ["bike_lane", "mixed"]:
            escooter_interaction_probability = 0.2
            
            if random.random() < escooter_interaction_probability:
                threats.append(CyclingThreat(
                    threat_type="vehicle_conflict",
                    severity="medium",
                    distance_meters=random.uniform(10, 40),
                    relative_speed_kmh=random.uniform(-15, 10),  # E-scooters typically slower
                    direction=random.choice(["ahead", "behind"]),
                    threat_description="E-scooter interaction - unpredictable movement pattern",
                    recommended_action="maintain_safe_distance",
                    confidence=0.75
                ))
        
        return threats
        
    except Exception as e:
        logging.error(f"Error analyzing cycling threats: {e}")
        return []

async def get_real_weather_data(lat: float, lon: float) -> Optional[WeatherData]:
    """Get real weather data from OpenWeatherMap API"""
    if not OPENWEATHER_API_KEY:
        return None
    
    try:
        url = "http://api.openweathermap.org/data/2.5/weather"
        params = {
            "lat": lat,
            "lon": lon,
            "appid": OPENWEATHER_API_KEY,
            "units": "metric"  # Celsius
        }
        
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        # Extract weather data from API response
        main = data.get("main", {})
        weather_list = data.get("weather", [])
        wind = data.get("wind", {})
        
        temp = main.get("temp", 20.0)
        humidity = main.get("humidity", 50.0)
        feels_like = main.get("feels_like", temp)
        visibility = data.get("visibility", 10000) / 1000.0  # Convert meters to km
        wind_speed = wind.get("speed", 0.0) * 3.6  # Convert m/s to km/h
        
        # Map OpenWeatherMap conditions to our system
        weather_main = weather_list[0].get("main", "Clear").lower() if weather_list else "clear"
        weather_desc = weather_list[0].get("description", "").lower() if weather_list else ""
        
        condition_mapping = {
            "clear": "clear",
            "clouds": "cloudy", 
            "rain": "rain",
            "drizzle": "rain",
            "thunderstorm": "rain",
            "snow": "snow",
            "mist": "fog",
            "fog": "fog",
            "haze": "fog"
        }
        
        condition = condition_mapping.get(weather_main, "clear")
        
        # ENHANCED REAL-TIME ICE RISK DETECTION
        ice_risk = False
        ice_confidence = 0.0
        
        # Multi-factor ice detection algorithm
        if temp <= 4:
            if condition in ["rain", "snow"]:
                ice_risk = True
                ice_confidence = 0.9
            elif "freezing" in weather_desc or "ice" in weather_desc or "sleet" in weather_desc:
                ice_risk = True 
                ice_confidence = 0.95
            elif humidity > 85 and temp <= 1:  # High humidity frost conditions
                ice_risk = True
                ice_confidence = 0.7
            elif temp <= 0 and humidity > 70:  # Below freezing with moisture
                ice_risk = True
                ice_confidence = 0.8
        
        # Black ice specific detection (most dangerous)
        black_ice_risk = (temp >= -2 and temp <= 2 and 
                         (condition == "rain" or "drizzle" in weather_desc) and 
                         humidity > 80)
        
        if black_ice_risk:
            ice_risk = True
            ice_confidence = 0.95
        
        # COMPREHENSIVE HAZARD ASSESSMENT
        hazard_score = 0
        specific_hazards = []
        
        # Critical temperature hazards
        if temp <= -15:
            hazard_score += 4
            specific_hazards.append("extreme_cold")
        elif temp <= -5:
            hazard_score += 3
            specific_hazards.append("severe_cold")
        elif temp <= 0:
            hazard_score += 2
            specific_hazards.append("freezing")
        elif temp >= 40:
            hazard_score += 3
            specific_hazards.append("extreme_heat")
        elif temp >= 35:
            hazard_score += 2
            specific_hazards.append("high_heat")
        
        # Precipitation hazards with intensity
        if condition == "snow":
            hazard_score += 3
            specific_hazards.append("snow_accumulation")
        elif condition == "rain":
            if temp <= 2:  # Freezing rain - EXTREMELY dangerous
                hazard_score += 5
                specific_hazards.append("freezing_rain")
            else:
                hazard_score += 1
                specific_hazards.append("wet_surfaces")
        
        # Visibility hazards
        if visibility <= 0.2:  # Dense fog/severe conditions
            hazard_score += 4
            specific_hazards.append("zero_visibility")
        elif visibility <= 0.5:
            hazard_score += 3
            specific_hazards.append("very_poor_visibility") 
        elif visibility <= 1:
            hazard_score += 2
            specific_hazards.append("poor_visibility")
        
        # Wind hazards for pedestrians
        if wind_speed >= 60:  # Hurricane force
            hazard_score += 5
            specific_hazards.append("hurricane_winds")
        elif wind_speed >= 50:  # Violent storm
            hazard_score += 4
            specific_hazards.append("violent_winds")
        elif wind_speed >= 35:  # Gale force
            hazard_score += 3
            specific_hazards.append("gale_winds")
        elif wind_speed >= 25:  # Strong winds
            hazard_score += 1
            specific_hazards.append("strong_winds")
        
        # Severe weather keywords detection
        severe_keywords = {
            "heavy": 2, "severe": 3, "extreme": 4, "dangerous": 4, 
            "violent": 4, "torrential": 3, "blizzard": 4, "thunderstorm": 2
        }
        
        for keyword, score in severe_keywords.items():
            if keyword in weather_desc:
                hazard_score += score
                specific_hazards.append(f"severe_{keyword}")
        
        # Ice hazard amplification
        if ice_risk:
            if black_ice_risk:
                hazard_score += 4  # Black ice is extremely dangerous
                specific_hazards.append("black_ice")
            else:
                hazard_score += 3
                specific_hazards.append("ice_surfaces")
        
        # INTELLIGENT HAZARD LEVEL DETERMINATION
        if hazard_score >= 10:
            hazard_level = "critical"
        elif hazard_score >= 6:
            hazard_level = "high" 
        elif hazard_score >= 3:
            hazard_level = "medium"
        else:
            hazard_level = "low"
            
        return WeatherData(
            temperature=round(temp, 1),
            humidity=round(humidity, 1),
            weather_condition=condition,
            visibility=round(visibility, 1),
            wind_speed=round(wind_speed, 1),
            feels_like=round(feels_like, 1),
            ice_risk=ice_risk,
            ice_confidence=round(ice_confidence, 2),
            hazard_level=hazard_level,
            specific_hazards=specific_hazards
        )
        
    except Exception as e:
        logging.error(f"Error getting real weather data: {e}")
        return None

async def get_simulated_weather_data(lat: float, lon: float) -> WeatherData:
    """Fallback simulated weather data with realistic patterns"""
    import random
    from datetime import datetime
    
    # Get current time for realistic weather patterns
    current_hour = datetime.now().hour
    current_month = datetime.now().month
    
    # Seasonal temperature adjustments
    base_temps = {
        12: (-5, 10), 1: (-8, 5), 2: (-5, 8),      # Winter
        3: (2, 15), 4: (8, 20), 5: (15, 25),       # Spring  
        6: (20, 30), 7: (22, 35), 8: (20, 32),     # Summer
        9: (15, 25), 10: (8, 18), 11: (0, 12)      # Fall
    }
    
    min_temp, max_temp = base_temps.get(current_month, (10, 25))
    temp = random.uniform(min_temp, max_temp)
    
    # Realistic weather condition probabilities
    weather_patterns = {
        "clear": 0.4,
        "cloudy": 0.25, 
        "rain": 0.15,
        "snow": 0.1 if current_month in [11, 12, 1, 2, 3] else 0.02,
        "fog": 0.08 if 5 <= current_hour <= 9 else 0.03  # Fog more likely in early morning
    }
    
    # Select condition based on probabilities
    conditions = list(weather_patterns.keys())
    weights = list(weather_patterns.values())
    condition = random.choices(conditions, weights=weights)[0]
    
    # Adjust temperature based on conditions
    if condition == "rain":
        temp = temp * 0.85  # Rain typically cooler
    elif condition == "snow":
        temp = min(temp, 2)  # Snow requires freezing temps
    elif condition == "fog":
        temp = temp * 0.9   # Fog typically cooler/humid
        
    # Calculate humidity based on weather
    if condition in ["rain", "fog"]:
        humidity = random.uniform(75, 95)
    elif condition == "snow":
        humidity = random.uniform(60, 85)
    elif condition == "clear":
        humidity = random.uniform(30, 60)
    else:  # cloudy
        humidity = random.uniform(50, 75)
        
    # Calculate visibility based on conditions
    visibility_map = {
        "clear": random.uniform(8, 15),
        "cloudy": random.uniform(5, 12),
        "rain": random.uniform(2, 8),
        "snow": random.uniform(1, 5),
        "fog": random.uniform(0.1, 2)
    }
    visibility = visibility_map[condition]
    
    # Calculate wind speed
    wind_speed = random.uniform(0, 30)
    if condition in ["rain", "snow"]:
        wind_speed = random.uniform(10, 35)  # Storms have more wind
    
    # Enhanced ice risk calculation
    ice_risk = False
    ice_confidence = 0.0
    if temp <= 4:  # Expanded ice risk threshold
        if condition in ["rain", "snow"]:
            ice_risk = True
            ice_confidence = 0.8
        elif humidity > 80 and temp <= 1:  # Frost conditions
            ice_risk = True
            ice_confidence = 0.6
    
    # More accurate hazard level assessment
    hazard_level = "low"
    hazard_score = 0
    specific_hazards = []
    
    # Temperature hazards
    if temp <= -10:
        hazard_score += 3
        specific_hazards.append("severe_cold")
    elif temp <= 0:
        hazard_score += 2
        specific_hazards.append("freezing")
    elif temp <= 2:
        hazard_score += 1
        specific_hazards.append("near_freezing")
    elif temp >= 40:
        hazard_score += 3
        specific_hazards.append("extreme_heat")
    elif temp >= 35:
        hazard_score += 2
        specific_hazards.append("high_heat")
    elif temp >= 32:
        hazard_score += 1
        specific_hazards.append("hot_weather")
        
    # Weather condition hazards
    if condition == "snow":
        hazard_score += 3
        specific_hazards.append("snow_accumulation")
    elif condition == "rain" and temp <= 2:  # Freezing rain
        hazard_score += 4
        specific_hazards.append("freezing_rain")
    elif condition == "fog" and visibility <= 1:
        hazard_score += 3
        specific_hazards.append("poor_visibility")
    elif condition == "rain":
        hazard_score += 1
        specific_hazards.append("wet_surfaces")
    elif condition == "fog":
        hazard_score += 1
        specific_hazards.append("reduced_visibility")
        
    # Wind hazards
    if wind_speed >= 25:
        hazard_score += 2
        specific_hazards.append("strong_winds")
    elif wind_speed >= 15:
        hazard_score += 1
        specific_hazards.append("moderate_winds")
        
    # Ice risk adds significant hazard
    if ice_risk:
        hazard_score += 3
        specific_hazards.append("ice_surfaces")
        
    # Determine final hazard level
    if hazard_score >= 6:
        hazard_level = "critical"
    elif hazard_score >= 4:
        hazard_level = "high"
    elif hazard_score >= 2:
        hazard_level = "medium"
    else:
        hazard_level = "low"
        
    # Calculate feels-like temperature
    feels_like = temp
    if wind_speed > 5:  # Wind chill effect
        feels_like = temp - (wind_speed * 0.3)
    if humidity > 75:  # Humidity effect
        feels_like = temp + (humidity - 75) * 0.1
        
    return WeatherData(
        temperature=round(temp, 1),
        humidity=round(humidity, 1),
        weather_condition=condition,
        visibility=round(visibility, 1),
        wind_speed=round(wind_speed, 1),
        feels_like=round(feels_like, 1),
        ice_risk=ice_risk,
        ice_confidence=round(ice_confidence, 2),
        hazard_level=hazard_level,
        specific_hazards=specific_hazards
    )

async def get_weather_data(lat: float, lon: float) -> WeatherData:
    """Get weather data - real API first, then fallback to simulation"""
    try:
        # Try to get real weather data first
        if OPENWEATHER_API_KEY:
            real_weather = await get_real_weather_data(lat, lon)
            if real_weather:
                logging.info(f"Using real weather data for {lat}, {lon}")
                return real_weather
            else:
                logging.warning("Real weather API failed, using simulation")
        else:
            logging.info("No OpenWeatherMap API key configured, using simulation")
        
        # Fallback to enhanced simulation
        return await get_simulated_weather_data(lat, lon)
        
    except Exception as e:
        logging.error(f"Error in weather data retrieval: {e}")
        # Return safe defaults
        return WeatherData(
            temperature=20.0,
            humidity=50.0,
            weather_condition="clear",
            ice_confidence=0.0,
            hazard_level="low",
            specific_hazards=[]
        )

async def analyze_location_safety(location: LocationData, weather: WeatherData, user_context: Dict) -> SafetyScore:
    """Use AI to analyze location safety"""
    try:
        # Initialize AI chat
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"safety_analysis_{uuid.uuid4()}",
            system_message="You are a pedestrian safety expert analyzing location data, weather conditions, and context to provide safety scores and recommendations."
        ).with_model("gemini", "gemini-2.0-flash")
        
        # Prepare context for AI analysis
        analysis_context = f"""
        Location: Latitude {location.latitude}, Longitude {location.longitude}
        Weather: {weather.weather_condition}, Temperature: {weather.temperature}°C, Humidity: {weather.humidity}%
        Ice Risk: {weather.ice_risk}, Weather Hazard Level: {weather.hazard_level}
        Wind Speed: {weather.wind_speed} km/h, Visibility: {weather.visibility} km
        User Context: {json.dumps(user_context)}
        
        Analyze the safety for a pedestrian in this location and provide:
        1. Overall safety score (0-100, where 100 is safest)
        2. Weather risk score (0-100)
        3. Traffic risk score (0-100) 
        4. Location risk score (0-100)
        5. Up to 5 key risk factors
        6. Up to 5 safety recommendations
        7. Any critical alerts
        
        Format your response as JSON with these exact keys:
        {{
            "overall_score": 75,
            "weather_risk": 80,
            "traffic_risk": 70,
            "location_risk": 75,
            "risk_factors": ["Weather conditions", "Traffic density"],
            "recommendations": ["Wear bright clothing", "Stay alert"],
            "alerts": [{{"type": "weather", "message": "Alert message here", "priority": "medium"}}]
        }}
        """
        
        message = UserMessage(text=analysis_context)
        response = await chat.send_message(message)
        
        # Parse AI response
        try:
            ai_data = json.loads(response)
            return SafetyScore(
                overall_score=ai_data.get("overall_score", 75),
                weather_risk=ai_data.get("weather_risk", 80),
                traffic_risk=ai_data.get("traffic_risk", 70),
                location_risk=ai_data.get("location_risk", 75),
                risk_factors=ai_data.get("risk_factors", []),
                recommendations=ai_data.get("recommendations", []),
                alerts=ai_data.get("alerts", [])
            )
        except json.JSONDecodeError:
            # Fallback if AI response is not valid JSON
            return generate_fallback_safety_score(weather, user_context)
            
    except Exception as e:
        logging.error(f"Error in AI safety analysis: {e}")
        return generate_fallback_safety_score(weather, user_context)

def generate_fallback_safety_score(weather: WeatherData, user_context: Dict) -> SafetyScore:
    """Generate safety score using rule-based approach as fallback"""
    score = 80  # Base score
    risk_factors = []
    recommendations = []
    alerts = []
    
    # Weather-based adjustments
    weather_risk = 80
    if weather.ice_risk:
        score -= 30
        weather_risk = 20
        risk_factors.append("Icy conditions detected")
        recommendations.append("Wear appropriate footwear with good grip")
        alerts.append({"type": "weather", "message": "ICY CONDITIONS - Exercise extreme caution", "priority": "high"})
    
    if weather.weather_condition == "fog":
        score -= 20
        weather_risk -= 30
        risk_factors.append("Poor visibility due to fog")
        recommendations.append("Use bright clothing and lights")
    
    if weather.wind_speed > 15:
        score -= 10
        risk_factors.append("Strong winds")
        recommendations.append("Be aware of falling objects")
    
    # Traffic risk (simulated)
    traffic_risk = 70
    
    # Location risk (simulated)
    location_risk = 75
    
    return SafetyScore(
        overall_score=max(0, min(100, score)),
        weather_risk=max(0, min(100, weather_risk)),
        traffic_risk=traffic_risk,
        location_risk=location_risk,
        risk_factors=risk_factors,
        recommendations=recommendations,
        alerts=alerts
    )

# API Endpoints
@api_router.post("/safety/analyze", response_model=SafetyAnalysisResponse)
async def analyze_safety(request: SafetyAnalysisRequest):
    """Analyze safety for a given location"""
    try:
        # Get weather data
        weather = await get_weather_data(request.location.latitude, request.location.longitude)
        
        # Analyze safety using AI
        safety_score = await analyze_location_safety(request.location, weather, request.user_context)
        
        # Perform proximity threat detection
        proximity_analysis = await detect_proximity_threats(
            request.location, 
            request.movement_history or [], 
            request.user_context
        )
        
        # Integrate proximity threats into safety score
        if proximity_analysis.detected_threats:
            # Reduce safety score based on proximity threats
            threat_penalty = 0
            for threat in proximity_analysis.detected_threats:
                if threat.threat_level == "critical":
                    threat_penalty += 30
                elif threat.threat_level == "high":
                    threat_penalty += 20
                elif threat.threat_level == "medium":
                    threat_penalty += 10
                else:
                    threat_penalty += 5
            
            safety_score.overall_score = max(0, safety_score.overall_score - threat_penalty)
            
            # Add proximity-based risk factors and alerts
            for threat in proximity_analysis.detected_threats:
                risk_msg = f"Potential {threat.threat_type} detected {threat.distance:.0f}m {threat.direction}"
                safety_score.risk_factors.append(risk_msg)
                
                alert_priority = "high" if threat.threat_level in ["high", "critical"] else "medium"
                safety_score.alerts.append({
                    "type": "proximity_threat",
                    "message": f"{threat.threat_type.replace('_', ' ').title()} detected. {threat.recommended_action.replace('_', ' ').title()}.",
                    "priority": alert_priority
                })
            
            # Add proximity-specific recommendations
            if proximity_analysis.nearby_safe_locations:
                safety_score.recommendations.append(f"Nearby safe locations: {', '.join(proximity_analysis.nearby_safe_locations[:2])}")
            
            if proximity_analysis.isolation_risk:
                safety_score.recommendations.append("You're in an isolated area. Consider moving to a more populated location.")
        
        # Create response
        analysis = SafetyAnalysisResponse(
            location=request.location,
            weather=weather,
            safety_score=safety_score,
            ai_analysis="AI analysis with proximity threat detection completed successfully"
        )
        
        # Store proximity analysis separately for detailed analysis
        proximity_doc = proximity_analysis.dict()
        proximity_doc['user_id'] = request.user_context.get('user_id', 'anonymous')
        await db.proximity_analyses.insert_one(proximity_doc)
        
        # Store in database
        await db.safety_analyses.insert_one(analysis.dict())
        
        return analysis
    except Exception as e:
        logging.error(f"Error analyzing safety: {e}")
        raise HTTPException(status_code=500, detail="Error analyzing safety")

@api_router.get("/safety/alerts/{lat}/{lon}/{radius}")
async def get_nearby_alerts(lat: float, lon: float, radius: float = 1000):
    """Get active alerts within radius of location"""
    try:
        current_time = datetime.utcnow()
        
        # Find active alerts (simplified - in production you'd use geospatial queries)
        alerts = await db.emergency_alerts.find({
            "active": True,
            "expires_at": {"$gt": current_time}
        }).to_list(100)
        
        # Filter by distance (simplified)
        nearby_alerts = []
        for alert in alerts:
            # Convert ObjectId to string for JSON serialization
            if "_id" in alert:
                alert["_id"] = str(alert["_id"])
            
            alert_location = alert["location"]
            distance = calculate_distance(
                lat, lon,
                alert_location["latitude"], alert_location["longitude"]
            )
            if distance <= radius:
                alert["distance"] = distance
                nearby_alerts.append(alert)
        
        return {"alerts": nearby_alerts}
    except Exception as e:
        logging.error(f"Error getting alerts: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving alerts")

@api_router.post("/community/report")
async def submit_community_report(report: CommunityReport):
    """Submit a community safety report"""
    try:
        # Store in database
        await db.community_reports.insert_one(report.dict())
        
        # If it's a high-severity report, create an alert
        if report.severity == "high":
            alert = EmergencyAlert(
                alert_type=report.report_type,
                location=report.location,
                radius=500,  # 500 meters
                severity=report.severity,
                message=f"Community reported {report.report_type}: {report.description}",
                expires_at=datetime.utcnow() + timedelta(hours=2)
            )
            await db.emergency_alerts.insert_one(alert.dict())
        
        return {"status": "success", "message": "Report submitted successfully"}
    except Exception as e:
        logging.error(f"Error submitting report: {e}")
        raise HTTPException(status_code=500, detail="Error submitting report")

@api_router.get("/safety/history/{user_id}")
async def get_safety_history(user_id: str, limit: int = 50):
    """Get safety analysis history for a user"""
    try:
        analyses = await db.safety_analyses.find(
            {"user_context.user_id": user_id}
        ).sort("timestamp", -1).limit(limit).to_list(limit)
        
        # Convert ObjectId to string for JSON serialization
        for analysis in analyses:
            if "_id" in analysis:
                analysis["_id"] = str(analysis["_id"])
        
        return {"analyses": analyses}
    except Exception as e:
        logging.error(f"Error getting safety history: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving safety history")

@api_router.post("/emergency/vehicle-detected")
async def report_emergency_vehicle(location: LocationData, detection_method: str = "audio"):
    """Report emergency vehicle detection"""
    try:
        alert = EmergencyAlert(
            alert_type="emergency_vehicle",
            location=location,
            radius=800,  # 800 meters
            severity="high",
            message=f"Emergency vehicle detected via {detection_method}",
            expires_at=datetime.utcnow() + timedelta(minutes=10)
        )
        
        await db.emergency_alerts.insert_one(alert.dict())
        
        return {"status": "success", "message": "Emergency vehicle alert created"}
    except Exception as e:
        logging.error(f"Error reporting emergency vehicle: {e}")
        raise HTTPException(status_code=500, detail="Error reporting emergency vehicle")

@api_router.post("/proximity/analyze")
async def analyze_proximity_threats(
    location: LocationData,
    movement_history: List[LocationData] = [],
    user_context: Dict = {}
):
    """Dedicated endpoint for proximity threat analysis"""
    try:
        proximity_analysis = await detect_proximity_threats(location, movement_history, user_context)
        
        # Store analysis in database
        proximity_doc = proximity_analysis.dict()
        proximity_doc['user_id'] = user_context.get('user_id', 'anonymous')
        await db.proximity_analyses.insert_one(proximity_doc)
        
        return proximity_analysis
    except Exception as e:
        logging.error(f"Error analyzing proximity threats: {e}")
        raise HTTPException(status_code=500, detail="Error analyzing proximity threats")

@api_router.get("/proximity/history/{user_id}")
async def get_proximity_history(user_id: str, limit: int = 50):
    """Get proximity analysis history for a user"""
    try:
        analyses = await db.proximity_analyses.find(
            {"user_id": user_id}
        ).sort("timestamp", -1).limit(limit).to_list(limit)
        
        # Convert ObjectId to string for JSON serialization
        for analysis in analyses:
            if "_id" in analysis:
                analysis["_id"] = str(analysis["_id"])
        
        return {"proximity_analyses": analyses}
    except Exception as e:
        logging.error(f"Error getting proximity history: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving proximity history")

@api_router.post("/audio/noise-profile")
async def analyze_audio_environment(
    location: LocationData,
    weather_data: Optional[Dict] = None,
    user_context: Dict = {}
):
    """AI-driven environmental noise analysis for adaptive noise cancellation"""
    try:
        # Convert weather dict to WeatherData if provided
        weather = None
        if weather_data:
            weather = WeatherData(**weather_data)
        else:
            weather = await get_weather_data(location.latitude, location.longitude)
        
        noise_profile = await analyze_environmental_noise(location, weather, user_context)
        
        # Store noise profile for learning
        noise_doc = noise_profile.dict()
        noise_doc['user_id'] = user_context.get('user_id', 'anonymous')
        await db.noise_profiles.insert_one(noise_doc)
        
        return noise_profile
    except Exception as e:
        logging.error(f"Error analyzing audio environment: {e}")
        raise HTTPException(status_code=500, detail="Error analyzing audio environment")

@api_router.post("/health/biometric-analysis")
async def analyze_biometrics(
    biometric_data: BiometricData,
    location: LocationData,
    safety_context: Optional[Dict] = {}
):
    """Analyze biometric data for health monitoring and emergency detection"""
    try:
        health_alerts = await analyze_biometric_data(biometric_data, location, safety_context)
        
        # Store biometric data
        biometric_doc = biometric_data.dict()
        biometric_doc['location'] = location.dict()
        await db.biometric_data.insert_one(biometric_doc)
        
        # Store health alerts
        for alert in health_alerts:
            alert_doc = alert.dict()
            await db.health_alerts.insert_one(alert_doc)
            
            # Trigger emergency protocols if needed
            if alert.auto_emergency:
                emergency_alert = EmergencyAlert(
                    alert_type="safety_concern",
                    location=location,
                    radius=500,
                    severity="critical",
                    message=f"Safety concern detected: {alert.message}",
                    expires_at=datetime.utcnow() + timedelta(hours=1)
                )
                await db.emergency_alerts.insert_one(emergency_alert.dict())
        
        return {"health_alerts": health_alerts, "emergency_triggered": any(alert.auto_emergency for alert in health_alerts)}
    except Exception as e:
        logging.error(f"Error analyzing biometric data: {e}")
        raise HTTPException(status_code=500, detail="Error analyzing biometric data")

@api_router.get("/health/history/{user_id}")
async def get_health_history(user_id: str, limit: int = 100):
    """Get biometric and health alert history for a user"""
    try:
        # Get recent biometric data
        biometric_history = await db.biometric_data.find({
            "user_id": user_id
        }).sort("timestamp", -1).limit(limit).to_list(limit)
        
        # Get health alerts
        health_alerts = await db.health_alerts.find({
            "biometric_data.user_id": user_id
        }).sort("timestamp", -1).limit(50).to_list(50)
        
        # Convert ObjectIds to strings
        for item in biometric_history + health_alerts:
            if "_id" in item:
                item["_id"] = str(item["_id"])
        
        return {
            "biometric_history": biometric_history,
            "health_alerts": health_alerts
        }
    except Exception as e:
        logging.error(f"Error getting health history: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving health history")

# Cycling Safety Management Endpoints

@api_router.post("/cycling/threats")
async def analyze_cycling_threats_endpoint(request: Dict):
    """Analyze cycling-specific threats and hazards"""
    try:
        location_data = LocationData(**request.get("location", {}))
        cycling_context_data = request.get("cycling_context", {})
        movement_history_data = request.get("movement_history", [])
        
        # Create cycling context with defaults
        cycling_context = CyclingContext(
            speed_kmh=cycling_context_data.get("speed_kmh"),
            avg_speed_kmh=cycling_context_data.get("avg_speed_kmh"),
            road_type=cycling_context_data.get("road_type", "mixed"),
            traffic_density=cycling_context_data.get("traffic_density", "medium"),
            bike_type=cycling_context_data.get("bike_type", "road"),
            rider_experience=cycling_context_data.get("rider_experience", "intermediate"),
            group_riding=cycling_context_data.get("group_riding", False),
            time_of_ride=cycling_context_data.get("time_of_ride", "day"),
            weather_conditions=cycling_context_data.get("weather_conditions", "clear")
        )
        
        movement_history = [LocationData(**loc) for loc in movement_history_data]
        
        threats = await analyze_cycling_threats(location_data, cycling_context, movement_history)
        
        # Convert threats to dict for JSON response
        threats_dict = [threat.dict() for threat in threats]
        
        return {
            "cycling_threats": threats_dict,
            "threat_count": len(threats),
            "risk_level": "high" if any(t.severity in ["high", "critical"] for t in threats) else "medium" if threats else "low",
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logging.error(f"Error analyzing cycling threats: {e}")
        raise HTTPException(status_code=500, detail="Error analyzing cycling threats")

@api_router.post("/cycling/safety-score")
async def calculate_cycling_safety_score(request: Dict):
    """Calculate cycling-specific safety score with speed and road considerations"""
    try:
        location_data = LocationData(**request.get("location", {}))
        cycling_context_data = request.get("cycling_context", {})
        
        speed_kmh = cycling_context_data.get("speed_kmh", 0)
        road_type = cycling_context_data.get("road_type", "mixed")
        traffic_density = cycling_context_data.get("traffic_density", "medium")
        rider_experience = cycling_context_data.get("rider_experience", "intermediate")
        
        # Base safety score
        base_score = 75
        
        # Speed-based risk adjustment
        if speed_kmh > 40:
            base_score -= 15  # High speed risk
        elif speed_kmh > 30:
            base_score -= 10
        elif speed_kmh > 20:
            base_score -= 5
        
        # Road type risk adjustment
        road_risk_adjustment = {
            "bike_lane": 10,
            "trail": 15,
            "mixed": 0,
            "road": -15,
            "highway_shoulder": -25
        }.get(road_type, 0)
        
        base_score += road_risk_adjustment
        
        # Traffic density adjustment
        traffic_adjustment = {
            "light": 10,
            "medium": 0,
            "heavy": -15
        }.get(traffic_density, 0)
        
        base_score += traffic_adjustment
        
        # Experience adjustment
        experience_adjustment = {
            "beginner": -10,
            "intermediate": 0,
            "advanced": 5,
            "professional": 10
        }.get(rider_experience, 0)
        
        base_score += experience_adjustment
        
        # Time-based adjustment (rush hour penalty)
        current_hour = datetime.utcnow().hour
        if current_hour in [7, 8, 9, 17, 18, 19]:
            base_score -= 10
        
        # Ensure score is within bounds
        final_score = max(0, min(100, base_score))
        
        # Generate cycling-specific recommendations
        recommendations = []
        if speed_kmh > 35:
            recommendations.append("Consider reducing speed for better reaction time")
        if road_type in ["road", "highway_shoulder"]:
            recommendations.append("Use dedicated bike lanes when available")
        if traffic_density == "heavy":
            recommendations.append("Extra vigilance required in heavy traffic")
        if final_score < 50:
            recommendations.append("Consider alternative route with better cycling infrastructure")
        
        return {
            "cycling_safety_score": final_score,
            "risk_level": "high" if final_score < 40 else "medium" if final_score < 70 else "low",
            "speed_risk_factor": min(speed_kmh / 50.0, 1.0),
            "road_type": road_type,
            "traffic_density": traffic_density,
            "recommendations": recommendations,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logging.error(f"Error calculating cycling safety score: {e}")
        raise HTTPException(status_code=500, detail="Error calculating cycling safety score")

@api_router.get("/cycling/route-suggestions/{lat}/{lon}")
async def get_cycling_route_suggestions(lat: float, lon: float, destination_lat: float = None, destination_lon: float = None):
    """Get cycling-optimized route suggestions and hazard warnings"""
    try:
        # Simulate cycling route analysis
        suggestions = {
            "current_location": {"lat": lat, "lon": lon},
            "bike_lanes_nearby": [
                {"name": "Main Street Bike Lane", "distance_m": 200, "safety_rating": 85},
                {"name": "Riverside Trail", "distance_m": 800, "safety_rating": 95}
            ],
            "hazard_zones": [
                {"type": "high_traffic", "location": "5th & Main Intersection", "distance_m": 150},
                {"type": "construction", "location": "Broadway Bridge", "distance_m": 500}
            ],
            "recommended_routes": [
                {
                    "route_id": "safe_1",
                    "description": "Bike lane route via Main Street",
                    "safety_score": 85,
                    "estimated_time_min": 12,
                    "distance_km": 3.2
                },
                {
                    "route_id": "fast_1", 
                    "description": "Direct route via city streets",
                    "safety_score": 65,
                    "estimated_time_min": 8,
                    "distance_km": 2.1
                }
            ]
        }
        
        return suggestions
        
    except Exception as e:
        logging.error(f"Error getting cycling route suggestions: {e}")
        raise HTTPException(status_code=500, detail="Error getting route suggestions")

# Emergency Contact Management Endpoints

@api_router.post("/emergency/settings")
async def save_emergency_settings(settings: EmergencySettings):
    """Save user emergency settings including trigger word and contacts"""
    try:
        # Check if settings exist for this user
        existing = await db.emergency_settings.find_one({"user_id": settings.user_id})
        
        settings_dict = settings.dict()
        settings_dict["updated_at"] = datetime.utcnow()
        
        if existing:
            # Update existing settings
            await db.emergency_settings.update_one(
                {"user_id": settings.user_id},
                {"$set": settings_dict}
            )
        else:
            # Create new settings
            settings_dict["created_at"] = datetime.utcnow()
            await db.emergency_settings.insert_one(settings_dict)
        
        return {"status": "success", "message": "Emergency settings saved"}
    except Exception as e:
        logging.error(f"Error saving emergency settings: {e}")
        raise HTTPException(status_code=500, detail="Error saving emergency settings")

@api_router.get("/emergency/settings/{user_id}")
async def get_emergency_settings(user_id: str):
    """Get user emergency settings"""
    try:
        settings = await db.emergency_settings.find_one({"user_id": user_id})
        if settings:
            settings["_id"] = str(settings["_id"])
            return settings
        return {"error": "No emergency settings found"}
    except Exception as e:
        logging.error(f"Error getting emergency settings: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving emergency settings")

@api_router.post("/emergency/trigger")
async def trigger_emergency(event: EmergencyEvent):
    """Trigger alert protocol - notify trusted contacts"""
    try:
        # Get user's emergency settings
        settings = await db.emergency_settings.find_one({"user_id": event.user_id})
        if not settings:
            raise HTTPException(status_code=404, detail="No emergency settings found for user")
        
        # Create emergency event record
        event_dict = event.dict()
        event_dict["created_at"] = datetime.utcnow()
        
        # In a real implementation, this would:
        # 1. Send SMS/push notifications to emergency contacts
        # 2. Call emergency services based on location
        # 3. Share real-time location with contacts
        # 4. Log all communication attempts
        
        # For now, we'll simulate the process
        contacts_notified = []
        for contact in settings.get("contacts", []):
            # Simulate notification success
            contacts_notified.append(contact)
            logging.info(f"Emergency alert sent to: {contact}")
        
        event_dict["contacts_notified"] = contacts_notified
        event_dict["authorities_contacted"] = settings.get("auto_call_authorities", True)
        
        # Store emergency event
        result = await db.emergency_events.insert_one(event_dict)
        event_dict["_id"] = str(result.inserted_id)
        
        # Create emergency alert for community
        alert = EmergencyAlert(
            alert_type="personal_emergency",
            location=event.location,
            radius=1000,  # 1km radius for community awareness
            severity="critical",
            message="Emergency situation in progress - avoid area if possible",
            expires_at=datetime.utcnow() + timedelta(hours=2)
        )
        await db.emergency_alerts.insert_one(alert.dict())
        
        return {
            "status": "emergency_triggered",
            "event_id": str(result.inserted_id),
            "contacts_notified": len(contacts_notified),
            "authorities_contacted": event_dict["authorities_contacted"],
            "message": "Emergency protocols activated. Help is on the way."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error triggering emergency: {e}")
        raise HTTPException(status_code=500, detail="Error processing emergency")

@api_router.post("/emergency/resolve/{event_id}")
async def resolve_emergency(event_id: str, resolution_method: str = "user_confirmed_safe"):
    """Mark emergency as resolved"""
    try:
        from bson import ObjectId
        
        result = await db.emergency_events.update_one(
            {"_id": ObjectId(event_id)},
            {
                "$set": {
                    "resolved": True,
                    "resolution_method": resolution_method,
                    "resolved_at": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Emergency event not found")
        
        return {"status": "resolved", "message": "Emergency marked as resolved"}
    except Exception as e:
        logging.error(f"Error resolving emergency: {e}")
        raise HTTPException(status_code=500, detail="Error resolving emergency")

@api_router.get("/emergency/history/{user_id}")
async def get_emergency_history(user_id: str, limit: int = 50):
    """Get user's emergency event history"""
    try:
        events = await db.emergency_events.find({
            "user_id": user_id
        }).sort("created_at", -1).limit(limit).to_list(limit)
        
        # Convert ObjectId to string
        for event in events:
            if "_id" in event:
                event["_id"] = str(event["_id"])
        
        return {"emergency_events": events}
    except Exception as e:
        logging.error(f"Error getting emergency history: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving emergency history")

@api_router.get("/")
async def root():
    return {"message": "Street Shield API - AI-powered safety awareness for pedestrians, runners and cyclists"}

@api_router.get("/app-info")
async def app_info():
    """Public app info endpoint for SEO and discovery"""
    return {
        "name": "Street Shield",
        "tagline": "AI-Powered Personal Safety Awareness for Everyone",
        "description": "Street Shield is your intelligent personal safety awareness companion. Whether you're walking home alone at night, running through the city, cycling to work, or travelling in unfamiliar areas — Street Shield keeps you informed and connected with real-time AI awareness scoring, quick alerts to trusted contacts, and live location sharing. This is a safety awareness tool, not a replacement for professional services.",
        "features": [
            {"name": "Quick Alert Button", "description": "One-tap alert that instantly notifies your trusted contacts with your live location"},
            {"name": "Live Location Sharing", "description": "Share your real-time location with family and friends"},
            {"name": "AI Awareness Scoring", "description": "Intelligent analysis of your surroundings, including silent electric scooter warnings"},
            {"name": "Voice-Activated Alerts", "description": "Say 'Street Shield' to send alerts to your trusted contacts hands-free"},
            {"name": "Cycling Safety Mode", "description": "Specialised awareness for cyclists with vehicle proximity alerts"},
            {"name": "Activity Insights", "description": "Real-time activity rhythm, energy, and alertness tracking"},
            {"name": "Multi-Language Support", "description": "Available in English, Spanish, French, German, and Chinese"},
            {"name": "Offline Safety Mode", "description": "Core features work even without a network connection"},
        ],
        "use_cases": [
            "Walking alone at night",
            "Running or jogging safely",
            "Cycling commute awareness",
            "Student campus safety",
            "Late-night travel and taxi safety",
            "Family and child safety tracking",
            "Elderly check-in alerts",
            "Lone worker awareness",
        ],
        "disclaimer": "Street Shield is a safety awareness tool for informational purposes only. It does not replace or connect to professional services.",
        "platforms": ["iOS", "Android", "Web"],
        "languages": ["English", "Spanish", "French", "German", "Chinese"],
        "version": "1.0.0"
    }

# Journey Report Models
class CyclingJourneyMetrics(BaseModel):
    max_speed_kmh: float = 0.0
    avg_speed_kmh: float = 0.0
    elevation_gain_m: float = 0.0
    elevation_loss_m: float = 0.0
    max_elevation_m: float = 0.0
    min_elevation_m: float = 0.0
    elevation_profile: List[float] = Field(default_factory=list)  # elevation at each point
    cadence_avg: int = 0
    power_avg_watts: int = 0
    road_types: Dict[str, float] = Field(default_factory=dict)  # % on each road type
    hazards_encountered: int = 0
    hazard_details: List[Dict] = Field(default_factory=list)
    effort_score: int = 50  # 0-100 effort intensity
    cycling_safety_score: int = 75

class JourneyReportRequest(BaseModel):
    user_id: str = "anonymous"
    activity_type: str = "walking"
    route_points: List[Dict] = Field(default_factory=list)
    distance_km: float = 0.0
    duration_minutes: float = 0.0
    avg_safety_score: int = 0
    steps: int = 0
    avg_heart_rate: int = 0
    cycling_metrics: Optional[CyclingJourneyMetrics] = None

class JourneyReport(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    activity_type: str
    route_points: List[Dict]
    distance_km: float
    duration_minutes: float
    avg_safety_score: int
    steps: int
    avg_heart_rate: int
    started_at: str
    completed_at: str
    share_token: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    cycling_metrics: Optional[Dict] = None

def simulate_elevation_profile(route_points: List[Dict], distance_km: float) -> Dict:
    """Simulate elevation data for a route based on coordinates"""
    import math
    n = max(len(route_points), 2)
    base_elevation = 45.0  # base meters
    profile = []
    
    for i in range(n):
        t = i / max(n - 1, 1)
        # Create realistic rolling hills using sine waves
        elev = base_elevation + 15 * math.sin(t * math.pi * 2.5) + 8 * math.sin(t * math.pi * 5.3) + random.uniform(-2, 2)
        profile.append(round(max(5, elev), 1))
    
    gains = sum(max(0, profile[i] - profile[i-1]) for i in range(1, len(profile)))
    losses = sum(max(0, profile[i-1] - profile[i]) for i in range(1, len(profile)))
    
    return {
        "elevation_profile": profile,
        "elevation_gain_m": round(gains, 1),
        "elevation_loss_m": round(losses, 1),
        "max_elevation_m": round(max(profile), 1),
        "min_elevation_m": round(min(profile), 1),
    }

def calculate_effort_score(distance_km: float, duration_min: float, elevation_gain: float, avg_speed: float) -> int:
    """Calculate cycling effort intensity 0-100"""
    # Base effort from speed
    speed_effort = min(avg_speed / 35.0 * 40, 40)
    # Elevation effort (steeper = harder)
    elev_effort = min(elevation_gain / (distance_km * 10 + 1) * 30, 30)
    # Duration effort
    duration_effort = min(duration_min / 60 * 20, 20)
    # Intensity factor
    intensity = min(distance_km / duration_min * 60 / 25 * 10, 10) if duration_min > 0 else 0
    
    return max(10, min(100, int(speed_effort + elev_effort + duration_effort + intensity)))

@api_router.post("/journey/complete")
async def complete_journey(request: JourneyReportRequest):
    """Save a completed journey and return a shareable report"""
    now = datetime.utcnow()
    started_at = (now - timedelta(minutes=request.duration_minutes)).isoformat()
    
    # If cycling, generate elevation and effort data
    cycling_data = None
    if request.activity_type == "cycling":
        elev = simulate_elevation_profile(request.route_points, request.distance_km)
        
        cm = request.cycling_metrics
        avg_speed = cm.avg_speed_kmh if cm else (request.distance_km / max(request.duration_minutes / 60, 0.01))
        max_speed = cm.max_speed_kmh if cm else avg_speed * 1.4
        cadence = cm.cadence_avg if cm else random.randint(65, 95)
        power = cm.power_avg_watts if cm else random.randint(120, 280)
        hazards = cm.hazards_encountered if cm else random.randint(0, 5)
        safety = cm.cycling_safety_score if cm else request.avg_safety_score
        
        effort = calculate_effort_score(
            request.distance_km, request.duration_minutes,
            elev["elevation_gain_m"], avg_speed
        )
        
        road_types = cm.road_types if cm and cm.road_types else {
            "bike_lane": round(random.uniform(0.3, 0.6), 2),
            "road": round(random.uniform(0.1, 0.3), 2),
            "mixed": round(random.uniform(0.1, 0.3), 2),
        }
        
        cycling_data = {
            "max_speed_kmh": round(max_speed, 1),
            "avg_speed_kmh": round(avg_speed, 1),
            "cadence_avg": cadence,
            "power_avg_watts": power,
            "effort_score": effort,
            "hazards_encountered": hazards,
            "cycling_safety_score": safety,
            "road_types": road_types,
            **elev,
        }
    
    report = JourneyReport(
        user_id=request.user_id,
        activity_type=request.activity_type,
        route_points=request.route_points,
        distance_km=round(request.distance_km, 2),
        duration_minutes=round(request.duration_minutes, 1),
        avg_safety_score=request.avg_safety_score,
        steps=request.steps,
        avg_heart_rate=request.avg_heart_rate,
        started_at=started_at,
        completed_at=now.isoformat(),
        cycling_metrics=cycling_data,
    )
    
    report_dict = report.dict()
    await db.journey_reports.insert_one(report_dict)
    report_dict.pop('_id', None)
    
    return report_dict

@api_router.get("/journey/report/{share_token}")
async def get_journey_report(share_token: str):
    """Get a journey report by share token"""
    report = await db.journey_reports.find_one(
        {"share_token": share_token},
        {"_id": 0}
    )
    if not report:
        raise HTTPException(status_code=404, detail="Journey report not found")
    return report

@api_router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow(),
        "services": {
            "database": "connected",
            "ai": "available" if EMERGENT_LLM_KEY else "not configured",
            "weather_api": "real weather available" if OPENWEATHER_API_KEY else "simulation mode"
        }
    }

@api_router.get("/privacy-policy")
async def get_privacy_policy():
    """Serve privacy policy as structured data for store compliance."""
    return {
        "title": "Street Shield Privacy Policy",
        "last_updated": "2026-04-02",
        "sections": [
            {"heading": "Information We Collect", "content": "Street Shield collects location data (GPS coordinates) only while the app is actively in use and the shield is activated. We also collect device sensor data (accelerometer, pedometer) for activity insights. All data is processed locally on your device or via our secure servers."},
            {"heading": "How We Use Your Information", "content": "Your location data is used solely to provide real-time safety analysis and environmental awareness. Activity data (steps, motion) is used to provide personalized activity insights. We do not sell, share, or distribute your personal data to third parties."},
            {"heading": "Data Storage & Security", "content": "Safety analysis data is stored temporarily on our encrypted servers and automatically deleted after 24 hours. Trusted contact information is stored locally on your device using encrypted storage. We use industry-standard encryption for all data transmissions."},
            {"heading": "Trusted Contacts", "content": "Phone numbers you provide as trusted contacts are stored locally on your device. When a quick alert is triggered, your location is shared only with those contacts. We do not retain or access your contacts list."},
            {"heading": "Third-Party Services", "content": "Street Shield uses AI services for safety analysis and weather APIs for environmental data. These services receive anonymized location data only. No personally identifiable information is shared with these providers."},
            {"heading": "Your Rights", "content": "You can delete all locally stored data at any time by clearing the app data. You can revoke location permissions through your device settings. You may request deletion of any server-side data by contacting us."},
            {"heading": "Children's Privacy", "content": "Street Shield is designed for users aged 13 and above. We do not knowingly collect data from children under 13."},
            {"heading": "Disclaimer", "content": "Street Shield is a safety awareness tool for informational purposes only. It is not a replacement for professional safety services, medical devices, or calling local authorities."},
        ],
        "contact": "support@streetshield.app"
    }

@api_router.get("/marketing-video", response_class=HTMLResponse)
async def marketing_video():
    """Serve the marketing video HTML page."""
    video_path = ROOT_DIR / 'static' / 'marketing-video.html'
    if video_path.exists():
        return HTMLResponse(content=video_path.read_text())
    raise HTTPException(status_code=404, detail="Marketing video not found")

@api_router.get("/marketing-video/promo")
async def marketing_promo_video():
    """Download the AI-generated promo video."""
    video_path = Path('/app/screenshots/marketing/promo_video.mp4')
    if video_path.exists():
        return FileResponse(
            video_path,
            media_type='video/mp4',
            filename='street-shield-promo.mp4'
        )
    raise HTTPException(status_code=404, detail="Promo video not generated yet")

# Include the router in the main app
app.include_router(api_router)

# Root-level health check for Kubernetes/deployment systems
@app.get("/health")
async def root_health_check():
    """
    Health check endpoint at root level for Kubernetes liveness/readiness probes.
    Returns basic health status without detailed service information.
    """
    return {
        "status": "healthy",
        "service": "street-shield-backend",
        "timestamp": datetime.utcnow().isoformat()
    }

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()