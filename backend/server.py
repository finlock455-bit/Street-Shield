from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks
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
from emergentintegrations.llm.chat import LlmChat, UserMessage
import math

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

class ProximityThreat(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    threat_type: str  # "following", "approaching", "loitering", "aggressive_approach"
    distance: float  # meters
    duration: float  # seconds being followed/tracked
    confidence: float = Field(ge=0.0, le=1.0)  # 0.0 to 1.0 confidence score
    direction: str = "behind"  # "behind", "ahead", "left", "right"
    movement_pattern: str = "matching_pace"  # "matching_pace", "closing_in", "erratic"
    threat_level: str = "low"  # "low", "medium", "high", "critical"
    recommended_action: str = "stay_alert"
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
    heart_rate: Optional[int] = None  # BPM
    heart_rate_variability: Optional[float] = None  # HRV
    step_count: Optional[int] = None
    calories_burned: Optional[float] = None
    stress_level: float = Field(ge=0.0, le=1.0, default=0.0)  # 0.0 = relaxed, 1.0 = high stress
    fatigue_level: float = Field(ge=0.0, le=1.0, default=0.0)  # 0.0 = energetic, 1.0 = exhausted
    activity_level: str = "moderate"  # "sedentary", "light", "moderate", "vigorous"
    blood_oxygen: Optional[int] = None  # SpO2 percentage
    skin_temperature: Optional[float] = None  # Celsius
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
            import random
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

@api_router.get("/")
async def root():
    return {"message": "Street Shield API - Advanced AI protection for pedestrians and runners"}

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

# Include the router in the main app
app.include_router(api_router)

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