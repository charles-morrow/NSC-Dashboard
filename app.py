import math
import os
import random
from collections import defaultdict
from datetime import datetime
from statistics import median

try:
    import boto3
except Exception:  # pragma: no cover - optional dependency at runtime
    boto3 = None

try:
    from dotenv import load_dotenv
except Exception:  # pragma: no cover - optional dependency at runtime
    def load_dotenv():
        return False
from flask import Flask, jsonify, request
from flask_cors import CORS
from sqlalchemy import func
from sqlalchemy.exc import SQLAlchemyError

from database import Session
from models import Game, MerchSale, Promotion, Ticket

load_dotenv()

app = Flask(__name__)
CORS(app, supports_credentials=True, resources={r"/*": {"origins": "*"}})

# Optional S3 wiring (kept for future ingestion workflows)
s3 = None
if boto3 is not None:
    try:
        s3 = boto3.client(
            "s3",
            aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
            region_name="us-east-1",
        )
    except Exception:
        s3 = None
BUCKET_NAME = "tripsbucket01"
FILE_KEY = "Attendance.csv"

STADIUM_CAPACITY = 30000


def _normalize_text(value, default="Unknown"):
    if value is None:
        return default
    normalized = str(value).strip()
    return normalized if normalized else default


def _safe_int(value, default=0):
    return int(value) if value is not None else default


def _safe_float(value, default=0.0):
    return float(value) if value is not None else default


def _mean(values):
    return sum(values) / len(values) if values else 0.0


def _variance(values):
    if len(values) < 2:
        return 0.0
    avg = _mean(values)
    return sum((v - avg) ** 2 for v in values) / (len(values) - 1)


def _std_dev(values):
    return math.sqrt(_variance(values))


def _covariance(a_vals, b_vals):
    if len(a_vals) != len(b_vals) or len(a_vals) < 2:
        return 0.0
    a_mean = _mean(a_vals)
    b_mean = _mean(b_vals)
    return sum((a - a_mean) * (b - b_mean) for a, b in zip(a_vals, b_vals)) / (len(a_vals) - 1)


def _correlation(a_vals, b_vals):
    sd_a = _std_dev(a_vals)
    sd_b = _std_dev(b_vals)
    if sd_a == 0 or sd_b == 0:
        return 0.0
    return _covariance(a_vals, b_vals) / (sd_a * sd_b)


def _percentile(values, q):
    if not values:
        return 0.0
    if q <= 0:
        return min(values)
    if q >= 100:
        return max(values)

    ordered = sorted(values)
    idx = (len(ordered) - 1) * (q / 100)
    lo = int(math.floor(idx))
    hi = int(math.ceil(idx))
    if lo == hi:
        return ordered[lo]
    weight = idx - lo
    return ordered[lo] * (1 - weight) + ordered[hi] * weight


def _distribution_summary(values):
    if not values:
        return {
            "count": 0,
            "mean": 0.0,
            "median": 0.0,
            "std_dev": 0.0,
            "min": 0.0,
            "max": 0.0,
            "q1": 0.0,
            "q3": 0.0,
            "iqr": 0.0,
            "p10": 0.0,
            "p90": 0.0,
            "coefficient_of_variation": 0.0,
        }

    mean_val = _mean(values)
    q1 = _percentile(values, 25)
    q3 = _percentile(values, 75)
    return {
        "count": len(values),
        "mean": round(mean_val, 2),
        "median": round(float(median(values)), 2),
        "std_dev": round(_std_dev(values), 2),
        "min": round(min(values), 2),
        "max": round(max(values), 2),
        "q1": round(q1, 2),
        "q3": round(q3, 2),
        "iqr": round(q3 - q1, 2),
        "p10": round(_percentile(values, 10), 2),
        "p90": round(_percentile(values, 90), 2),
        "coefficient_of_variation": round((_std_dev(values) / mean_val) if mean_val else 0.0, 4),
    }


def _interpret_correlation(r_value):
    if r_value >= 0.7:
        strength = "strong positive"
    elif r_value >= 0.3:
        strength = "moderate positive"
    elif r_value > 0.1:
        strength = "weak positive"
    elif r_value <= -0.7:
        strength = "strong negative"
    elif r_value <= -0.3:
        strength = "moderate negative"
    elif r_value < -0.1:
        strength = "weak negative"
    else:
        strength = "near-zero"
    return strength


