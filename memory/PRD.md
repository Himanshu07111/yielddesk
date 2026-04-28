# YieldDesk - Product Requirements Document

## Original Problem Statement
Build "YieldDesk" — a Fixed Income bond market dashboard with a Bloomberg-inspired dark UI. Professional financial aesthetic for job interviews at top financial firms.

## Architecture
- **Frontend**: React 19 + Tailwind CSS + shadcn/UI + ApexCharts v5
- **Backend**: FastAPI (Python)
- **Database**: MongoDB (Motor async driver)
- **Charts**: react-apexcharts v2.1 + apexcharts v5.10
- **Icons**: @phosphor-icons/react
- **Fonts**: IBM Plex Sans + JetBrains Mono

## User Personas
- **Recruiters / Hiring Managers**: Zero-friction viewing of a polished financial dashboard
- **Developers**: Showcasing full-stack skills with professional UI

## Core Requirements (Static)
1. Yield Curve page with real-time-style chart (1M-30Y tenors)
2. Bond Screener with filtering, sorting, pagination, CSV export
3. Bloomberg-style dark terminal UI
4. No authentication (public dashboard)
5. Mock/simulated treasury yield data

## What's Been Implemented (2026-04-24)
- [x] Backend API: `/api/yield-curve` - FRED API live data with mock fallback, 60s cache
- [x] Backend API: `/api/bonds` - Paginated bond data (25 bonds) with filtering, sorting
- [x] Backend API: `/api/bonds/export` - CSV export with applied filters
- [x] MongoDB seeding: 25 mock bonds (8 Government, 10 Corporate, 7 Municipal)
- [x] Yield Curve page: ApexCharts line chart, LIVE/MOCK data badge, 4 metric cards, data grid, 60s auto-refresh
- [x] Bond Screener page: Data table, yield range slider, rating filter, type filter, maturity date picker, pagination, CSV export
- [x] Bond Detail Modal: Framer Motion animation, metrics grid, sparkline chart, auto insight pills
- [x] Header: YieldDesk branding, navigation, live EST clock
- [x] Dark financial theme: #0a0e1a bg, #1a2035 cards, #00d4aa green, #ff4757 red, orange accents
- [x] Professional README.md for GitHub
- [x] Responsive design, all interactive elements with data-testid

## Test Results
- Backend: 16/16 tests passed (100%)
- Frontend: All flows verified (100%)

## Prioritized Backlog
### P0 (Done)
- Yield Curve page
- Bond Screener page
- Navigation and theming

### P1 (Next)
- Real FRED API integration (requires API key)
- Historical yield curve comparison (overlay multiple dates)
- Bond detail view / modal on row click

### P2 (Enhancement)
- Portfolio tracker / watchlist functionality
- Alert system for yield threshold crossings
- WebSocket for real-time data updates
- Dark/light theme toggle (currently dark only)

## Next Tasks
1. Add FRED API integration for real treasury data (user needs to provide API key)
2. Add historical yield curve overlays
3. Add bond detail modal
4. Add watchlist/favorites functionality
