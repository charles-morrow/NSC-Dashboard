import React from 'react';
import { Pie } from 'react-chartjs-2';
import { Panel } from '../Shared';
import { fmtInt, fmtMoney } from '../utils';

function RiskDrilldownSection({
  drilldownRef,
  thresholds,
  anomalies,
  methods,
  selectedGame,
  onSelectGame,
  series,
  seatUtilizationChart,
  chartBaseOptions,
  gameDetail,
}) {
  return (
    <div className="two-col-layout" ref={drilldownRef}>
      <Panel
        title="Risk Monitoring and Anomaly Triage"
        subtitle="Bottom/top attendance quintiles are flagged to support post-match diagnostics and intervention design."
      >
        <div className="info-banner">
          <span>Demand Risk cutoff (P20): <strong>{fmtInt(thresholds.attendance_p20_demand_risk_cutoff)}</strong></span>
          <span>Demand Spike cutoff (P80): <strong>{fmtInt(thresholds.attendance_p80_demand_spike_cutoff)}</strong></span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Opponent</th>
                <th>Attendance</th>
                <th>Total Revenue</th>
                <th>Tag</th>
              </tr>
            </thead>
            <tbody>
              {anomalies.map((a) => (
                <tr key={`${a.game_id}-${a.tag}`}>
                  <td>{a.game_date}</td>
                  <td>{a.opponent}</td>
                  <td>{fmtInt(a.attendance)}</td>
                  <td>{fmtMoney(a.total_revenue)}</td>
                  <td><span className={`tag ${a.tag === 'Demand Risk' ? 'warn' : 'good'}`}>{a.tag}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="info-card alt">
          <h3>Interpretation</h3>
          <p>{methods.anomaly_flagging?.interpretation}</p>
        </div>
      </Panel>

      <Panel
        title="Game-Level Operational Drilldown"
        subtitle="Inspect ticket and merch line items for a selected match and compare seat utilization."
      >
        <div className="control-row">
          <label>
            Select a game
            <select value={selectedGame} onChange={(e) => onSelectGame(e.target.value)}>
              <option value="">Choose a match</option>
              {series.map((row) => (
                <option key={row.game_id} value={row.game_id}>{row.game_date} vs {row.opponent}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="chart-box"><Pie data={seatUtilizationChart} options={chartBaseOptions} /></div>
        {gameDetail ? (
          <div className="split-mini-grid">
            <div className="info-card">
              <h3>Ticket Lines</h3>
              <p className="micro-note"><strong>Promotion:</strong> {gameDetail.promotion}</p>
              <ul className="clean-list">
                {gameDetail.tickets.map((t, i) => (
                  <li key={`${t.type}-${i}`}>{t.type}: {fmtInt(t.quantity)} ({fmtMoney(t.revenue)})</li>
                ))}
              </ul>
            </div>
            <div className="info-card alt">
              <h3>Merch Lines</h3>
              <ul className="clean-list">
                {gameDetail.merch.map((m, i) => (
                  <li key={`${m.item}-${i}`}>{m.item}: {fmtInt(m.quantity)} ({fmtMoney(m.total_revenue)})</li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="empty-card">Select a match to inspect game-level operations.</div>
        )}
      </Panel>
    </div>
  );
}

export default RiskDrilldownSection;