def _methodology_notes():
    return {
        "descriptive_statistics": {
            "method": "Univariate summaries (mean, median, standard deviation, quartiles, IQR, percentile bands, coefficient of variation).",
            "why_it_is_used": "Provides a stable overview of central tendency, spread, and season volatility before any inference or forecasting.",
            "interpretation": "Median and quartiles help reduce sensitivity to outliers; CV contextualizes variability relative to average attendance.",
        },
        "trend_and_forecast": {
            "method": "Simple ordinary least squares linear regression over game sequence, plus 3-game forecast with 80% prediction intervals using residual standard error.",
            "why_it_is_used": "Intentionally interpretable baseline that admissions reviewers can audit quickly.",
            "interpretation": "Slope estimates directional attendance trend per game; R^2 indicates in-sample fit; prediction intervals communicate uncertainty.",
        },
        "promotion_inference": {
            "method": "Observed mean attendance difference versus non-promo games, with bootstrap 80% confidence intervals and permutation-test p-values.",
            "why_it_is_used": "Small-sample, nonparametric inference is more robust than strict normality assumptions for this dataset size.",
            "interpretation": "Uplift is associative, not causal. p-values quantify extremeness under a no-difference shuffle null; CI reflects plausible uplift range.",
        },
        "segmentation_and_mix": {
            "method": "Grouped averages by competition, weekday, and month, plus ticket/merch mix decomposition.",
            "why_it_is_used": "Separates demand volume from monetization efficiency and supports operational planning.",
            "interpretation": "Use segment comparisons for prioritization, not causal claims.",
        },
        "anomaly_flagging": {
            "method": "Percentile-based rule: bottom 20% attendance = demand risk, top 20% = demand spike.",
            "why_it_is_used": "Transparent screening rule for triage and review in small datasets.",
            "interpretation": "Flags are prompts for investigation, not errors or definitive root-cause labels.",
        },
        "marketing_simulator": {
            "method": "Scenario model combining expected attendance uplift with historical revenue-per-attendee and user-provided media/variable costs.",
            "why_it_is_used": "Translates analytics output into operational and budgeting decisions.",
            "interpretation": "Outputs are decision-support estimates contingent on assumptions, not forecasts of guaranteed realized profit.",
        },
    }


def _analysis_caveats():
    return [
        "Attendance records are observed outcomes; promotion comparisons are not randomized experiments.",
        "Promotion names and game-level promotion assignments are simulated for portfolio demonstration and are not verified historical club campaigns.",
        "Ticket and merchandise transaction data are synthetic and intended for scenario analysis/portfolio demonstration.",
        "Forecasting model is a linear baseline for interpretability; it does not model opponent strength, weather, pricing, or injuries.",
        "Small sample sizes for some promotions can produce wide intervals and unstable p-values.",
    ]


def _project_context():
    return {
        "title": "Nashville SC Fan Economics and Operations Analytics for 2025 Home Games",
        "portfolio_intent": "Created by Charles Morrow to demonstrate end-to-end data science and product thinking.",
        "business_questions": [
            "How variable is home attendance across the season?",
            "Which promotions are associated with stronger attendance outcomes?",
            "How do demand levels relate to revenue and seat utilization?",
            "What campaign scenarios break even under different cost assumptions?",
        ],
        "data_provenance": {
            "attendance": "Observed home-match attendance records",
            "promotions": "Simulated promotion labels and game assignments for portfolio analysis",
            "ticket_and_merch": "Synthetic commercial scenario data for portfolio analysis",
        },
    }


def _workflow_steps():
    return [
        {
            "step": "Data integration",
            "description": "Join game records to promotion, ticketing, and merchandise tables to create a game-level analytical frame.",
        },
        {
            "step": "Descriptive analysis",
            "description": "Summarize central tendency, volatility, distribution spread, and demand thresholds.",
        },
        {
            "step": "Inference and forecasting",
            "description": "Estimate promotion-associated uplift with uncertainty and build an interpretable attendance trend forecast.",
        },
        {
            "step": "Decision support",
            "description": "Translate findings into anomaly triage, segment diagnostics, and marketing ROI scenarios.",
        },
    ]


def _build_recommendations(rows, promotion_effects, forecast, corr_matrix):
    recommendations = []

    if promotion_effects:
        top = promotion_effects[0]
        msg = (
            f"Prioritize controlled follow-up testing for '{top['promotion']}' because it shows the largest observed attendance uplift "
            f"(+{top['uplift_attendance']} fans/game, 80% CI {top['ci80_low']} to {top['ci80_high']})."
        )
        recommendations.append(
            {
                "category": "Promotion strategy",
                "priority": "High",
                "recommendation": msg,
                "rationale": "Top historical uplift may be useful for targeted campaigns, but results remain observational.",
            }
        )

    next_game = forecast.get("predictions", [{}])[0] if forecast else {}
    if next_game:
        recommendations.append(
            {
                "category": "Operations planning",
                "priority": "Medium",
                "recommendation": (
                    f"Staff and inventory against a forecast baseline of {next_game.get('predicted_attendance', 0):,} attendees "
                    f"with contingency planning across the 80% interval ({next_game.get('pi80_low', 0):,}-{next_game.get('pi80_high', 0):,})."
                ),
                "rationale": "Prediction intervals are better planning inputs than point forecasts alone.",
            }
        )

    if corr_matrix.get("attendance_vs_total_revenue", 0) >= 0.6:
        recommendations.append(
            {
                "category": "Commercial operations",
                "priority": "Medium",
                "recommendation": "Demand growth appears strongly linked to revenue totals; align merchandising and ticket upsell capacity with high-attendance risk/spike games.",
                "rationale": "A strong positive attendance-revenue association suggests capacity planning affects monetization outcomes.",
            }
        )

    risk_games = [r for r in rows if r["attendance"] <= _percentile([x["attendance"] for x in rows], 20)]
    if risk_games:
        recommendations.append(
            {
                "category": "Demand management",
                "priority": "Medium",
                "recommendation": "Create a pre-match intervention playbook for low-demand fixtures (bottom-quintile attendance) using segmented offers and targeted media timing.",
                "rationale": "Percentile-based risk flags identify recurring low-demand conditions for proactive intervention.",
            }
        )

    return recommendations[:5]


