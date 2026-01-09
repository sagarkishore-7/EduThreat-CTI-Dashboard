# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-01-08

### Country Normalization & CTI Reports

This release adds comprehensive country normalization, CTI report downloads, and improved admin panel functionality.

#### Added
- **Country Normalization**: Full country names with flag emojis throughout the dashboard
  - Map view shows full country names instead of codes
  - Country filters use normalized names (merges "US" and "United States")
  - Flag emojis for all countries instead of globe icons
  - ISO country codes stored for CTI report generation
- **CTI Report Download**: Downloadable comprehensive CTI reports for each incident
  - Markdown format following security frameworks (MITRE ATT&CK, NIST CSF, ISO/IEC 27001)
  - Executive summary, incident overview, threat actor analysis
  - Impact assessment, timeline, IOCs, recovery & response
  - Regulatory & compliance information
  - Download button on incident detail page
- **Admin Panel Enhancements**: New admin functionality
  - Normalize Countries button to update existing data
  - Enhanced CSV export with clear sections (enriched vs full)
  - Improved error handling and user feedback
- **Incident Detail Page Improvements**: Enhanced for security researcher/analyst perspective
  - Better layout and information hierarchy
  - Clear CTI field presentation
  - Download report button prominently displayed

#### Changed
- **Country Display**: All country references use full names with flags
- **Filter Options**: Country filters normalized to prevent duplicates
- **Analytics**: Country analytics include country codes and flag emojis
- **Type Safety**: Added `flag_emoji` to `CountryItem` type definition

#### Fixed
- **Build Errors**: Fixed JSX parsing errors in incident detail page
- **TypeScript Errors**: Fixed `flag_emoji` property type errors
- **Country Ambiguity**: Resolved duplicate country entries in filters

---

## [1.0.0] - 2025-12-15

### Initial Release

This is the first official release of the EduThreat-CTI Dashboard, a modern web interface for visualizing and analyzing cyber incidents targeting educational institutions.

#### Added
- **Interactive Dashboard**: Real-time statistics and visualizations
  - Total incidents, ransomware attacks, data breaches
  - Countries affected, time series charts
  - Attack distribution, geographic analysis
- **Incidents Management**: Comprehensive incident browsing
  - Searchable list with full-text search
  - Advanced filtering (country, attack type, ransomware, threat actor, year)
  - Sortable columns, pagination
  - Detailed incident views with all enrichment data
- **Analytics Pages**: Specialized analysis views
  - Attack analysis page
  - Ransomware tracking page
  - Threat actors page
  - Geographic map view
- **Admin Panel**: Administrative controls
  - Admin login with token authentication
  - Database export (full DB and CSV)
  - Scheduler controls (trigger RSS, weekly, enrichment jobs)
  - Fix incident dates functionality
  - Database migration tools
- **Responsive Design**: Mobile-friendly interface
  - Dark theme optimized for CTI visualization
  - Modern UI with Tailwind CSS
  - Smooth animations and transitions
- **API Integration**: Full integration with EduThreat-CTI API
  - Real-time data fetching with React Query
  - Optimistic updates and caching
  - Error handling and retry logic

#### Technical Details
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 3
- **Charts**: Recharts for data visualization
- **Icons**: Lucide React
- **State Management**: TanStack Query (React Query)

---

## Contributing

See [CONTRIBUTING.md](../EduThreat-CTI/CONTRIBUTING.md) in the main project for contribution guidelines.

## License

MIT License - see [LICENSE](LICENSE) file.
