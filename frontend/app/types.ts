export interface LocationData {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  timestamp: string;
}

export interface SafetyScore {
  overall_score: number;
  risk_factors: string[];
  recommendations: string[];
  weather_risk: number;
  traffic_risk: number;
  location_risk: number;
  alerts: Array<{
    type: string;
    message: string;
    priority: string;
  }>;
}

export interface WeatherData {
  temperature: number;
  humidity: number;
  weather_condition: string;
  visibility?: number;
  wind_speed?: number;
  ice_risk: boolean;
  hazard_level: string;
}

export interface SafetyAnalysis {
  id: string;
  location: LocationData;
  weather: WeatherData;
  safety_score: SafetyScore;
  timestamp: string;
  ai_analysis: string;
}