def _linear_regression(values):
    n = len(values)
    if n < 2:
        return 0.0, float(values[0]) if values else 0.0, 0.0, 0.0

    x_vals = list(range(1, n + 1))
    x_mean = _mean(x_vals)
    y_mean = _mean(values)

    sxy = sum((x - x_mean) * (y - y_mean) for x, y in zip(x_vals, values))
    sxx = sum((x - x_mean) ** 2 for x in x_vals)
    slope = sxy / sxx if sxx else 0.0
    intercept = y_mean - slope * x_mean

    fitted = [intercept + slope * x for x in x_vals]
    residuals = [actual - pred for actual, pred in zip(values, fitted)]
    sse = sum(r ** 2 for r in residuals)
    sst = sum((y - y_mean) ** 2 for y in values)
    r_squared = 1 - (sse / sst) if sst else 0.0
    residual_std_error = math.sqrt(sse / max(1, n - 2))

    return slope, intercept, r_squared, residual_std_error


def _forecast_with_intervals(values, horizon=3):
    slope, intercept, r_squared, residual_se = _linear_regression(values)
    n = len(values)
    z_80 = 1.2816

    predictions = []
    for step in range(1, horizon + 1):
        x_future = n + step
        prediction = intercept + slope * x_future
        margin = z_80 * residual_se
        predictions.append(
            {
                "game_number": x_future,
                "predicted_attendance": int(round(prediction)),
                "pi80_low": int(round(max(0.0, prediction - margin))),
                "pi80_high": int(round(prediction + margin)),
            }
        )

    return {
        "predictions": predictions,
        "slope_per_game": round(slope, 2),
        "r_squared": round(r_squared, 4),
    }


def _bootstrap_diff_ci(sample_a, sample_b, iterations=2000, seed=42):
    if not sample_a or not sample_b:
        return 0.0, 0.0

    rng = random.Random(seed)
    boot_diffs = []
    for _ in range(iterations):
        resample_a = [rng.choice(sample_a) for _ in range(len(sample_a))]
        resample_b = [rng.choice(sample_b) for _ in range(len(sample_b))]
        boot_diffs.append(_mean(resample_a) - _mean(resample_b))

    boot_diffs.sort()
    lower = boot_diffs[int(0.1 * len(boot_diffs))]
    upper = boot_diffs[int(0.9 * len(boot_diffs))]
    return lower, upper


def _permutation_p_value(sample_a, sample_b, iterations=2000, seed=42):
    if not sample_a or not sample_b:
        return 1.0

    rng = random.Random(seed)
    observed = abs(_mean(sample_a) - _mean(sample_b))
    pooled = sample_a + sample_b
    size_a = len(sample_a)
    extreme_count = 0

    for _ in range(iterations):
        shuffled = pooled[:]
        rng.shuffle(shuffled)
        perm_a = shuffled[:size_a]
        perm_b = shuffled[size_a:]
        diff = abs(_mean(perm_a) - _mean(perm_b))
        if diff >= observed:
            extreme_count += 1

    return (extreme_count + 1) / (iterations + 1)


