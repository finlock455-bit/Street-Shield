# Street Shield - Product Requirements Document

## Problem Statement
Street Shield is a mobile safety app for pedestrians, runners, and cyclists. It provides AI-powered spatial awareness, emergency support, health monitoring, and real-time threat detection. The app targets anyone who wants to stay safe walking alone, running, cycling, or travelling.

## User Personas
- Pedestrians walking alone at night
- Runners/joggers needing safety tracking
- Cyclists needing vehicle proximity alerts
- Students on campus
- Families tracking loved ones
- Lone workers
- Travellers in unfamiliar areas

## Core Requirements
1. Emergency contact system with voice-triggered SOS
2. Electric scooter & silent vehicle detection
3. Health monitoring (heart rate, stress, blood oxygen)
4. Voice-activated information ("Street Shield" trigger)
5. Cycling-specific safety features
6. Haptic feedback for alerts
7. Multi-language support (EN, ES, FR, DE, ZH)
8. Offline/satellite emergency mode
9. Custom AI voice selection
10. SEO/ASO discoverability for app store and web search

## Architecture
- **Frontend**: Expo (React Native) with expo-router, running on web (port 3000)
- **Backend**: FastAPI (Python) on port 8001
- **Database**: MongoDB
- **AI**: Google Gemini via Emergent LLM Key
- **Deployment**: Kubernetes with Emergent Platform

## Key API Endpoints
- `POST /api/safety/analyze` - Main safety analysis
- `POST /api/emergency/trigger` - Emergency event
- `GET/POST /api/emergency/settings` - Emergency config
- `POST /api/cycling/threats` - Cycling safety
- `POST /api/health/biometric-analysis` - Health monitoring
- `GET /api/app-info` - Public SEO/discovery info
- `GET /api/health` - Health check

## What's Implemented
- Full safety analysis core with AI scoring
- Emergency contact system with trigger word
- Cycling safety mode
- Simulated health monitoring
- Haptic feedback for alerts
- i18n infrastructure (translations + language picker)
- SEO/ASO optimization (meta tags, Schema.org, Open Graph, Twitter Cards)
- Voice alerts with throttling
- Offline emergency simulation

## What's Simulated/Mocked
- Voice recognition (button-based, needs native build)
- Health data (demo data, needs native build sensors)
- Radar visualization (minimal feedback)
- Push notifications (Expo Go limitation)
- Offline satellite emergency
- Weather data (no OpenWeatherMap API key)

## Pending/Backlog
- P1: Complete UI translation (i18n.t() for all strings)
- P1: Radar visual feedback
- P2: Voice cloning (ElevenLabs - needs API key)
- P2: OpenWeatherMap integration (needs API key)
- P2: Native development builds for real sensors
- P3: Refactor index.tsx (4000+ lines god component)

## 3rd Party Integrations
- **Google Gemini**: Active via Emergent LLM Key
- **OpenWeatherMap**: Pending user API key
- **ElevenLabs**: Planned for voice cloning

## SEO/ASO Keywords
personal safety app, emergency SOS, panic button, live location sharing, walking safety, running safety, cycling safety, student safety, family tracker, UK safety app, headphone safety, e-scooter warning, silent alarm, lone worker safety, travel safety
