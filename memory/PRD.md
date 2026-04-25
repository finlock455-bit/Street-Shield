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
- ✅ Backend test suite — 14/14 passing

### ✓ Iteration 2 — Find My Shield (Jan 2026)
- ✅ ShareSession model + 4 endpoints (`/share/start`, `/ping`, GET, `/stop`)
- ✅ SOS in QuickAlert opens **ShareModal** with copy / Email / WhatsApp / per-contact SMS buttons
- ✅ Sender name persists to localStorage (`ss_sender_name`)
- ✅ Live geolocation via `navigator.geolocation.watchPosition` → ping every ~15s
- ✅ Public `/share/:token` page with dark-themed Leaflet map (OpenStreetMap, no key)
  - Cyan pulsing marker, sender name, last-ping time, LIVE/ENDED badges
  - Auto-refreshes every 5s, follows location updates
- ✅ Stop Sharing → server marks session inactive (410 on subsequent pings)
- ✅ 24/24 backend tests pass + 11/11 frontend flows verified

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
| POST | /api/share/start | Create live-share session (returns token) |
| POST | /api/share/{token}/ping | Update last location |
| GET | /api/share/{token} | Read session (public) |
| POST | /api/share/{token}/stop | End session |

## Prioritized Backlog
### P1 (Next iteration)
- **Twilio SMS** so the SOS message goes out automatically (vs. user needing to tap each contact)
- **Real audio playback** for AI Audio (Howler.js + free ambient loops)
- **Real activity tracking** via DeviceMotion/pedometer
- **Higher-entropy share tokens** (`secrets.token_urlsafe(16)`) + TTL cleanup of stopped sessions

### P2 (Later)
- AI threat assessment chatbot (Claude Sonnet) via Emergent LLM key
- Incident community feed
- Fall detection in Cycling Mode
- PWA install prompts + offline caching
- Auth (login + per-user contacts)

## Next Tasks
1. Show user the new Find My Shield flow for review
2. (Optional) Add Twilio when user has credentials
3. Replace synthetic radar blips with real Bluetooth/WiFi proximity scan

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