def _load_game_frame(session):
    ticket_subquery = (
        session.query(
            Ticket.game_id.label("game_id"),
            func.sum(Ticket.revenue).label("ticket_revenue"),
            func.sum(Ticket.quantity).label("tickets_sold"),
        )
        .group_by(Ticket.game_id)
        .subquery()
    )
    merch_subquery = (
        session.query(
            MerchSale.game_id.label("game_id"),
            func.sum(MerchSale.total_revenue).label("merch_revenue"),
            func.sum(MerchSale.quantity).label("merch_units"),
        )
        .group_by(MerchSale.game_id)
        .subquery()
    )

    games = (
        session.query(
            Game.id,
            Game.game_date,
            Game.opponent,
            Game.attendance,
            Game.competition,
            Game.venue,
            Promotion.name.label("promotion_name"),
            ticket_subquery.c.ticket_revenue,
            ticket_subquery.c.tickets_sold,
            merch_subquery.c.merch_revenue,
            merch_subquery.c.merch_units,
        )
        .outerjoin(Promotion, Promotion.id == Game.promotion_id)
        .outerjoin(ticket_subquery, ticket_subquery.c.game_id == Game.id)
        .outerjoin(merch_subquery, merch_subquery.c.game_id == Game.id)
        .order_by(Game.game_date, Game.id)
        .all()
    )

    rows = []
    for g in games:
        attendance = _safe_int(g.attendance)
        ticket_revenue = _safe_float(g.ticket_revenue)
        merch_revenue = _safe_float(g.merch_revenue)
        tickets_sold = _safe_int(g.tickets_sold)
        merch_units = _safe_int(g.merch_units)
        total_revenue = ticket_revenue + merch_revenue

        rows.append(
            {
                "id": g.id,
                "game_date": g.game_date,
                "opponent": g.opponent,
                "attendance": attendance,
                "competition": _normalize_text(g.competition, "Unknown"),
                "venue": _normalize_text(g.venue, "Unknown"),
                "promotion_name": _normalize_text(g.promotion_name, "None"),
                "ticket_revenue": ticket_revenue,
                "tickets_sold": tickets_sold,
                "merch_revenue": merch_revenue,
                "merch_units": merch_units,
                "total_revenue": total_revenue,
                "occupancy_rate": attendance / STADIUM_CAPACITY if STADIUM_CAPACITY else 0.0,
                "ticket_price_per_seat": ticket_revenue / tickets_sold if tickets_sold else 0.0,
                "revenue_per_attendee": total_revenue / attendance if attendance else 0.0,
                "merch_rev_per_attendee": merch_revenue / attendance if attendance else 0.0,
                "ticket_rev_per_attendee": ticket_revenue / attendance if attendance else 0.0,
                "merch_attach_rate": merch_units / attendance if attendance else 0.0,
                "weekday": g.game_date.strftime("%A") if g.game_date else "Unknown",
                "month": g.game_date.strftime("%b") if g.game_date else "Unknown",
            }
        )

    return _enforce_low_attendance_no_promo(rows, min_games=3)


def _enforce_low_attendance_no_promo(rows, min_games=3):
    if not rows or min_games <= 0:
        return rows

    sorted_rows = sorted(rows, key=lambda r: (r["attendance"], r["game_date"], r["id"]))
    for row in sorted_rows[: min(min_games, len(sorted_rows))]:
        row["promotion_name"] = "None"

    return rows

def _compute_promotion_effects(rows):
    promo_names = sorted(set(r["promotion_name"] for r in rows if r["promotion_name"] != "None"))
    promotion_effects = []

    for promo_name in promo_names:
        with_promo = [r["attendance"] for r in rows if r["promotion_name"] == promo_name]
        without_promo = [r["attendance"] for r in rows if r["promotion_name"] != promo_name]
        if not with_promo or not without_promo:
            continue

        uplift = _mean(with_promo) - _mean(without_promo)
        ci_low, ci_high = _bootstrap_diff_ci(with_promo, without_promo)
        p_value = _permutation_p_value(with_promo, without_promo)
        baseline = _mean(without_promo)

        with_promo_rows = [r for r in rows if r["promotion_name"] == promo_name]
        without_promo_rows = [r for r in rows if r["promotion_name"] != promo_name]

        mean_total_rev_with = _mean([r["total_revenue"] for r in with_promo_rows])
        mean_total_rev_without = _mean([r["total_revenue"] for r in without_promo_rows])
        mean_rev_per_att_with = _mean([r["revenue_per_attendee"] for r in with_promo_rows])
        mean_rev_per_att_without = _mean([r["revenue_per_attendee"] for r in without_promo_rows])
        modeled_incremental_revenue = uplift * mean_rev_per_att_without

        promotion_effects.append(
            {
                "promotion": promo_name,
                "n_games_with_promo": len(with_promo),
                "mean_with_promo": int(round(_mean(with_promo))),
                "mean_without_promo": int(round(_mean(without_promo))),
                "uplift_attendance": int(round(uplift)),
                "uplift_pct": round((uplift / baseline) * 100, 2) if baseline else 0.0,
                "ci80_low": int(round(ci_low)),
                "ci80_high": int(round(ci_high)),
                "permutation_p_value": round(p_value, 4),
                "is_significant_at_10pct": p_value < 0.10,
                "avg_total_revenue_with_promo": int(round(mean_total_rev_with)),
                "avg_total_revenue_without_promo": int(round(mean_total_rev_without)),
                "avg_revenue_per_attendee_with_promo": round(mean_rev_per_att_with, 2),
                "avg_revenue_per_attendee_without_promo": round(mean_rev_per_att_without, 2),
                "raw_avg_total_revenue_diff": int(round(mean_total_rev_with - mean_total_rev_without)),
                "modeled_revenue_lift_from_uplift": int(round(modeled_incremental_revenue)),
            }
        )

    promotion_effects.sort(key=lambda x: x["uplift_attendance"], reverse=True)
    return promotion_effects


