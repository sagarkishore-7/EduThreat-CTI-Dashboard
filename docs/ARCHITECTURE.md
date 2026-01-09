# Dashboard Architecture

**Version**: 1.1.0  
**Last Updated**: 2026-01-08

## Overview

The EduThreat-CTI Dashboard is a modern, responsive web application built with Next.js 14, TypeScript, and Tailwind CSS. It provides real-time visualization and analysis of cyber threat intelligence data for the education sector.

## Technology Stack

### Frontend Framework
- **Next.js 14**: React framework with App Router
- **TypeScript 5**: Type-safe JavaScript
- **React 18**: UI library

### Styling
- **Tailwind CSS 3**: Utility-first CSS framework
- **Dark Theme**: Optimized for CTI visualization

### Data Visualization
- **Recharts**: Chart library for React
- **Custom Components**: Stat cards, charts, maps

### State Management
- **TanStack Query (React Query)**: Server state management
- **Optimistic Updates**: Instant UI feedback
- **Caching**: Automatic data caching and refetching

### Icons & UI
- **Lucide React**: Icon library
- **Custom Components**: Reusable UI components

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Application                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  App Router (app/)                                   │   │
│  │  - page.tsx (Dashboard)                              │   │
│  │  - incidents/ (List & Detail)                        │   │
│  │  - analytics/ (Analytics Dashboard)                  │   │
│  │  - attacks/ (Attack Analysis)                        │   │
│  │  - ransomware/ (Ransomware Tracking)                 │   │
│  │  - threat-actors/ (Threat Actor Profiles)            │   │
│  │  - map/ (Geographic View)                            │   │
│  │  - admin/ (Admin Panel)                              │   │
│  └──────────────────────────────────────────────────────┘   │
│                             │                                │
│                             ▼                                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Components (components/)                             │   │
│  │  - Header, Sidebar, StatCard                          │   │
│  │  - Charts (AttackTypeChart, CountryChart, etc.)      │   │
│  │  - RecentIncidentsList                                │   │
│  └──────────────────────────────────────────────────────┘   │
│                             │                                │
│                             ▼                                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  API Client (lib/api.ts)                              │   │
│  │  - React Query hooks                                 │   │
│  │  - API request functions                              │   │
│  │  - Error handling                                     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              EduThreat-CTI REST API                          │
│         https://eduthreat-cti-production.up.railway.app     │
└─────────────────────────────────────────────────────────────┘
```

## Project Structure

```
EduThreat-CTI-Dashboard/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Dashboard home
│   ├── providers.tsx             # React Query provider
│   ├── globals.css              # Global styles
│   │
│   ├── incidents/                # Incidents pages
│   │   ├── page.tsx             # Incident list
│   │   └── [id]/page.tsx       # Incident detail
│   │
│   ├── analytics/                # Analytics dashboard
│   │   └── page.tsx
│   │
│   ├── attacks/                 # Attack analysis
│   │   └── page.tsx
│   │
│   ├── ransomware/               # Ransomware tracking
│   │   └── page.tsx
│   │
│   ├── threat-actors/            # Threat actor profiles
│   │   └── page.tsx
│   │
│   ├── map/                      # Geographic view
│   │   └── page.tsx
│   │
│   └── admin/                    # Admin panel
│       └── page.tsx
│
├── components/                    # React components
│   ├── Header.tsx                # Top header
│   ├── Sidebar.tsx               # Navigation sidebar
│   ├── StatCard.tsx              # Statistics card
│   ├── RecentIncidentsList.tsx   # Recent incidents feed
│   ├── LayoutWrapper.tsx         # Layout wrapper
│   │
│   └── charts/                   # Chart components
│       ├── AttackTypeChart.tsx
│       ├── CountryChart.tsx
│       ├── IncidentTimeChart.tsx
│       └── RansomwareChart.tsx
│
├── lib/                          # Utilities
│   ├── api.ts                    # API client & React Query hooks
│   └── utils.ts                  # Helper functions
│
├── public/                       # Static assets
│
├── docs/                         # Documentation
│   └── ARCHITECTURE.md           # This file
│
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript config
├── tailwind.config.js            # Tailwind config
├── next.config.mjs               # Next.js config
└── README.md                     # Main documentation
```

## Key Features

### 1. Real-Time Dashboard

- **Statistics Cards**: Total incidents, ransomware attacks, data breaches, countries affected
- **Time Series Charts**: Incident trends over time
- **Attack Distribution**: Horizontal bar charts
- **Geographic Analysis**: Pie charts and country breakdown
- **Ransomware Tracking**: Progress bars showing family activity
- **Recent Activity Feed**: Live feed of latest incidents

### 2. Incident Management

- **Searchable List**: Full-text search across incidents
- **Advanced Filtering**: Country, attack type, ransomware, threat actor, year
- **Sortable Columns**: Sort by date, name, country
- **Pagination**: Efficient browsing of large datasets
- **Detail Views**: Comprehensive incident details with all enrichment data

### 3. Analytics Pages

- **Attack Analysis**: Breakdown by attack category and vector
- **Ransomware Tracking**: Family-specific statistics and trends
- **Threat Actors**: Actor profiles with activity summaries
- **Geographic View**: Regional incident distribution with full country names and flags

### 4. Admin Panel

- **Database Management**: Export full database or CSV files
- **Scheduler Controls**: Trigger RSS, weekly, and enrichment jobs
- **Data Maintenance**: Normalize countries, fix incident dates
- **CSV Export**: Separate exports for enriched and full datasets

### 5. CTI Reports

- **Download Reports**: Comprehensive Markdown reports for each incident
- **Security Frameworks**: Aligned with MITRE ATT&CK, NIST CSF, ISO/IEC 27001
- **Researcher-Friendly**: Formatted for security researchers and analysts

## Data Flow

### 1. Initial Load

```
User visits page
    │
    ▼
