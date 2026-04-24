# Street Shield - Product Requirements Document

## Problem Statement
Street Shield is a mobile safety awareness app for pedestrians, runners, and cyclists. It provides AI-powered spatial awareness, quick alerts to trusted contacts, activity insights, and real-time environmental awareness.

## Architecture
- **Frontend**: Expo (React Native) with expo-router, web on port 3000
- **Backend**: FastAPI (Python) on port 8001
- **Database**: MongoDB
- **AI**: Google Gemini via Emergent LLM Key
- **Theme**: Cyberpunk (dark #0a0a0f, cyan #00ffff, neon pink #ff0066)

## File Structure (Post-Refactor)
```
/app/frontend/app/
├── index.tsx              (3267 lines — orchestrator + logic)
├── types.ts               (interfaces: LocationData, SafetyAnalysis, etc.)
├── constants.ts           (BACKEND_URL, ALERT_COOLDOWNS, notification handler)
├── styles.ts              (1285 lines — full StyleSheet)
├── components/
│   ├── Header.tsx          (title bar + language button)
│   ├── SafetyScoreRing.tsx (animated score display)
│   ├── Footer.tsx          (disclaimer + privacy link)
│   ├── PrivacyPolicyModal.tsx (9-section privacy policy)
│   └── LanguagePickerModal.tsx (5 languages)
├── hooks/                  (future extraction target)
```

## What's Implemented
- Full safety analysis core with AI scoring
- Animated safety score ring + Radar Pulse
- Trusted contact system with voice trigger
- Cycling safety mode
- Activity insights, Haptic feedback, i18n (5 languages)
- Voice alerts, Offline safety simulation
- "I Got Home Safe" shareable journey card
- **DEEP RENAME** — zero "emergency/medical" terms in codebase
- **MODULAR REFACTOR** — index.tsx reduced from 4794→3267 lines (32%)
- Cyberpunk UI theme, OpenWeatherMap integration
- Privacy Policy, Data Deletion endpoint, Marketing Videos

## Key API Endpoints (Renamed)
- `GET /api/health` - Health check
- `POST /api/safety/analyze` - AI safety analysis
- `POST /api/alert/settings` - Save alert settings
- `GET /api/alert/settings/{user_id}` - Get alert settings
- `POST /api/alert/trigger` - Trigger alert
- `POST /api/alert/resolve/{event_id}` - Resolve alert
- `GET /api/alert/history/{user_id}` - Alert history
- `POST /api/health/biometric-analysis` - Activity insights
- `POST /api/cycling/safety-score` - Cycling safety
- `GET /api/privacy-policy` - Privacy policy JSON
- `GET /api/privacy` - Privacy policy HTML
- `DELETE /api/user/data` - Data deletion

## Pending/Backlog
- P0: Extract hooks from index.tsx (Phase 2 refactor — alertSystem, voiceSystem, cycling, biometrics)
- P1: Complete i18n (remaining hardcoded strings)
- P1: ElevenLabs voice cloning — needs user API key
- P2: Native builds for real sensors