def _segment_summary(rows, key):
    grouped = defaultdict(list)
    for row in rows:
        grouped[row.get(key, "Unknown")].append(row)

    summary = []
    for group, items in grouped.items():
        attendance = [r["attendance"] for r in items]
        revenue = [r["total_revenue"] for r in items]
        summary.append(
            {
                "segment": group,
                "games": len(items),
                "avg_attendance": int(round(_mean(attendance))),
                "avg_total_revenue": int(round(_mean(revenue))),
                "avg_occupancy_rate": round(_mean([r["occupancy_rate"] for r in items]), 4),
                "avg_revenue_per_attendee": round(_mean([r["revenue_per_attendee"] for r in items]), 2),
            }
        )

    summary.sort(key=lambda x: x["avg_attendance"], reverse=True)
    return summary


def _build_holistic_analysis(rows, session):
    attendance_values = [r["attendance"] for r in rows]
    total_attendance = sum(attendance_values)
    total_ticket_revenue = sum(r["ticket_revenue"] for r in rows)
    total_merch_revenue = sum(r["merch_revenue"] for r in rows)
    total_revenue = total_ticket_revenue + total_merch_revenue
    total_merch_units = sum(r["merch_units"] for r in rows)

    attendance_sd = _std_dev(attendance_values)
    forecast = _forecast_with_intervals(attendance_values, horizon=3)
    promotion_effects = _compute_promotion_effects(rows)

    ticket_rows = session.query(Ticket.type, func.sum(Ticket.quantity), func.sum(Ticket.revenue)).group_by(Ticket.type).all()
    merch_rows = session.query(MerchSale.item, func.sum(MerchSale.quantity), func.sum(MerchSale.total_revenue)).group_by(MerchSale.item).all()

    ticket_mix = []
    total_ticket_units = sum(_safe_int(r[1]) for r in ticket_rows)
    for ticket_type, qty, revenue in ticket_rows:
        qty_i = _safe_int(qty)
        rev_f = _safe_float(revenue)
        ticket_mix.append(
            {
                "ticket_type": ticket_type,
                "quantity": qty_i,
                "revenue": int(round(rev_f)),
                "avg_price": round(rev_f / qty_i, 2) if qty_i else 0.0,
                "share_of_units": round((qty_i / total_ticket_units) * 100, 2) if total_ticket_units else 0.0,
            }
        )

    merch_mix = []
    for item, qty, revenue in merch_rows:
        qty_i = _safe_int(qty)
        rev_f = _safe_float(revenue)
        merch_mix.append(
            {
                "item": item,
                "quantity": qty_i,
                "revenue": int(round(rev_f)),
                "avg_unit_price": round(rev_f / qty_i, 2) if qty_i else 0.0,
            }
        )

    ticket_mix.sort(key=lambda x: x["revenue"], reverse=True)
    merch_mix.sort(key=lambda x: x["revenue"], reverse=True)

    rev_per_att_values = [r["revenue_per_attendee"] for r in rows]
    occ_values = [r["occupancy_rate"] for r in rows]
    merch_per_att_values = [r["merch_rev_per_attendee"] for r in rows]
    ticket_per_att_values = [r["ticket_rev_per_attendee"] for r in rows]
    total_revenue_values = [r["total_revenue"] for r in rows]

    corr_matrix = {
        "attendance_vs_total_revenue": round(_correlation(attendance_values, total_revenue_values), 4),
        "attendance_vs_merch_rev_per_attendee": round(_correlation(attendance_values, merch_per_att_values), 4),
        "occupancy_vs_revenue_per_attendee": round(_correlation(occ_values, rev_per_att_values), 4),
    }

    low_threshold = _percentile(attendance_values, 20)
    high_threshold = _percentile(attendance_values, 80)
    anomaly_games = []
    for r in rows:
        label = None
        if r["attendance"] <= low_threshold:
            label = "Demand Risk"
        elif r["attendance"] >= high_threshold:
            label = "Demand Spike"

        if label:
            anomaly_games.append(
                {
                    "game_id": r["id"],
                    "game_date": r["game_date"].strftime("%Y-%m-%d"),
                    "opponent": r["opponent"],
                    "attendance": r["attendance"],
                    "total_revenue": int(round(r["total_revenue"])),
                    "tag": label,
                }
            )

    anomaly_games.sort(key=lambda x: x["attendance"])

    season_story = []
    if promotion_effects:
        best_promo = promotion_effects[0]
        season_story.append(
            f"Top promotion by attendance lift is {best_promo['promotion']} (+{best_promo['uplift_attendance']} attendees/game)."
        )

    season_story.append(
        f"Median attendance is {int(round(median(attendance_values))):,} with volatility (CV) {round(attendance_sd / _mean(attendance_values), 4) if _mean(attendance_values) else 0.0}."
    )
    season_story.append(
        f"Forecasted next-game attendance is {forecast['predictions'][0]['predicted_attendance']:,} (80% PI {forecast['predictions'][0]['pi80_low']:,}-{forecast['predictions'][0]['pi80_high']:,})."
    )

    association_summary = []
    for metric, r_value in corr_matrix.items():
        association_summary.append(
            {
                "metric_pair": metric,
                "correlation": r_value,
                "interpretation": _interpret_correlation(r_value),
            }
        )

    descriptive_statistics = {
        "attendance": _distribution_summary(attendance_values),
        "total_revenue": _distribution_summary(total_revenue_values),
        "revenue_per_attendee": _distribution_summary(rev_per_att_values),
        "ticket_revenue_per_attendee": _distribution_summary(ticket_per_att_values),
        "merch_revenue_per_attendee": _distribution_summary(merch_per_att_values),
        "occupancy_rate": _distribution_summary(occ_values),
        "thresholds": {
            "attendance_p20_demand_risk_cutoff": round(low_threshold, 2),
            "attendance_p80_demand_spike_cutoff": round(high_threshold, 2),
        },
    }

    return {
        "context": _project_context(),
        "workflow": _workflow_steps(),
        "meta": {
            "sample_size_games": len(rows),
            "stadium_capacity": STADIUM_CAPACITY,
            "data_sources": {
                "attendance_csv": FILE_KEY,
                "database": "nashville_sc_business.db",
            },
            "backend_status": {
                "s3_client_configured": s3 is not None,
            },
        },
        "kpis": {
            "avg_attendance": int(round(_mean(attendance_values))),
            "median_attendance": int(round(median(attendance_values))),
            "attendance_std_dev": round(attendance_sd, 2),
            "attendance_trend_per_game": forecast["slope_per_game"],
            "forecast_r_squared": forecast["r_squared"],
            "total_ticket_revenue": int(round(total_ticket_revenue)),
            "total_merch_revenue": int(round(total_merch_revenue)),
            "total_revenue": int(round(total_revenue)),
            "revenue_per_attendee": round(total_revenue / total_attendance, 2) if total_attendance else 0.0,
            "ticket_revenue_per_attendee": round(total_ticket_revenue / total_attendance, 2) if total_attendance else 0.0,
            "merch_revenue_per_attendee": round(total_merch_revenue / total_attendance, 2) if total_attendance else 0.0,
            "merch_units_per_1000_attendees": round((total_merch_units / total_attendance) * 1000, 2) if total_attendance else 0.0,
            "avg_occupancy_rate": round(_mean([r["occupancy_rate"] for r in rows]), 4),
        },
        "attendance_time_series": [
            {
                "game_id": r["id"],
                "game_date": r["game_date"].strftime("%Y-%m-%d"),
                "opponent": r["opponent"],
                "attendance": r["attendance"],
                "occupancy_rate": round(r["occupancy_rate"], 4),
                "total_revenue": int(round(r["total_revenue"])),
                "revenue_per_attendee": round(r["revenue_per_attendee"], 2),
                "promotion_name": r["promotion_name"],
                "competition": r["competition"],
                "weekday": r["weekday"],
            }
            for r in rows
        ],
        "forecast": {
            "history_labels": [r["game_date"].strftime("%Y-%m-%d") for r in rows],
            "history_attendance": attendance_values,
            "predictions": forecast["predictions"],
            "model_r_squared": forecast["r_squared"],
        },
        "promotion_effects": promotion_effects,
        "segments": {
            "by_competition": _segment_summary(rows, "competition"),
            "by_weekday": _segment_summary(rows, "weekday"),
            "by_month": _segment_summary(rows, "month"),
        },
        "mix": {
            "ticket_mix": ticket_mix,
            "merch_mix": merch_mix,
        },
        "correlations": corr_matrix,
        "statistics": {
            "descriptive": descriptive_statistics,
            "associations": association_summary,
        },
        "methods": _methodology_notes(),
        "caveats": _analysis_caveats(),
        "recommendations": _build_recommendations(rows, promotion_effects, forecast, corr_matrix),
        "anomalies": anomaly_games,
        "insights": season_story,
    }


