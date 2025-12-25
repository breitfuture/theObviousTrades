# The Obvious Trades

Personal portfolio transparency & research platform.

## Tech Stack
- Backend: FastAPI + PostgreSQL
- Frontend: Next.js (App Router) + Tailwind
- Database: PostgreSQL 16 (local)
- Data source: Fidelity daily position snapshots

## Repo Structure
/backend
  - FastAPI app
  - Routers: portfolio, positions, uploads, transparency
/frontend
  - Next.js app (`theobvioustrades-frontend`)
  - Tailwind UI components
  - Calls backend API for live data

## Local Setup (Frontend)
cd frontend
npm install
npm run dev

API base URL is set via:
NEXT_PUBLIC_API_URL=http://localhost:8000

## Local Setup (Backend)
cd backend
uvicorn app.main:app --reload

Database runs locally on port 5433.

## Current Focus
Frontend development:
- Portfolio summary cards
- Positions table
- Equity curve / performance charts
- Loading & error states

Backend is functional and should not be refactored yet.

## Notes
- Use relative imports (no @ aliases)
- Do not change API routes without discussion
- Cash-like symbols: SPAXX, SPAXX**, PENDING
