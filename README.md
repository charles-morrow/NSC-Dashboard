# Nashville SC Fan Economics and Operations Analytics

## Author
Trip Morrow

## Portfolio Summary
This project is an end-to-end sports analytics application built for Nashville SC home-match decision support. It combines observed attendance data with synthetic commercial operations data (ticketing + merchandise) to demonstrate how statistical analysis can be translated into marketing and operations actions.

It is intentionally structured as a graduate-school portfolio artifact:
- A reproducible backend data model and API
- An interactive frontend dashboard for decision support
- Transparent statistical methods with plain-English interpretation
- Explicit caveats about inference limits and synthetic data use

## Stack
- Backend: `Flask`, `SQLAlchemy`, `SQLite`
- Frontend: `React`, `Chart.js`, `Axios`
- Data workflow: local CSV + seeded synthetic business data

## Data Assets
- `Attendance.csv`: Nashville SC home attendance records (season-level observational data)
- `nashville_sc_business.db`: SQLite database for games, promotions, ticket sales, and merch sales
- `seed_fake_data.py`: synthetic data generator for ticket/merch scenarios

## What This Project Analyzes
### Demand / attendance analytics
- Attendance trend over time
- Distribution and volatility diagnostics
- Forecasting with uncertainty intervals
- Demand spike / demand risk flagging using percentile rules

### Revenue and operations analytics
- Ticket and merchandise revenue by game
- Revenue-per-attendee efficiency metrics
- Occupancy / seat utilization diagnostics
- Ticket and merch mix decomposition

### Marketing / promotion analytics
- Promotion-level attendance uplift comparisons
- Bootstrap confidence intervals (80%)
- Permutation-test p-values
- Marketing ROI what-if simulator with break-even logic

## High-Level Statistics and Analysis Methods (with explanations)
### Why I chose these methods (personal note)
I chose methods that are strong enough to demonstrate real analytical reasoning while still being easy to explain and audit in a graduate admissions setting. I intentionally prioritized interpretability (descriptive statistics, OLS trend, bootstrap/permutation inference, scenario modeling) over complex black-box models so a reviewer can follow my logic from raw data to decision recommendation.

### 1) Descriptive statistics (what happened?)
Used to summarize attendance and monetization behavior before making inferences.

Included metrics:
- Mean and median (central tendency)
- Standard deviation (spread)
- Quartiles and IQR (robust spread)
- Percentiles (P10/P90 bands)
- Coefficient of variation (volatility relative to mean)

Why this matters:
- The median and quartiles are less sensitive to outliers than the mean.
- CV helps compare variability even when scales differ.
- Percentiles create transparent thresholds for risk/spike tagging.

### 2) Linear trend + short-horizon forecast (what may happen next?)
The app fits a simple OLS linear regression on game sequence (game #1, #2, ...), then produces a 3-game attendance forecast with 80% prediction intervals.

Why this method was chosen:
- It is interpretable and easy to audit in a portfolio review.
- It surfaces trend direction and uncertainty without overfitting a small dataset.

How to interpret outputs:
- `slope_per_game`: estimated average change in attendance per game
- `R^2`: in-sample fit only (not a guarantee of future performance)
- `80% prediction interval`: plausible range for a future single game outcome

### 3) Promotion inference (is a promotion associated with higher attendance?)
The dashboard compares attendance for games with a given promotion vs games without that promotion and reports:
- Mean attendance uplift
- Bootstrap 80% confidence interval (nonparametric)
- Permutation-test p-value (randomization-based significance test)

Why this method was chosen:
- Small samples and noisy outcomes make nonparametric inference more defensible than strict normality assumptions.

Important interpretation note:
- These are observational associations, not causal estimates.
- Promotion type can be confounded with opponent quality, match timing, or other factors.

### 4) Segmentation and mix analysis (where performance differs)
The app computes grouped summaries by:
- Competition
- Weekday
- Month

It also decomposes:
- Ticket type mix (quantity, revenue, average price, unit share)
- Merchandise mix (quantity, revenue, average unit price)

Why this matters:
- Segmenting demand volume and spend efficiency helps prioritize marketing and staffing decisions.

### 5) Anomaly flagging (which games need review?)
Games are flagged using attendance percentiles:
- Bottom 20% = `Demand Risk`
- Top 20% = `Demand Spike`

Why this matters:
- This gives a simple, transparent triage system for post-match review.
- Flags are prompts for investigation, not root-cause conclusions.

### 6) Marketing ROI simulator (what if we spend more?)
A scenario calculator combines:
- Expected promotion uplift (from historical comparisons)
- Historical revenue per attendee
- User-entered media spend and variable fan cost

Outputs include:
- Projected attendance
- Incremental revenue
- Incremental profit
- ROI
- Break-even incremental fan threshold
- Break-even media spend

Why this matters:
- It translates statistical output into budget and operational decisions.

## API Endpoints
- `GET /attendance`: attendance timeline
- `GET /api/analysis`: executive summary metrics
- `GET /api/advanced_analysis`: forecast + promotion inference package
- `GET /api/holistic_analysis`: full dashboard payload (KPIs, stats, methods, caveats, segments, anomalies, etc.)
- `POST /api/simulate_marketing`: scenario/ROI simulation
- `GET /api/game_detail/<id>`: game-level ticket + merch details
- `POST /api/add_game`: insert a new game with ticket and merch rows

## Local Run Instructions
### Backend
1. Install Python dependencies (if needed).
2. Run `python app.py`
3. API serves on `http://127.0.0.1:5000`

### Frontend
1. `cd nashville-dashboard`
2. `npm install`
3. `npm start`
4. Open `http://localhost:3000`

## Methodological Caveats
- Promotion effects are observational and may be confounded.
- Ticket and merch data are synthetic (used for realistic portfolio scenario analysis).
- Forecasting is a linear baseline and does not include weather, pricing, injuries, or opponent strength.
- Some promotions have small sample sizes, so uncertainty can be large.

## Graduate Admissions Positioning
This project demonstrates:
- End-to-end analytics product development (`data -> database -> API -> modeling -> dashboard`)
- Statistical reasoning under uncertainty (intervals, permutation tests, bootstrapping)
- Communication quality (methods + caveats + interpretation in plain English)
- Applied decision support thinking (ROI simulation, anomaly triage, segment strategy)
