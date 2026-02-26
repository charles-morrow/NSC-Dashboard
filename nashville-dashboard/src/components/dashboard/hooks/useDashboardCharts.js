import { useMemo } from 'react';
import { EMPTY_ARR } from '../utils';

export default function useDashboardCharts({
  series,
  thresholds,
  forecast,
  promotionEffects,
  segments,
  ticketMix,
  merchMix,
  selectedAttendance,
  remainingSeats,
}) {
  const attendanceTrendChart = useMemo(
    () => ({
      labels: series.map((r) => r.game_date),
      datasets: [
        {
          label: 'Attendance',
          data: series.map((r) => r.attendance),
          borderColor: '#0f766e',
          backgroundColor: 'rgba(15,118,110,0.14)',
          fill: true,
          tension: 0.25,
        },
        {
          label: 'Demand Risk Cutoff (P20)',
          data: series.map(() => thresholds.attendance_p20_demand_risk_cutoff ?? null),
          borderColor: 'rgba(180,83,9,0.8)',
          borderDash: [4, 4],
          pointRadius: 0,
          tension: 0,
        },
        {
          label: 'Demand Spike Cutoff (P80)',
          data: series.map(() => thresholds.attendance_p80_demand_spike_cutoff ?? null),
          borderColor: 'rgba(30,64,175,0.8)',
          borderDash: [4, 4],
          pointRadius: 0,
          tension: 0,
        },
      ],
    }),
    [series, thresholds.attendance_p20_demand_risk_cutoff, thresholds.attendance_p80_demand_spike_cutoff]
  );

  const forecastChart = useMemo(() => {
    const labels = forecast.history_labels
      ? [...forecast.history_labels, ...(forecast.predictions || EMPTY_ARR).map((p) => `Game #${p.game_number}`)]
      : EMPTY_ARR;

    return {
      labels,
      datasets: [
        {
          label: 'Observed Attendance',
          data: forecast.history_attendance
            ? [...forecast.history_attendance, ...(forecast.predictions || EMPTY_ARR).map(() => null)]
            : EMPTY_ARR,
          borderColor: '#1d4ed8',
          backgroundColor: 'rgba(29,78,216,0.12)',
          tension: 0.2,
          borderWidth: 2,
        },
        {
          label: 'Forecast',
          data: forecast.history_attendance
            ? [...forecast.history_attendance.map(() => null), ...(forecast.predictions || EMPTY_ARR).map((p) => p.predicted_attendance)]
            : EMPTY_ARR,
          borderColor: '#ea580c',
          borderDash: [6, 4],
          tension: 0.2,
          borderWidth: 2,
        },
        {
          label: '80% PI Upper',
          data: forecast.history_attendance
            ? [...forecast.history_attendance.map(() => null), ...(forecast.predictions || EMPTY_ARR).map((p) => p.pi80_high)]
            : EMPTY_ARR,
          borderColor: '#64748b',
          pointRadius: 0,
          borderWidth: 1,
        },
        {
          label: '80% PI Lower',
          data: forecast.history_attendance
            ? [...forecast.history_attendance.map(() => null), ...(forecast.predictions || EMPTY_ARR).map((p) => p.pi80_low)]
            : EMPTY_ARR,
          borderColor: '#64748b',
          pointRadius: 0,
          borderWidth: 1,
        },
      ],
    };
  }, [forecast]);

  const promoChart = useMemo(
    () => ({
      labels: promotionEffects.map((p) => p.promotion),
      datasets: [
        {
          label: 'Observed Attendance Uplift',
          data: promotionEffects.map((p) => p.uplift_attendance),
          backgroundColor: promotionEffects.map((p) => (p.is_significant_at_10pct ? '#0f766e' : '#94a3b8')),
          borderRadius: 6,
        },
      ],
    }),
    [promotionEffects]
  );

  const competitionSegments = segments.by_competition || EMPTY_ARR;

  const compAttendanceChart = useMemo(
    () => ({
      labels: competitionSegments.map((r) => r.segment),
      datasets: [
        {
          label: 'Avg Attendance',
          data: competitionSegments.map((r) => r.avg_attendance),
          backgroundColor: '#1d4ed8',
          borderRadius: 6,
        },
      ],
    }),
    [competitionSegments]
  );

  const compEfficiencyChart = useMemo(
    () => ({
      labels: competitionSegments.map((r) => r.segment),
      datasets: [
        {
          label: 'Avg Revenue per Attendee',
          data: competitionSegments.map((r) => r.avg_revenue_per_attendee),
          backgroundColor: '#7c3aed',
          borderRadius: 6,
        },
      ],
    }),
    [competitionSegments]
  );

  const ticketMixChart = useMemo(
    () => ({
      labels: ticketMix.map((t) => t.ticket_type),
      datasets: [
        {
          label: 'Ticket Units',
          data: ticketMix.map((t) => t.quantity),
          backgroundColor: ['#0f766e', '#1d4ed8', '#f59e0b', '#7c3aed', '#ef4444', '#64748b'],
          borderWidth: 0,
        },
      ],
    }),
    [ticketMix]
  );

  const merchMixChart = useMemo(
    () => ({
      labels: merchMix.map((m) => m.item),
      datasets: [
        {
          label: 'Merch Revenue',
          data: merchMix.map((m) => m.revenue),
          backgroundColor: '#0ea5e9',
          borderRadius: 6,
        },
      ],
    }),
    [merchMix]
  );

  const seatUtilizationChart = useMemo(
    () => ({
      labels: ['Attendees', 'Available Seats'],
      datasets: [
        {
          data: [selectedAttendance, remainingSeats],
          backgroundColor: ['#1d4ed8', '#e2e8f0'],
          borderWidth: 0,
        },
      ],
    }),
    [selectedAttendance, remainingSeats]
  );

  return {
    attendanceTrendChart,
    forecastChart,
    promoChart,
    compAttendanceChart,
    compEfficiencyChart,
    ticketMixChart,
    merchMixChart,
    seatUtilizationChart,
  };
}
