# Version History

Complete version history and release notes for EduThreat-CTI Dashboard.

## Version 2.3.0 (2026-03-17)

**Focus**: Cross-Dimensional Intelligence Visualizations — 10 New Charts

### Key Features
- 10 new cross-dimensional chart components leveraging the full enrichment schema
- Institution Risk Matrix, Recovery by Attack Type, Attack Vector by Institution, Breach Severity Timeline
- Ransom Payment by Year, Ransomware Family Trend, Actor Institution Matrix, Actor TTP Profile
- Disclosure Timeline Scatter, Data Breach by Institution Type
- Replaced 2 empty charts (OperationalImpactRadar, RecoveryEffectivenessChart) with data-backed alternatives
- All 4 analytics pages enriched: /attacks (+2), /ransomware (+2), /threat-actors (+2), /analytics (replace 2 + add 2)

### Breaking Changes
- Requires backend v2.5.0+ for 10 new `/api/analytics/*` endpoints

---

## Version 2.2.1 (2026-03-17)

**Focus**: Admin Raw Data Viewer for DB Inspection

### Key Features
- Raw Data Viewer added to admin panel with filter controls (incident ID, attack category, country, has MITRE, has enrichment JSON)
- Expandable rows with tabbed views: Key Fields, All Flat Columns, MITRE JSON, Enrichment JSON
- Copy-to-clipboard for sharing raw data during debugging

### Breaking Changes
- Requires backend v2.4.2+ for `/api/admin/raw-incidents` endpoint

---

## Version 2.2.0 (2026-03-15)

**Focus**: Analytics Dashboard Redesign — World-Class CTI Visualizations

### Key Features
- Complete redesign of all 4 analytics pages (Attack Intelligence, Ransomware Intel, Threat Actors, Impact Analytics)
- 17 new chart components using Recharts (AreaChart, BarChart, PieChart, RadarChart, ScatterChart) and custom CSS grids
- 20+ new TypeScript interfaces and API fetch functions for advanced analytics endpoints
- Attack Intelligence: stacked area trends, vector donut, MITRE ATT&CK heatmap, initial access, system impact
- Ransomware Intelligence: family timeline, exfiltration chart, ransom economics panel, recovery radar, geo grid
- Threat Actor Intelligence: category/motivation charts, activity timeline, actor-ransomware matrix, targeting, profile cards
- Impact Analytics: institution types, operational radar, financial stacked bars, data/regulatory/recovery/transparency metrics, user impact
- EmptyState component for graceful sparse data handling
- Updated sidebar navigation labels

### Breaking Changes
- Requires backend v2.4.0+ for new analytics endpoints

### Migration Notes
- 20+ new API endpoints consumed: `/api/analytics/attack-trends`, `/api/analytics/attack-vectors`, `/api/analytics/mitre-tactics`, etc.

---

## Version 2.1.0 (2026-03-15)

**Focus**: Real-Time Intelligence Pipeline, Re-Enrichment UI & Interactivity Fixes

### Key Features
- "Start Cron Job" button — one-click continuous intelligence collection with scheduler status display (jobs table, next/last run times, new incidents counter)
- Re-Enrich section — date picker to reset old enrichments for re-processing with updated extraction schema
- Dashboard stat cards now clickable — filter to specific incidents (ransomware, data breaches, enriched, by country)
- Incidents page reads URL query params to pre-fill filters (Suspense-wrapped for Next.js 14)
- Data Breaches filter checkbox added to incidents page
- Pipeline stop button now properly cancels running enrichment

### Breaking Changes
- Requires backend v2.3.0+ for scheduler and re-enrich endpoints

### Migration Notes
- New admin endpoints used: `/admin/scheduler/start`, `/admin/scheduler/stop`, `/admin/scheduler/status`, `/admin/re-enrich`
- Incidents page now supports `?data_breached=true` URL parameter

---

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
