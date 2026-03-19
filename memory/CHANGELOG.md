# Street Shield - Changelog

## 2026-03-19 - Session 2: Journey Share Card + SEO

### Added - "I Got Home Safe" Shareable Journey Card
- **`components/JourneyShareCard.tsx`**: New component with:
  - Beautiful card layout with "I GOT HOME SAFE" ribbon
  - SVG route map rendered from GPS coordinate points
  - Safety score grade display (A+/B/C/D with color coding)
  - Stats grid: Distance, Duration, Steps, Avg Heart Rate
  - Light/dark theme toggle
  - Share button using Web Share API / React Native Share
  - Street Shield branding footer with date/time
  - Social hashtags (#IGotHomeSafe #StreetShield)

- **Journey tracking integration in `index.tsx`**:
  - Uses refs (not state) for callback-safe journey data collection
  - Collects route points, safety scores, heart rates during tracking
  - Calculates distance via Haversine formula
  - Auto-opens share card when shield is stopped
  - "I Got Home Safe" button in feature grid after journey completion

- **Backend `POST /api/journey/complete`**: Saves journey with share_token
- **Backend `GET /api/journey/report/{share_token}`**: Retrieves shareable report
- **`react-native-svg`**: Installed for SVG route map rendering

### Added - SEO/ASO Discoverability
- **`app/+html.tsx`**: Comprehensive web HTML shell with:
  - SEO title, meta description, keywords (50+ safety search terms)
  - Open Graph tags, Twitter Card tags
  - Schema.org JSON-LD (SoftwareApplication + FAQPage)
  - Geo targeting, mobile web app meta, theme color
- **Updated `app.json`**: Rich ASO description and metadata
- **`public/robots.txt`** and **`public/sitemap.xml`**
- **`GET /api/app-info`**: Public discovery endpoint

### Fixed
- Pre-existing "Element type is invalid" crash (reinstalled @expo/vector-icons + ws)
- Permission screen blocking web users (auto-bypass on Platform.OS === 'web')
- "SafeWalk" branding → "Street Shield" on permission screen
- React closure trap: Changed `journeyActive` from useState to useRef for callback safety
- Made voice alert on tracking start non-blocking to prevent UI freeze
- Suppressed "Unexpected text node" console error

## 2026-03-19 - Session 1: Initial Features
- Emergency contact system, cycling mode, safety analysis core
- Haptic feedback, throttled voice alerts, audio ducking
- i18n infrastructure (translations + language picker)
- Simulated offline emergency mode
- Root /health endpoint for Kubernetes
