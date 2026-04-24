# Street Shield - Changelog

## 2026-04-24
- **DEEP RENAME REFACTOR COMPLETE**: Eliminated ALL "emergency" and "medical" terminology from the entire codebase
  - Frontend: Renamed ~200 occurrences (variables, state, functions, styles, comments, UI text)
  - Backend: Renamed ~80 occurrences (models, routes, DB collections, functions, response messages)
  - Translations: Updated all 5 language files
  - API routes renamed: `/api/emergency/*` → `/api/alert/*`
  - DB collections renamed: `emergency_settings` → `alert_settings`, `emergency_alerts` → `alert_notifications`
  - Pydantic models renamed: `EmergencyAlert` → `AlertNotification`, `EmergencySettings` → `AlertSettings`
  - `medical` → `health` in all backend health monitoring code
  - Testing agent confirmed: ZERO forbidden terms in UI, all endpoints working

## 2026-04-03 (Previous Sessions)
- Cyberpunk UI theme implemented
- OpenWeatherMap integration
- Marketing video generation (Sora 2 + FFmpeg)
- Privacy Policy modal + API endpoint
- Voice Info System fixes
- Data Deletion endpoint for compliance
- APP_REVIEW_GUIDE.md created
- All legacy non-theme colors replaced