React Query fetches data from API
    │
    ▼
Data cached and displayed
    │
    ▼
Background refetch for updates
```

### 2. Filtering & Search

```
User applies filters
    │
    ▼
React Query updates query key
    │
    ▼
New API request with filters
    │
    ▼
Results cached and displayed
```

### 3. Incident Detail

```
User clicks incident
    │
    ▼
Navigate to /incidents/[id]
    │
    ▼
Fetch incident details from API
    │
    ▼
Display full incident data
    │
    ▼
Download CTI report (optional)
```

## API Integration

### React Query Hooks

```typescript
// Dashboard data
const { data, isLoading } = useQuery({
  queryKey: ['dashboard'],
  queryFn: () => fetchDashboard()
});

// Incidents list
const { data, isLoading } = useQuery({
  queryKey: ['incidents', filters],
  queryFn: () => fetchIncidents(filters)
});

// Incident detail
const { data, isLoading } = useQuery({
  queryKey: ['incident', id],
  queryFn: () => fetchIncident(id)
});
```

### Error Handling

- Automatic retry on failure
- Error boundaries for graceful degradation
- Loading states for better UX

## Styling System

### Color Palette (Dark Theme)

- **Background**: `#0a0a0f` - Deep dark for reduced eye strain
- **Card**: `#111118` - Elevated surfaces
- **Primary**: `#06b6d4` - Cyan accent for CTI aesthetic
- **Accent**: `#8b5cf6` - Purple for highlights
- **Destructive**: `#ef4444` - Red for alerts and ransomware

### Typography

- **Sans**: Geist Sans - Modern, readable
- **Mono**: Geist Mono - Code and IDs

### Components

- Stat cards with glow effects
- Interactive chart tooltips
- Animated transitions
- Responsive grid layouts

## Country Normalization

The dashboard uses normalized country data:
- **Full Country Names**: "United States" instead of "US"
- **ISO Codes**: Stored for CTI reports
- **Flag Emojis**: Visual country representation
- **Consistent Filtering**: Merges duplicates (e.g., "US" and "United States")

## Performance Optimizations

### 1. React Query Caching

- Automatic data caching
- Background refetching
- Stale-while-revalidate pattern

### 2. Code Splitting

- Automatic route-based code splitting
- Lazy loading of components
- Optimized bundle sizes

### 3. Image Optimization

- Next.js Image component
- Automatic optimization
- Lazy loading

### 4. API Request Optimization

- Request deduplication
- Parallel queries where possible
- Pagination for large datasets

## Deployment

### Vercel (Production)

- Automatic deployments from GitHub
- Environment variables configured
- Edge network for fast global access

### Local Development

```bash
npm install
npm run dev
# Open http://localhost:3000
```

### Build

```bash
npm run build
npm start
```

## Environment Variables

```env
# API URL (required)
NEXT_PUBLIC_API_URL=https://eduthreat-cti-production.up.railway.app

# Site metadata (optional)
NEXT_PUBLIC_SITE_NAME=EduThreat-CTI
NEXT_PUBLIC_SITE_DESCRIPTION=Cyber Threat Intelligence for Education Sector
```

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Accessibility

- Semantic HTML
- ARIA labels where needed
- Keyboard navigation support
- Screen reader friendly

## Security Considerations

- No authentication required for read-only dashboard
- CORS configured for API access
- No sensitive data in client-side code
- Environment variables for configuration

## Future Enhancements

- User authentication
- Saved searches and filters
- Export functionality (CSV, JSON)
- Real-time updates via WebSocket
- Custom dashboards
- Alert system

## Contributing

See [CONTRIBUTING.md](../EduThreat-CTI/CONTRIBUTING.md) in the main project.

## License

MIT License - see [LICENSE](../LICENSE) file.
