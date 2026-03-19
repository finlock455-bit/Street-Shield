# Street Shield - Changelog

## 2026-03-19 - SEO/ASO Discoverability & Bug Fix

### Added
- **`app/+html.tsx`**: Comprehensive web HTML shell with:
  - SEO title tag ("Street Shield - Personal Safety App | Emergency SOS, Live Location Sharing & Panic Button")
  - Meta description covering 50+ safety-related search intents
  - Keywords meta tag with comprehensive ASO terms
  - Open Graph tags (og:title, og:description, og:site_name, og:locale)
  - Twitter Card tags (summary_large_image)
  - Schema.org JSON-LD SoftwareApplication structured data
  - Schema.org FAQPage structured data for panic-intent searches
  - Geo targeting meta for UK
  - Apple/Android mobile web app meta tags
  - Theme color configuration

- **Updated `app.json`**: Rich ASO metadata including:
  - Descriptive app name: "Street Shield - Personal Safety & Emergency SOS"
  - 250+ word description covering all user scenarios
  - iOS info plist descriptions for permissions
  - Web-specific meta (name, shortName, description, themeColor)
  - Updated backgroundColor to #0a0a1a

- **`public/robots.txt`**: Search engine crawling directives
- **`public/sitemap.xml`**: Basic sitemap structure
- **`GET /api/app-info`**: Public API endpoint for app discovery info (8 features, 8 use cases, platform/language data)

### Fixed
- **Pre-existing "Element type is invalid" rendering error**: Fixed by reinstalling `@expo/vector-icons` and `ws` packages, resolving the undefined component crash that prevented the app from loading on web.

## Prior Work (Before this session)
- Emergency contact system with voice trigger
- Safety analysis with AI (Gemini) scoring
- Cycling safety mode
- Simulated health monitoring with (DEMO) label
- Haptic feedback for alerts
- i18n infrastructure (translations + language picker)
- Voice alerts with throttling and audio ducking
- Simulated offline emergency mode
- Test emergency button
- Root /health endpoint for Kubernetes
