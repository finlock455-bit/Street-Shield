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
- **Animated safety score ring** (pulse, rotate, glow via Animated API)
- Trusted contact system with voice trigger word
- Cycling safety mode
- Activity insights (rhythm, energy, alertness)
- Haptic feedback for alerts
- i18n (EN, ES, FR, DE, ZH)
- SEO/ASO optimization (meta tags, Schema.org, Open Graph, FAQ schema)
- Voice alerts with throttling
- Offline safety simulation
- "I Got Home Safe" shareable journey card
- **Store compliance rebrand** (no medical/emergency terms)
- **Cyberpunk UI theme** (dark, neon cyan/pink, sharp edges, uppercase)
- **Complete store listing guide** (/app/STORE_LISTING.md)

## Key Files
- `/app/frontend/app/index.tsx` - Main app component
- `/app/frontend/app/+html.tsx` - SEO meta tags
- `/app/frontend/app.json` - Expo/store metadata
- `/app/frontend/translations/index.ts` - i18n (5 languages)
- `/app/backend/server.py` - FastAPI backend
- `/app/STORE_LISTING.md` - Play Store + App Store listing content

## Store Submission Status
- [x] Google Play description (4000 chars, ASO-optimized)
- [x] Apple App Store description + keywords
- [x] Screenshot descriptions
- [x] Review notes for app reviewers
- [x] Compliance checklist (no medical/emergency claims)
- [x] Category: Lifestyle > Personal Safety
- [ ] Privacy policy page (needs hosting)
- [ ] Screenshots (need native builds)

## Pending/Backlog
- P1: Complete i18n (i18n.t() for remaining hardcoded strings)
- P1: Radar visual feedback animation
- P2: Voice cloning (ElevenLabs)
- P2: OpenWeatherMap integration
- P2: Native builds for real sensors
- P3: Refactor index.tsx (4400+ lines)