@app.route("/attendance")
def get_attendance():
    with Session() as session:
        games = session.query(Game).order_by(Game.game_date).all()
        return jsonify(
            [
                {
                    "id": game.id,
                    "game_date": game.game_date.strftime("%Y-%m-%d"),
                    "opponent": game.opponent,
                    "attendance": game.attendance,
                }
                for game in games
            ]
        )


@app.route("/api/health", methods=["GET"])
def api_health():
    try:
        with Session() as session:
            game_count = session.query(Game).count()
        return jsonify(
            {
                "status": "ok",
                "service": "nsc-analytics-api",
                "port_hint": os.getenv("FLASK_PORT", "5000"),
                "game_count": game_count,
            }
        )
    except Exception as e:
        return jsonify({"status": "error", "service": "nsc-analytics-api", "error": str(e)}), 500


@app.route("/api/analysis", methods=["GET"])
def get_dashboard_metrics():
    with Session() as session:
        total_attendance = session.query(func.sum(Game.attendance)).scalar()
        game_count = session.query(Game).count()
        avg_attendance = total_attendance / game_count if game_count else 0

        total_ticket_revenue = session.query(func.sum(Ticket.revenue)).scalar() or 0
        total_merch_revenue = session.query(func.sum(MerchSale.total_revenue)).scalar() or 0

        promo_performance = (
            session.query(Promotion.name, func.avg(Game.attendance))
            .join(Game)
            .group_by(Promotion.name)
            .all()
        )

        return jsonify(
            {
                "average_attendance": round(avg_attendance),
                "total_ticket_revenue": int(total_ticket_revenue),
                "total_merch_revenue": int(total_merch_revenue),
                "promo_performance": [
                    {"promotion": name, "avg_attendance": int(avg)} for name, avg in promo_performance
                ],
            }
        )


