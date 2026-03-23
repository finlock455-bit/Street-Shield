# Street Shield - Product Requirements Document

## Problem Statement
Street Shield is a mobile safety app for pedestrians, runners, and cyclists. It provides AI-powered spatial awareness, emergency support, health monitoring, and real-time threat detection.

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
10. SEO/ASO discoverability
11. "I Got Home Safe" shareable journey reports

## Architecture
- **Frontend**: Expo (React Native) with expo-router, running on web (port 3000)
- **Backend**: FastAPI (Python) on port 8001
- **Database**: MongoDB
- **AI**: Google Gemini via Emergent LLM Key

## Key API Endpoints
- `POST /api/safety/analyze` - Main safety analysis
- `POST /api/emergency/trigger` - Emergency event
- `GET/POST /api/emergency/settings` - Emergency config
- `POST /api/cycling/threats` - Cycling safety
- `POST /api/health/biometric-analysis` - Health monitoring
- `POST /api/journey/complete` - Save completed journey
- `GET /api/journey/report/{share_token}` - Get shareable journey
- `GET /api/app-info` - Public SEO/discovery info
- `GET /api/health` - Health check

## What's Implemented
- Full safety analysis core with AI scoring
- Emergency contact system with trigger word
- Cycling safety mode
- Simulated health monitoring
- Haptic feedback for alerts
- i18n infrastructure (translations + language picker)
- SEO/ASO optimization (meta tags, Schema.org, Open Graph, Twitter Cards, FAQ schema)
- Voice alerts with throttling
- Offline emergency simulation
- **"I Got Home Safe" shareable journey card** with:
  - Journey tracking (route points, stats collection)
  - SVG route map visualization
  - Light/dark theme toggle
  - Share functionality (Web Share API + React Native Share)
  - Safety score grade display
  - Stats grid (distance, duration, steps, heart rate)
  - Social hashtags (#IGotHomeSafe #StreetShield)
  - Backend persistence via MongoDB

## What's Simulated/Mocked
- Voice recognition (button-based, needs native build)
- Health data (demo data, needs native build sensors)
- Radar visualization (minimal feedback)
- Push notifications (Expo Go limitation)
- Offline satellite emergency
- Weather data (no OpenWeatherMap API key)

## Pending/Backlog
- P1: Complete UI translation (i18n.t() for all strings)
- P1: Radar visual feedback animation
- P2: Voice cloning (ElevenLabs - needs API key)
- P2: OpenWeatherMap integration (needs API key)
- P2: Native development builds for real sensors
- P3: Refactor index.tsx (4000+ lines god component)

## 3rd Party Integrations
- **Google Gemini**: Active via Emergent LLM Key
- **OpenWeatherMap**: Pending user API key
- **ElevenLabs**: Planned for voice cloning (removed from deps until ready)

## Deployment Notes (2026-03-23)
- Fixed .gitignore blocking .env files (lines 82-104 removed)
- Removed package-lock.json (mixed package manager conflict with yarn.lock)
- Removed unused @elevenlabs/react-native (unmet peer deps)
- Deployment agent verified: 100% ready for Kubernetes deployment
