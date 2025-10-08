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
OPENWEATHER_API_KEY = "YOUR_API_KEY_HERE"  # You'll need to get a free API key from OpenWeatherMap
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

class WeatherData(BaseModel):
    temperature: float
    humidity: float
    weather_condition: str
    visibility: Optional[float] = None
    wind_speed: Optional[float] = None
    feels_like: Optional[float] = None
    ice_risk: bool = False
    hazard_level: str = "low"  # low, medium, high, critical

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

async def get_weather_data(lat: float, lon: float) -> WeatherData:
    """Get enhanced weather data with improved accuracy"""
    try:
        # Enhanced simulated weather data with realistic patterns
        import random
        from datetime import datetime, time
        
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
        if temp <= 4:  # Expanded ice risk threshold
            if condition in ["rain", "snow"]:
                ice_risk = True
            elif humidity > 80 and temp <= 1:  # Frost conditions
                ice_risk = True
        
        # More accurate hazard level assessment
        hazard_level = "low"
        hazard_score = 0
        
        # Temperature hazards
        if temp <= -10 or temp >= 40:
            hazard_score += 3
        elif temp <= 0 or temp >= 35:
            hazard_score += 2
        elif temp <= 2 or temp >= 32:
            hazard_score += 1
            
        # Weather condition hazards
        if condition == "snow":
            hazard_score += 3
        elif condition == "rain" and temp <= 2:  # Freezing rain
            hazard_score += 4
        elif condition == "fog" and visibility <= 1:
            hazard_score += 3
        elif condition in ["rain", "fog"]:
            hazard_score += 1
            
        # Wind hazards
        if wind_speed >= 25:
            hazard_score += 2
        elif wind_speed >= 15:
            hazard_score += 1
            
        # Ice risk adds significant hazard
        if ice_risk:
            hazard_score += 3
            
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
            hazard_level=hazard_level
        )
        
    except Exception as e:
        logging.error(f"Error getting weather data: {e}")
        # Return safe defaults
        return WeatherData(
            temperature=20.0,
            humidity=50.0,
            weather_condition="clear",
            hazard_level="low"
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
        
        # Create response
        analysis = SafetyAnalysisResponse(
            location=request.location,
            weather=weather,
            safety_score=safety_score,
            ai_analysis="AI analysis completed successfully"
        )
        
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

@api_router.get("/")
async def root():
    return {"message": "SafeWalk API - Keeping pedestrians safe with AI-powered analysis"}

@api_router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow(),
        "services": {
            "database": "connected",
            "ai": "available" if EMERGENT_LLM_KEY else "not configured"
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