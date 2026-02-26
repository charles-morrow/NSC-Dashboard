import React from 'react';
import { Line } from 'react-chartjs-2';
import { MetricCard, Panel, KeyValueList } from '../Shared';
import { fmtInt, fmtMoney, fmtNum, fmtPctRatio, titleCase } from '../utils';

function ExecutiveOverviewSection({
  summaryCards,
  executiveRef,
  workflow,
  attendanceTrendChart,
  chartBaseOptions,
  stats,
  thresholds,
  kpis,
  associations,
}) {
  return (
    <>
      <section className="metric-grid jump-anchor" ref={executiveRef}>
        {summaryCards.map((card) => (
          <MetricCard key={card.label} label={card.label} value={card.value} note={card.note} />
        ))}
      </section>

      <Panel
        title="Data Science Workflow"
        subtitle="The dashboard is organized around a transparent analytical workflow from data integration to decision support."
      >
        <div className="workflow-grid">
          {workflow.map((item, idx) => (
            <article className="workflow-card" key={`${item.step}-${idx}`}>
              <span className="workflow-index">{idx + 1}</span>
              <h3>{item.step}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </Panel>

      <div className="two-col-layout">
        <Panel
          title="Exploratory Data Analysis"
          subtitle="Attendance trend with percentile-based risk/spike thresholds to contextualize season volatility."
        >
          <div className="chart-box lg"><Line data={attendanceTrendChart} options={chartBaseOptions} /></div>
          <div className="split-mini-grid">
            <div className="info-card">
              <h3>Attendance Distribution</h3>
              <KeyValueList
                items={[
                  { label: 'Mean', value: fmtInt(stats.attendance?.mean) },
                  { label: 'Median', value: fmtInt(stats.attendance?.median) },
                  { label: 'Std Dev', value: fmtInt(stats.attendance?.std_dev) },
                  { label: 'IQR', value: fmtInt(stats.attendance?.iqr) },
                  { label: 'P10-P90', value: `${fmtInt(stats.attendance?.p10)} to ${fmtInt(stats.attendance?.p90)}` },
                  { label: 'CV', value: fmtNum(stats.attendance?.coefficient_of_variation, 4) },
                ]}
              />
            </div>
            <div className="info-card">
              <h3>Demand Thresholds</h3>
              <KeyValueList
                items={[
                  { label: 'Risk Cutoff (P20)', value: fmtInt(thresholds.attendance_p20_demand_risk_cutoff) },
                  { label: 'Spike Cutoff (P80)', value: fmtInt(thresholds.attendance_p80_demand_spike_cutoff) },
                  { label: 'Avg Occupancy', value: fmtPctRatio(kpis.avg_occupancy_rate) },
                  { label: 'Revenue / Attendee', value: fmtMoney(kpis.revenue_per_attendee, 2) },
                ]}
              />
              <p className="micro-note">Percentile thresholds are triage rules for review, not causal labels.</p>
            </div>
          </div>
        </Panel>

        <Panel
          title="Association Diagnostics"
          subtitle="Correlation-based diagnostics help frame where demand and monetization move together."
        >
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Metric Pair</th>
                  <th>Correlation (r)</th>
                  <th>Interpretation</th>
                </tr>
              </thead>
              <tbody>
                {associations.map((row) => (
                  <tr key={row.metric_pair}>
                    <td>{titleCase(row.metric_pair)}</td>
                    <td>{fmtNum(row.correlation, 4)}</td>
                    <td><span className="tag">{row.interpretation}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="info-card alt">
            <h3>Interpretation Context</h3>
            <p>
              Correlation is used here as an exploratory co-movement diagnostic. It supports prioritization and hypothesis generation,
              but it does not identify causal effects.
            </p>
            <p>
              In a next iteration, this project could extend into multivariate regression or quasi-experimental designs to reduce confounding.
            </p>
          </div>
        </Panel>
      </div>
    </>
  );
}

export default ExecutiveOverviewSection;
