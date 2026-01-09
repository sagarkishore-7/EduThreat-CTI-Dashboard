# Version History

Complete version history and release notes for EduThreat-CTI Dashboard.

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
