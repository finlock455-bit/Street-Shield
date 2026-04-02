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

## Architecture
- **Frontend**: Expo (React Native) with expo-router, web on port 3000
- **Backend**: FastAPI (Python) on port 8001
- **Database**: MongoDB
- **AI**: Google Gemini via Emergent LLM Key
- **Theme**: Cyberpunk (dark #0a0a0f, cyan #00ffff, neon pink #ff0066)

## What's Implemented
- Full safety analysis core with AI scoring
- Trusted contact system with voice trigger word
- Cycling safety mode
- Activity insights (rhythm, energy, alertness)
- Haptic feedback for alerts
- i18n (EN, ES, FR, DE, ZH)
- SEO/ASO optimization
- Voice alerts with throttling
- Offline safety simulation
- "I Got Home Safe" shareable journey card
- **Store compliance rebrand** (no medical/emergency terms)
- **Cyberpunk UI theme** (dark, neon cyan/pink, sharp edges, uppercase)

## Deployment Status
- .gitignore fixed (no longer blocks .env files)
- package-lock.json removed
- @elevenlabs/react-native removed (unused)
- Deployment agent verified: ready for Kubernetes

## Pending/Backlog
- P1: Complete i18n (i18n.t() for remaining hardcoded strings)
- P1: Radar visual feedback animation
- P2: Voice cloning (ElevenLabs)
- P2: OpenWeatherMap integration
- P2: Native builds for real sensors
- P3: Refactor index.tsx (4400+ lines)

## 3rd Party Integrations
- **Google Gemini**: Active via Emergent LLM Key
- **OpenWeatherMap**: Pending user API key
- **ElevenLabs**: Planned (removed from deps until ready)
