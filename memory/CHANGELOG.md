# Street Shield - Changelog

## [2026-04-02] - P0/P1 UI Polish & Features

### Fixed
- Removed all lingering non-theme colors (#2196F3, #4CAF50, #9C27B0, #E3F2FD, #333)
- Replaced old colors in Hands-Free indicator, pulsing dots, mic icons
- Fixed voiceHelpButton styling to match Cyberpunk theme
- Removed duplicate old style blocks (statusCard, listeningCard, pulsingDot, etc.)
- Fixed close icon color in Emergency Setup modal (#333 -> #00ffff)

### Added
- **Animated Radar Pulse**: 3 concentric ring animation using Animated API when shield is active
- **Privacy Policy Modal**: Full 9-section privacy policy accessible from footer
- **Privacy Policy API**: `GET /api/privacy-policy` returns structured JSON for store compliance
- **App Footer**: Privacy Policy link, version number, disclaimer text

### Previous Session Work
- Store compliance rebrand (Quick Alert, Activity Insights)
- Cyberpunk UI theme (dark, neon cyan/pink)
- Animated Safety Score Ring
- Store Listing Guide
- Deployment fixes
