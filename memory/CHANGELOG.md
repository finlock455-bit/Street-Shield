# Street Shield - Changelog

## 2026-04-24 (Session 2)
- **MODULAR REFACTOR COMPLETE**: Decomposed index.tsx from 4794 → 3267 lines (32% reduction)
  - Extracted: `styles.ts` (1285 lines), `types.ts`, `constants.ts`
  - New components: `Header.tsx`, `SafetyScoreRing.tsx`, `Footer.tsx`, `PrivacyPolicyModal.tsx`, `LanguagePickerModal.tsx`
  - Testing agent confirmed: ZERO regressions, all UI/API functionality preserved

## 2026-04-24 (Session 1)
- **DEEP RENAME REFACTOR**: Eliminated ALL "emergency" and "medical" terms from entire codebase
  - Frontend: ~200 occurrences (variables, functions, styles, UI text)
  - Backend: ~80 occurrences (models, routes, DB collections, responses)
  - API routes: `/api/emergency/*` → `/api/alert/*`
  - DB collections: `emergency_settings` → `alert_settings`, `emergency_alerts` → `alert_notifications`
  - Pydantic models: `EmergencyAlert` → `AlertNotification`, `EmergencySettings` → `AlertSettings`

## 2026-04-03 (Previous Sessions)
- Cyberpunk UI theme, OpenWeatherMap, Marketing videos (Sora 2 + FFmpeg)
- Privacy Policy modal + API, Voice Info System fixes
- Data Deletion endpoint, APP_REVIEW_GUIDE.md, Store listing guide
