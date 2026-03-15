# Version History

Complete version history and release notes for EduThreat-CTI Dashboard.

## Version 2.0.0 (2026-03-15)

**Focus**: Analyst-Focused Dashboard Redesign & Interactive World Map

### Key Features
- Interactive world heatmap with react-simple-maps (zoom, pan, tooltips, click-to-filter)
- Analyst-focused dashboard — education research metrics only, no pipeline status
- Two-tier stat cards: primary (4 cards) + secondary (5 cards), all clickable
- Enhanced StatCard with href, onClick, description props and new color variants
- Removed country normalization button from admin (handled in pipeline)
- react-simple-maps dependency added

### Breaking Changes
- Dashboard API must return new fields: `education_incidents`, `data_sources`, `avg_recovery_days`, `total_financial_impact`, `incidents_with_mitre`

### Migration Notes
- Backend API v2.2.0+ required for new dashboard stats fields
- `npm install` required to pull react-simple-maps dependency

---

## Version 1.1.0 (2026-01-08)

**Focus**: Country Normalization & CTI Reports

### Key Features
- Country normalization with full names and flag emojis
- CTI report downloads (Markdown format)
- Enhanced admin panel with normalize countries button
- Improved incident detail page for security researchers
- TypeScript type safety improvements

### Breaking Changes
None

### Migration Notes
- Country normalization: Use admin panel "Normalize Countries" button to update existing data
- Type definitions: Added `flag_emoji` to `CountryItem` type

---

## Version 1.0.0 (2025-12-15)

**Focus**: Initial Release

### Key Features
- Interactive dashboard with real-time statistics
- Incidents management with search and filtering
- Detailed incident views with enrichment data
- Analytics pages (attacks, ransomware, threat actors, map)
- Admin panel with database export and scheduler controls
- Responsive design with dark theme
- Full API integration with React Query

---

For detailed changelog, see [CHANGELOG.md](CHANGELOG.md).