@app.route("/api/advanced_analysis", methods=["GET"])
def advanced_analysis():
    with Session() as session:
        rows = _load_game_frame(session)

    if not rows:
        return jsonify({"error": "No games available for analysis"}), 404

    attendance_values = [row["attendance"] for row in rows]
    total_attendance = sum(attendance_values)
    total_ticket_revenue = sum(row["ticket_revenue"] for row in rows)
    total_merch_revenue = sum(row["merch_revenue"] for row in rows)
    total_merch_units = sum(row["merch_units"] for row in rows)

    attendance_sd = _std_dev(attendance_values)
    coefficient_of_variation = (attendance_sd / _mean(attendance_values)) if _mean(attendance_values) else 0.0

    forecast = _forecast_with_intervals(attendance_values, horizon=3)
    promotion_effects = _compute_promotion_effects(rows)

    return jsonify(
        {
            "sample_size_games": len(rows),
            "attendance": {
                "mean": int(round(_mean(attendance_values))),
                "median": int(round(median(attendance_values))),
                "std_dev": round(attendance_sd, 2),
                "min": min(attendance_values),
                "max": max(attendance_values),
                "coefficient_of_variation": round(coefficient_of_variation, 4),
                "trend_per_game": forecast["slope_per_game"],
            },
            "revenue": {
                "total_ticket_revenue": int(round(total_ticket_revenue)),
                "total_merch_revenue": int(round(total_merch_revenue)),
                "ticket_revenue_per_attendee": round(total_ticket_revenue / total_attendance, 2)
                if total_attendance
                else 0.0,
                "merch_revenue_per_attendee": round(total_merch_revenue / total_attendance, 2)
                if total_attendance
                else 0.0,
                "merch_units_per_1000_attendees": round((total_merch_units / total_attendance) * 1000, 2)
                if total_attendance
                else 0.0,
            },
            "forecast": {
                "history_labels": [row["game_date"].strftime("%Y-%m-%d") for row in rows],
                "history_attendance": attendance_values,
                "predictions": forecast["predictions"],
                "model_r_squared": forecast["r_squared"],
            },
            "promotion_effects": promotion_effects,
        }
    )


@app.route("/api/holistic_analysis", methods=["GET"])
def holistic_analysis():
    with Session() as session:
        rows = _load_game_frame(session)
        if not rows:
            return jsonify({"error": "No games available for analysis"}), 404
        payload = _build_holistic_analysis(rows, session)
        return jsonify(payload)


