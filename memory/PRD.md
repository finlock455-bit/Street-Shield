# Street Shield - Product Requirements Document

## Problem Statement
Street Shield is a mobile safety awareness app for pedestrians, runners, and cyclists. It provides AI-powered spatial awareness, quick alerts to trusted contacts, activity insights, and real-time environmental awareness.

## Architecture
- **Frontend**: Expo (React Native) with expo-router, web on port 3000
- **Backend**: FastAPI (Python) on port 8001
- **Database**: MongoDB
- **AI**: Google Gemini via Emergent LLM Key
- **Theme**: Cyberpunk (dark #0a0a0f, cyan #00ffff, neon pink #ff0066)

## What's Implemented
- Full safety analysis core with AI scoring
- Animated safety score ring (pulse, rotate, glow)
- Animated Radar Pulse (3 concentric rings)
- Trusted contact system with voice trigger word
- Cycling safety mode
- Activity insights (rhythm, energy, alertness)
- Haptic feedback for alerts
- i18n (EN, ES, FR, DE, ZH)
- SEO/ASO optimization
- Voice alerts with throttling
- Offline safety simulation
- "I Got Home Safe" shareable journey card
- **DEEP RENAME COMPLETE** — All "emergency/medical" terms removed from entire codebase (variables, API routes, DB collections, UI, translations, comments)
- Cyberpunk UI theme
- Complete store listing guide
- OpenWeatherMap integration
- Privacy Policy (in-app modal + backend API)
- Voice Info System with visual response cards
- Marketing Video Assets (Sora 2)
- Data Deletion endpoint for compliance

## Key Files
- `/app/frontend/app/index.tsx` - Main app component
- `/app/frontend/app/+html.tsx` - SEO meta tags
- `/app/frontend/app.json` - Expo/store metadata
- `/app/frontend/translations/index.ts` - i18n (5 languages)
- `/app/backend/server.py` - FastAPI backend
- `/app/STORE_LISTING.md` - Play Store + App Store listing content
- `/app/APP_REVIEW_GUIDE.md` - Play Store submission guide

## Key API Endpoints (Post-Rename)
- `GET /api/health` - Health check
- `GET /api/app-info` - App metadata
- `GET /api/privacy-policy` - Privacy policy JSON
- `GET /api/privacy` - Public privacy policy HTML
- `POST /api/safety/analyze` - AI safety analysis
- `POST /api/health/biometric-analysis` - Activity insights
- `POST /api/cycling/safety-score` - Cycling safety score
- `POST /api/alert/settings` - Save alert settings (was /emergency/settings)
- `GET /api/alert/settings/{user_id}` - Get alert settings
- `POST /api/alert/trigger` - Trigger alert (was /emergency/trigger)
- `POST /api/alert/resolve/{event_id}` - Resolve alert
- `GET /api/alert/history/{user_id}` - Alert history
- `POST /api/journey/complete` - Complete journey data
- `DELETE /api/user/data` - Data deletion (compliance)

## Store Submission Status
- [x] Play Store description (ASO-optimized)
- [x] Apple App Store description + keywords
- [x] Compliance checklist — ZERO "emergency/medical" terms
- [x] Category: Lifestyle > Personal Safety
- [x] Privacy policy (in-app + API)
- [x] Deep rename complete (variables, routes, DB, UI, translations)
- [ ] Screenshots (need native builds)

## Pending/Backlog
- P0: Refactor index.tsx (~4800 lines → components/hooks/styles)
- P1: Complete i18n (remaining hardcoded strings → i18n.t())
- P1: ElevenLabs voice cloning — needs user API key
- P2: Native builds for real sensors
