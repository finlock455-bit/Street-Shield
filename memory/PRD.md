# Street Shield — Neural Safety Network (PRD)

## Original Problem Statement
> "i prefer the other interface but with google changes"

Reference design: cyberpunk dark mobile UI titled **STREET SHIELD — NEURAL SAFETY NETWORK** with a tagline "Your AI-Powered Guardian for Every Step", featuring a 2-column grid of tiles (Voice AI, Quick Alert, Radar, AI Audio, Activity, Cycling Mode, Voice Info) and an **Activate Shield** hero button. "Google changes" = Google Translate language switcher pill in the header.

## Architecture
- **Frontend**: React 19 + CRA + Tailwind, mobile-first responsive web app
- **Backend**: FastAPI + MongoDB (motor async), all routes under `/api`
- **Integration**: Google Translate Element widget (free, no API key) hooked to a custom `LanguagePill` component
- **Routing**: React Router with splash → home gate via sessionStorage

## User Personas
- **Solo commuter** who walks/cycles in unfamiliar areas and wants a one-tap guardian.
- **Cyclist** needing route-aware safety (Cycling Mode).
- **Multilingual user** who wants the UI in their native language.

## Core Requirements (static)
1. Cyberpunk dark visual aesthetic: black bg, neon cyan + neon pink, Orbitron display font.
2. Splash screen with brand identity, auto-advances to home.
3. Dashboard with 7 tiles, each leading to a functional sub-page.
4. Big **Activate Shield** toggle persisted to backend.
5. **Quick Alert**: SOS panic button + emergency contacts CRUD + alert log.
6. **Radar**: animated mobile-style radar disc (sweep + blips).
7. **Voice AI / AI Audio**: visual mic + audio scape selectors.
8. **Activity**: stats dashboard with weekly chart.
9. **Cycling Mode**: speed/distance/battery readouts.
10. **Voice Info**: tip cards read aloud via SpeechSynthesis.
11. **Language pill**: 12 languages translate the entire page via Google Translate widget.

## What's Been Implemented (✓ Jan 2026)
- ✅ Splash screen + auto-advance + tap-to-enter
- ✅ Home dashboard with header, language pill, Activate Shield button, 7 tiles
- ✅ Backend endpoints: shield state singleton, contacts CRUD, alerts, activity
- ✅ All 7 sub-pages with interactive UI
- ✅ Google Translate widget integration (free Element API)
- ✅ Sonner toast notifications
- ✅ Persisted state (Mongo) across reloads
- ✅ Mobile-first design verified
- ✅ Backend test suite — 14/14 passing (pytest at `/app/backend/tests/test_street_shield_api.py`)
- ✅ Frontend flows — all working, zero console errors

## API Surface (FastAPI)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /api/ | Health |
| GET | /api/shield/state | Read singleton state |
| POST | /api/shield/state | Patch state (partial) |
| GET | /api/contacts | List emergency contacts |
| POST | /api/contacts | Add contact |
| DELETE | /api/contacts/{id} | Remove contact |
| GET | /api/alerts | List alerts |
| POST | /api/alerts | Send SOS |
| GET | /api/activity | Synthetic activity stats |

## Prioritized Backlog
### P1 (Next iteration)
- **Real geolocation map** in Radar (Leaflet or Mapbox) instead of synthetic blips
- **SMS/Twilio integration** so SOS actually contacts emergency contacts
- **Audio playback** for AI Audio (Howler + ambient loops)
- **Real activity tracking** via browser MotionAPI/pedometer

### P2 (Later)
- AI threat assessment chatbot (Claude Sonnet) via Emergent LLM key
- Incident community feed
- Fall detection in Cycling Mode
- PWA install prompts + offline caching
- Auth (login + per-user contacts)

## Next Tasks
1. Show user current build for review
2. Hook Twilio for real SMS SOS dispatch
3. Add map background to Radar with reverse-geocoding

## Key Files
- `frontend/src/App.js` — router + splash gate
- `frontend/src/pages/Splash.jsx` — boot screen
- `frontend/src/pages/Home.jsx` — main dashboard
- `frontend/src/pages/{VoiceAI,QuickAlert,Radar,AIAudio,Activity,CyclingMode,VoiceInfo}.jsx`
- `frontend/src/components/{LanguagePill,Tile,PageHeader,ShieldLogo}.jsx`
- `frontend/src/hooks/useGoogleTranslate.js`
- `frontend/src/lib/api.js`
- `backend/server.py`
- `backend/tests/test_street_shield_api.py` (created by testing agent)