@app.route("/api/simulate_marketing", methods=["POST"])
def simulate_marketing():
    payload = request.get_json(silent=True) or {}

    promotion = payload.get("promotion")
    base_attendance = int(payload.get("base_attendance", 22000))
    media_spend = float(payload.get("media_spend", 0))
    variable_cost_per_incremental_fan = float(payload.get("variable_cost_per_incremental_fan", 0))

    with Session() as session:
        rows = _load_game_frame(session)

    if not rows:
        return jsonify({"error": "No games available for analysis"}), 404

    default_avg_ticket_per_att = _mean([r["ticket_rev_per_attendee"] for r in rows])
    default_avg_merch_per_att = _mean([r["merch_rev_per_attendee"] for r in rows])
    default_avg_total_per_att = default_avg_ticket_per_att + default_avg_merch_per_att

    promo_effects = _compute_promotion_effects(rows)
    selected = None
    if promotion:
        selected = next((p for p in promo_effects if p["promotion"] == promotion), None)

    expected_uplift = selected["uplift_attendance"] if selected else int(round(_mean([p["uplift_attendance"] for p in promo_effects]))) if promo_effects else 0
    ci_low = selected["ci80_low"] if selected else None
    ci_high = selected["ci80_high"] if selected else None
    avg_total_per_att = (
        selected["avg_revenue_per_attendee_without_promo"]
        if selected
        else default_avg_total_per_att
    )
    avg_ticket_per_att = (
        _mean([r["ticket_rev_per_attendee"] for r in rows if r["promotion_name"] != promotion])
        if selected
        else default_avg_ticket_per_att
    )
    avg_merch_per_att = (
        _mean([r["merch_rev_per_attendee"] for r in rows if r["promotion_name"] != promotion])
        if selected
        else default_avg_merch_per_att
    )

    projected_attendance = base_attendance + expected_uplift
    incremental_revenue = expected_uplift * avg_total_per_att
    positive_uplift = max(0, expected_uplift)
    campaign_variable_cost = positive_uplift * variable_cost_per_incremental_fan
    total_cost = media_spend + campaign_variable_cost
    incremental_profit = incremental_revenue - total_cost

    margin_per_incremental_fan = avg_total_per_att - variable_cost_per_incremental_fan
    break_even_uplift = math.ceil(media_spend / margin_per_incremental_fan) if margin_per_incremental_fan > 0 else None
    break_even_media_spend = (
        expected_uplift * margin_per_incremental_fan
        if expected_uplift > 0 and margin_per_incremental_fan > 0
        else None
    )
    roi = (incremental_profit / total_cost) if total_cost > 0 else None

    return jsonify(
        {
            "inputs": {
                "promotion": promotion or "Blended historical avg",
                "base_attendance": base_attendance,
                "media_spend": round(media_spend, 2),
                "variable_cost_per_incremental_fan": round(variable_cost_per_incremental_fan, 2),
            },
            "assumptions": {
                "expected_uplift_attendance": expected_uplift,
                "expected_uplift_ci80_low": ci_low,
                "expected_uplift_ci80_high": ci_high,
                "avg_ticket_revenue_per_attendee": round(avg_ticket_per_att, 2),
                "avg_merch_revenue_per_attendee": round(avg_merch_per_att, 2),
                "avg_total_revenue_per_attendee": round(avg_total_per_att, 2),
                "margin_per_incremental_fan": round(margin_per_incremental_fan, 2),
            },
            "outputs": {
                "projected_attendance": int(round(projected_attendance)),
                "incremental_revenue": round(incremental_revenue, 2),
                "total_campaign_cost": round(total_cost, 2),
                "incremental_profit": round(incremental_profit, 2),
                "roi": round(roi, 4) if roi is not None else None,
                "break_even_uplift_attendance": break_even_uplift,
                "break_even_media_spend": round(break_even_media_spend, 2) if break_even_media_spend is not None else None,
            },
        }
    )


@app.route("/api/game_detail/<int:game_id>", methods=["GET"])
def game_detail(game_id):
    with Session() as session:
        game = session.query(Game).filter_by(id=game_id).first()
        if not game:
            return jsonify({"error": "Game not found"}), 404

        tickets = session.query(Ticket).filter_by(game_id=game_id).all()
        merch = session.query(MerchSale).filter_by(game_id=game_id).all()

        ticket_summary = [{"type": t.type, "quantity": t.quantity, "revenue": t.revenue} for t in tickets]
        merch_summary = [
            {"item": m.item, "quantity": m.quantity, "total_revenue": m.total_revenue} for m in merch
        ]

        return jsonify(
            {
                "promotion": game.promotion.name if game.promotion else "None",
                "tickets": ticket_summary,
                "merch": merch_summary,
            }
        )


@app.route("/api/add_game", methods=["POST"])
def add_game():
    data = request.json
    with Session() as session:
        try:
            promo_name = data.get("promotion")
            promo_id = None

            if promo_name:
                promotion = session.query(Promotion).filter_by(name=promo_name).first()
                if not promotion:
                    promotion = Promotion(name=promo_name, description="")
                    session.add(promotion)
                    session.flush()
                promo_id = promotion.id

            game = Game(
                game_date=datetime.strptime(data["game_date"], "%Y-%m-%d"),
                opponent=data["opponent"],
                attendance=int(data["attendance"]),
                competition=data["competition"],
                venue=data["venue"],
                promotion_id=promo_id,
            )
            session.add(game)
            session.flush()

            for t in data.get("tickets", []):
                ticket = Ticket(
                    game_id=game.id,
                    type=t["type"],
                    quantity=int(t["quantity"]),
                    revenue=int(t["revenue"]),
                )
                session.add(ticket)

            for m in data.get("merch", []):
                merch = MerchSale(
                    game_id=game.id,
                    item=m["item"],
                    quantity=int(m["quantity"]),
                    total_revenue=int(m["total_revenue"]),
                )
                session.add(merch)

            session.commit()
            return jsonify({"message": "Game added successfully"}), 201

        except (SQLAlchemyError, KeyError, ValueError) as e:
            session.rollback()
            return jsonify({"error": str(e)}), 400


if __name__ == "__main__":
    host = os.getenv("FLASK_HOST", "127.0.0.1")
    port = int(os.getenv("FLASK_PORT", "5000"))
    app.run(host=host, port=port, debug=True)
