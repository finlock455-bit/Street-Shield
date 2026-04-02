# Street Shield - Product Requirements Document

## Problem Statement
Street Shield is a mobile safety awareness app for pedestrians, runners, and cyclists. It provides AI-powered spatial awareness, quick alerts to trusted contacts, activity insights, and real-time environmental awareness.

## User Personas
- Pedestrians walking alone at night
- Runners/joggers needing safety tracking
- Cyclists needing vehicle proximity alerts
- Students on campus
- Families tracking loved ones
- Lone workers
- Travellers in unfamiliar areas

## Core Requirements
1. Trusted contact system with voice-triggered quick alerts
2. Electric scooter & silent vehicle detection
3. Activity insights (rhythm, energy, alertness)
4. Voice-activated information ("Street Shield" trigger)
5. Cycling-specific safety features
6. Haptic feedback for alerts
7. Multi-language support (EN, ES, FR, DE, ZH)
8. Offline safety mode
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
- `POST /api/emergency/trigger` - Alert event (internal name kept)
- `GET/POST /api/emergency/settings` - Alert config (internal name kept)
- `POST /api/cycling/threats` - Cycling safety
- `POST /api/health/biometric-analysis` - Activity insights (internal name kept)
- `POST /api/journey/complete` - Save completed journey
- `GET /api/journey/report/{share_token}` - Get shareable journey
- `GET /api/app-info` - Public SEO/discovery info
- `GET /api/health` - Health check

## What's Implemented
- Full safety analysis core with AI scoring
- Trusted contact system with trigger word (rebranded from "Emergency")
- Cycling safety mode
- Activity insights (rebranded from "Health Monitoring")
- Haptic feedback for alerts
- i18n infrastructure (translations + language picker)
- SEO/ASO optimization (meta tags, Schema.org, Open Graph, Twitter Cards, FAQ schema)
- Voice alerts with throttling
- Offline safety simulation
- "I Got Home Safe" shareable journey card

## Store Compliance Rebrand (2026-04-02) — Option B: Minimal Rebrand
### What Changed (user-facing labels only):
- "Emergency" → "Quick Alert" / "Safety Alert"
- "Emergency SOS" → removed from app name & metadata
- "Emergency Contacts" → "Trusted Contacts"
- "Health Monitoring" → "Activity Insights"
- "Blood Oxygen / O₂" → "Energy"
- "Stress" → "Alertness"
- "Medical emergency" messages → "Safety concern" messages
- All medical terminology removed from backend responses
- All "call authorities/911/112" references removed
- Disclaimers added: "Safety awareness tool for informational purposes only"
- Updated across all 5 languages (EN, ES, FR, DE, ZH)

### What Stayed (internal code):
- All API route names unchanged (/api/emergency/*, /api/health/*)
- All variable/function names unchanged
- All MongoDB collection names unchanged
- All Pydantic model names unchanged

### Files Modified:
- `app.json` - App name, description, iOS permissions
- `app/+html.tsx` - SEO meta, FAQ schema
- `translations/index.ts` - All 5 language translations
- `app/index.tsx` - ~40+ UI label changes, voice messages, disclaimers
- `backend/server.py` - /api/app-info, biometric alert messages, disclaimer

## Deployment Fixes (2026-03-23)
- Fixed .gitignore blocking .env files
- Removed package-lock.json (mixed package manager conflict)
- Removed unused @elevenlabs/react-native (unmet peer deps)

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
