# Nashville SC Dashboard (Frontend)

This React app is the presentation layer for the Nashville SC Fan Economics and Operations Analytics portfolio project.

## What the Frontend Shows
- Executive KPI cards (attendance, revenue, occupancy, trend)
- High-level statistical summary and interpretation
- Methods and analysis caveats (plain-English explanations)
- Attendance trend + forecast charts
- Promotion performance and inference table
- Ticket and merchandise mix visualizations
- Marketing ROI simulator
- Game-by-game operational detail and seat utilization
- Anomaly / demand-risk flagging table
- Data-entry form for adding new games

## Backend Dependency
The dashboard expects the Flask API to be running at:
- `http://127.0.0.1:5000`

If you change the backend host/port, update `API_BASE` in:
- `src/components/Dashboard.js`

## Run Locally
1. Install dependencies:
   - `npm install`
2. Start the dev server:
   - `npm start`
3. Open:
   - `http://localhost:3000`

## Build for Production
- `npm run build`

## Notes for Portfolio Review
- The dashboard intentionally surfaces methods and caveats alongside charts to demonstrate statistical communication, not only visualization.
- Some commercial metrics are derived from synthetic ticket/merch data seeded for scenario analysis.
