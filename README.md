# YieldDesk

> Bloomberg Terminal-inspired Fixed Income dashboard — React + FastAPI + FRED API

![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)

---

## Features

- **Real-time Treasury Yield Curve** — Live data from FRED API (Federal Reserve) with 60-second auto-refresh and automatic mock-data fallback
- **Bond Screener** — 25 instruments across Government, Corporate & Municipal bonds
- **Multi-filter System** — Dual-thumb yield range slider, credit rating dropdown, bond type multi-select, maturity date picker
- **Sortable & Paginated** — Click any column header to sort; 10 items per page
- **CSV Export** — Download filtered bond data with one click
- **Bond Detail Modal** — Click any row for full bond analysis with sparkline chart and auto-generated insight pills
- **Live Market Clock** — Real-time EST clock in the navbar
- **16/16 Tests Passing** — Full backend API test coverage

---

## Tech Stack

| Layer    | Technology                                   |
| -------- | -------------------------------------------- |
| Frontend | React 19, Tailwind CSS, shadcn/ui, ApexCharts |
| Backend  | FastAPI, Python 3.11                         |
| Database | MongoDB                                      |
| Data     | FRED API (Federal Reserve Economic Data)     |
| Testing  | Pytest                                       |

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- MongoDB

### Installation

```bash
# Clone
git clone https://github.com/yourusername/yielddesk.git
cd yielddesk

# Backend
cd backend
pip install -r requirements.txt
# Create .env with:
#   MONGO_URL="mongodb://localhost:27017"
#   DB_NAME="yielddesk"
#   FRED_API_KEY="your_fred_api_key"
uvicorn server:app --reload --port 8001

# Frontend (new terminal)
cd frontend
yarn install
# Create .env with:
#   REACT_APP_BACKEND_URL=http://localhost:8001
yarn start
```

### Environment Variables

| Variable                 | Location       | Description                                                                                      |
| ------------------------ | -------------- | ------------------------------------------------------------------------------------------------ |
| `MONGO_URL`              | backend/.env   | MongoDB connection string                                                                        |
| `DB_NAME`                | backend/.env   | Database name                                                                                    |
| `FRED_API_KEY`           | backend/.env   | Free key from [fred.stlouisfed.org](https://fred.stlouisfed.org/docs/api/api_key.html)           |
| `REACT_APP_BACKEND_URL`  | frontend/.env  | Backend API URL                                                                                  |

---

## API Endpoints

| Method | Endpoint            | Description                                        |
| ------ | ------------------- | -------------------------------------------------- |
| GET    | `/api/yield-curve`  | Treasury yield curve (FRED live + mock fallback)    |
| GET    | `/api/bonds`        | Paginated bond list with filters & sorting          |
| GET    | `/api/bonds/export` | CSV export of filtered bonds                        |

---

## Screenshots

> Screenshots coming soon

---

Built by **Himanshu Sehrawat** · [LinkedIn](https://linkedin.com/in/himanshusehrawat)
