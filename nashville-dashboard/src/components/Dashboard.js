import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import 'chart.js/auto';
import './Dashboard.css';

import HeroHeader from './dashboard/sections/HeroHeader';
import ExecutiveOverviewSection from './dashboard/sections/ExecutiveOverviewSection';
import ForecastSection from './dashboard/sections/ForecastSection';
import PromotionSection from './dashboard/sections/PromotionSection';
import SegmentationMixSection from './dashboard/sections/SegmentationMixSection';
import RiskDrilldownSection from './dashboard/sections/RiskDrilldownSection';
import MarketingSection from './dashboard/sections/MarketingSection';
import MethodsSection from './dashboard/sections/MethodsSection';
import DataEntrySection from './dashboard/sections/DataEntrySection';
import useDashboardCharts from './dashboard/hooks/useDashboardCharts';
import {
  EMPTY_ARR,
  EMPTY_OBJ,
  STADIUM_CAPACITY,
  apiPath,
  chartBaseOptions,
  fmtInt,
  fmtMoney,
  fmtNum,
  fmtPctRatio,
} from './dashboard/utils';

function Dashboard() {
  const [holisticAnalysis, setHolisticAnalysis] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadErrors, setLoadErrors] = useState([]);

  const [selectedGame, setSelectedGame] = useState('');
  const [gameDetail, setGameDetail] = useState(null);
  const [simResult, setSimResult] = useState(null);
  const [activeStory, setActiveStory] = useState('executive');

  const [simInput, setSimInput] = useState({
    promotion: '',
    base_attendance: 22000,
    media_spend: 25000,
    variable_cost_per_incremental_fan: 6,
  });

  const [newGame, setNewGame] = useState({
    game_date: '',
    opponent: '',
    attendance: '',
    competition: 'MLS Regular Season',
    venue: 'GEODIS Park',
    promotion: '',
    tickets: [{ type: '', quantity: '', revenue: '' }],
    merch: [{ item: '', quantity: '', total_revenue: '' }],
  });

  const drilldownRef = useRef(null);
  const executiveRef = useRef(null);
  const methodsRef = useRef(null);
  const opsRef = useRef(null);

  const loadDashboard = async () => {
    setLoading(true);
    setLoadErrors([]);

    const endpoints = [
      { key: 'health', path: '/api/health' },
      { key: 'holistic', path: '/api/holistic_analysis' },
    ];

    const results = await Promise.allSettled(endpoints.map((endpoint) => axios.get(apiPath(endpoint.path))));
    const errors = [];

    results.forEach((result, index) => {
      const endpoint = endpoints[index];
      if (result.status === 'fulfilled') {
        if (endpoint.key === 'health') setHealth(result.value.data || null);
        if (endpoint.key === 'holistic') setHolisticAnalysis(result.value.data || null);
        return;
      }

      const err = result.reason;
      const status = err?.response?.status;
      const message = err?.response?.data?.error || err?.message || 'Request failed';
      errors.push(`${endpoint.path}${status ? ` (${status})` : ''}: ${message}`);
      console.error(`Failed endpoint ${endpoint.path}`, err);
    });

    setLoadErrors(errors);
    setLoading(false);
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    if (!selectedGame) {
      setGameDetail(null);
      return;
    }

    axios
      .get(apiPath(`/api/game_detail/${Number(selectedGame)}`))
      .then((res) => setGameDetail(res.data || null))
      .catch((err) => console.error('Failed to fetch game detail:', err));
  }, [selectedGame]);

  useEffect(() => {
    if (selectedGame && drilldownRef.current) {
      drilldownRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedGame]);

  const jumpToStory = (storyId) => {
    setActiveStory(storyId);
    const targetMap = {
      executive: executiveRef.current,
      methods: methodsRef.current,
      ops: opsRef.current,
    };
    const target = targetMap[storyId];
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const runSimulation = async () => {
    try {
      const { data } = await axios.post(apiPath('/api/simulate_marketing'), simInput);
      setSimResult(data || null);
    } catch (err) {
      console.error('Simulation failed:', err);
      alert('Simulation failed. Check backend terminal for details.');
    }
  };

  const updateTicket = (index, field, value) => {
    const tickets = [...newGame.tickets];
    tickets[index][field] = value;
    setNewGame({ ...newGame, tickets });
  };

  const updateMerch = (index, field, value) => {
    const merch = [...newGame.merch];
    merch[index][field] = value;
    setNewGame({ ...newGame, merch });
  };

  const addTicket = () => setNewGame({ ...newGame, tickets: [...newGame.tickets, { type: '', quantity: '', revenue: '' }] });
  const addMerch = () => setNewGame({ ...newGame, merch: [...newGame.merch, { item: '', quantity: '', total_revenue: '' }] });

  const removeTicket = (index) => {
    const tickets = [...newGame.tickets];
    tickets.splice(index, 1);
    setNewGame({ ...newGame, tickets: tickets.length ? tickets : [{ type: '', quantity: '', revenue: '' }] });
  };

  const removeMerch = (index) => {
    const merch = [...newGame.merch];
    merch.splice(index, 1);
    setNewGame({ ...newGame, merch: merch.length ? merch : [{ item: '', quantity: '', total_revenue: '' }] });
  };

  const handleGameSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(apiPath('/api/add_game'), newGame);
      setNewGame({
        game_date: '',
        opponent: '',
        attendance: '',
        competition: 'MLS Regular Season',
        venue: 'GEODIS Park',
        promotion: '',
        tickets: [{ type: '', quantity: '', revenue: '' }],
        merch: [{ item: '', quantity: '', total_revenue: '' }],
      });
      await loadDashboard();
      alert('Game added successfully');
    } catch (err) {
      console.error('Add game failed', err);
      alert(err?.response?.data?.error || 'Error adding game');
    }
  };

  const series = holisticAnalysis?.attendance_time_series || EMPTY_ARR;
  const kpis = holisticAnalysis?.kpis || EMPTY_OBJ;
  const stats = holisticAnalysis?.statistics?.descriptive || EMPTY_OBJ;
  const methods = holisticAnalysis?.methods || EMPTY_OBJ;
  const caveats = holisticAnalysis?.caveats || EMPTY_ARR;
  const context = holisticAnalysis?.context || EMPTY_OBJ;
  const workflow = holisticAnalysis?.workflow || EMPTY_ARR;
  const recommendations = holisticAnalysis?.recommendations || EMPTY_ARR;
  const associations = holisticAnalysis?.statistics?.associations || EMPTY_ARR;
  const thresholds = stats.thresholds || EMPTY_OBJ;
  const forecast = holisticAnalysis?.forecast || EMPTY_OBJ;
  const promotionEffects = holisticAnalysis?.promotion_effects || EMPTY_ARR;
  const promoOptions = promotionEffects.map((p) => p.promotion);
  const segments = holisticAnalysis?.segments || EMPTY_OBJ;
  const ticketMix = holisticAnalysis?.mix?.ticket_mix || EMPTY_ARR;
  const merchMix = holisticAnalysis?.mix?.merch_mix || EMPTY_ARR;
  const anomalies = holisticAnalysis?.anomalies || EMPTY_ARR;

  const selectedGameData = series.find((row) => row.game_id === Number(selectedGame));
  const selectedAttendance = Number(selectedGameData?.attendance || 0);
  const remainingSeats = Math.max(0, STADIUM_CAPACITY - selectedAttendance);

  const {
    attendanceTrendChart,
    forecastChart,
    promoChart,
    compAttendanceChart,
    compEfficiencyChart,
    ticketMixChart,
    merchMixChart,
    seatUtilizationChart,
  } = useDashboardCharts({
    series,
    thresholds,
    forecast,
    promotionEffects,
    segments,
    ticketMix,
    merchMix,
    selectedAttendance,
    remainingSeats,
  });

  const seasonHighlights = useMemo(() => {
    const highlights = [];
    if (series.length) {
      const topGame = [...series].sort((a, b) => b.attendance - a.attendance)[0];
      const lowGame = [...series].sort((a, b) => a.attendance - b.attendance)[0];
      if (topGame) {
        highlights.push(`Highest attendance: ${topGame.game_date} vs ${topGame.opponent} (${fmtInt(topGame.attendance)}).`);
      }
      if (lowGame) {
        highlights.push(`Lowest attendance: ${lowGame.game_date} vs ${lowGame.opponent} (${fmtInt(lowGame.attendance)}).`);
      }
    }
    if (promotionEffects.length) {
      const topPromo = promotionEffects[0];
      highlights.push(
        `Largest simulated promo uplift: ${topPromo.promotion} (+${fmtInt(topPromo.uplift_attendance)} attendees/game; observational estimate).`
      );
    }
    if (forecast?.predictions?.length) {
      const next = forecast.predictions[0];
      highlights.push(
        `Next-game baseline forecast: ${fmtInt(next.predicted_attendance)} (80% PI ${fmtInt(next.pi80_low)}-${fmtInt(next.pi80_high)}).`
      );
    }
    return highlights;
  }, [series, promotionEffects, forecast]);

  const summaryCards = [
    { label: 'Average Attendance', value: fmtInt(kpis.avg_attendance), note: `Median ${fmtInt(kpis.median_attendance)}` },
    { label: 'Total Revenue', value: fmtMoney(kpis.total_revenue), note: `${fmtMoney(kpis.revenue_per_attendee, 2)} per attendee` },
    { label: 'Average Occupancy', value: fmtPctRatio(kpis.avg_occupancy_rate), note: `Capacity ${fmtInt(holisticAnalysis?.meta?.stadium_capacity || STADIUM_CAPACITY)}` },
    { label: 'Trend per Game', value: fmtNum(kpis.attendance_trend_per_game, 2), note: 'OLS slope estimate' },
    { label: 'Forecast Fit (R²)', value: fmtNum(kpis.forecast_r_squared, 4), note: 'In-sample explanatory fit' },
    { label: 'Merch Units / 1K', value: fmtNum(kpis.merch_units_per_1000_attendees, 2), note: 'Commercial attachment proxy' },
  ];

  const statusTone = health?.status === 'ok' ? 'ok' : loadErrors.length ? 'error' : 'neutral';
  const storyTabs = [
    { id: 'executive', label: 'Executive Story' },
    { id: 'methods', label: 'Methods Lens' },
    { id: 'ops', label: 'Ops / Marketing Lens' },
  ];

  if (loading) {
    return (
      <div className="dashboard-shell">
        <div className="loading-card">
          <h1>NSC Data Science Dashboard</h1>
          <p>Loading analytics pipeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-shell">
      <HeroHeader
        context={context}
        health={health}
        holisticAnalysis={holisticAnalysis}
        loadErrors={loadErrors}
        statusTone={statusTone}
        storyTabs={storyTabs}
        activeStory={activeStory}
        onStoryJump={jumpToStory}
        seasonHighlights={seasonHighlights}
      />

      <ExecutiveOverviewSection
        summaryCards={summaryCards}
        executiveRef={executiveRef}
        workflow={workflow}
        attendanceTrendChart={attendanceTrendChart}
        chartBaseOptions={chartBaseOptions}
        stats={stats}
        thresholds={thresholds}
        kpis={kpis}
        associations={associations}
      />

      <ForecastSection
        forecastChart={forecastChart}
        chartBaseOptions={chartBaseOptions}
        forecast={forecast}
        kpis={kpis}
      />

      <PromotionSection
        methods={methods}
        promoChart={promoChart}
        chartBaseOptions={chartBaseOptions}
        promotionEffects={promotionEffects}
      />

      <SegmentationMixSection
        compAttendanceChart={compAttendanceChart}
        compEfficiencyChart={compEfficiencyChart}
        chartBaseOptions={chartBaseOptions}
        segments={segments}
        ticketMixChart={ticketMixChart}
        merchMixChart={merchMixChart}
        ticketMix={ticketMix}
        kpis={kpis}
      />

      <RiskDrilldownSection
        drilldownRef={drilldownRef}
        thresholds={thresholds}
        anomalies={anomalies}
        methods={methods}
        selectedGame={selectedGame}
        onSelectGame={setSelectedGame}
        series={series}
        seatUtilizationChart={seatUtilizationChart}
        chartBaseOptions={chartBaseOptions}
        gameDetail={gameDetail}
      />

      <MarketingSection
        opsRef={opsRef}
        runSimulation={runSimulation}
        simInput={simInput}
        setSimInput={setSimInput}
        promoOptions={promoOptions}
        methods={methods}
        simResult={simResult}
        recommendations={recommendations}
      />

      <MethodsSection methodsRef={methodsRef} methods={methods} caveats={caveats} />

      <DataEntrySection
        newGame={newGame}
        setNewGame={setNewGame}
        handleGameSubmit={handleGameSubmit}
        addTicket={addTicket}
        addMerch={addMerch}
        updateTicket={updateTicket}
        updateMerch={updateMerch}
        removeTicket={removeTicket}
        removeMerch={removeMerch}
      />

      <footer className="dashboard-footer">
        <p>Created by Charles Morrow</p>
      </footer>
    </div>
  );
}

export default Dashboard;
