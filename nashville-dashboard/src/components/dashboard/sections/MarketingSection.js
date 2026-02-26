import React from 'react';
import { Panel, KeyValueList } from '../Shared';
import { fmtInt, fmtMoney, fmtPctRatio } from '../utils';

function MarketingSection({
  opsRef,
  runSimulation,
  simInput,
  setSimInput,
  promoOptions,
  methods,
  simResult,
  recommendations,
}) {
  return (
    <div className="two-col-layout jump-anchor" ref={opsRef}>
      <Panel
        title="Marketing Scenario Lab"
        subtitle="Scenario-based decision support that converts historical analytics into budget and ROI planning."
        right={<button type="button" className="primary-btn" onClick={runSimulation}>Run Simulation</button>}
      >
        <div className="form-grid">
          <label>
            Promotion
            <select value={simInput.promotion} onChange={(e) => setSimInput({ ...simInput, promotion: e.target.value })}>
              <option value="">Blended historical average</option>
              {promoOptions.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <label>
            Base Attendance
            <input type="number" value={simInput.base_attendance} onChange={(e) => setSimInput({ ...simInput, base_attendance: Number(e.target.value) })} />
          </label>
          <label>
            Media Spend ($)
            <input type="number" value={simInput.media_spend} onChange={(e) => setSimInput({ ...simInput, media_spend: Number(e.target.value) })} />
          </label>
          <label>
            Variable Cost / Incremental Fan ($)
            <input type="number" value={simInput.variable_cost_per_incremental_fan} onChange={(e) => setSimInput({ ...simInput, variable_cost_per_incremental_fan: Number(e.target.value) })} />
          </label>
        </div>
        <div className="info-card alt">
          <h3>Method Context</h3>
          <p>{methods.marketing_simulator?.method}</p>
          <p className="micro-note">{methods.marketing_simulator?.interpretation}</p>
        </div>
      </Panel>

      <Panel
        title="Simulation Output and Recommendations"
        subtitle="Outputs combine modeled uplift assumptions with your budget and variable cost inputs."
      >
        {simResult ? (
          <>
            <div className="split-mini-grid">
              <div className="info-card">
                <h3>Output Metrics</h3>
                <KeyValueList
                  items={[
                    { label: 'Projected Attendance', value: fmtInt(simResult.outputs.projected_attendance) },
                    { label: 'Incremental Revenue', value: fmtMoney(simResult.outputs.incremental_revenue, 2) },
                    { label: 'Campaign Cost', value: fmtMoney(simResult.outputs.total_campaign_cost, 2) },
                    { label: 'Incremental Profit', value: fmtMoney(simResult.outputs.incremental_profit, 2) },
                    { label: 'ROI', value: simResult.outputs.roi === null ? 'N/A' : fmtPctRatio(simResult.outputs.roi) },
                  ]}
                />
              </div>
              <div className="info-card alt">
                <h3>Break-even Analysis</h3>
                <KeyValueList
                  items={[
                    { label: 'Margin / Incremental Fan', value: fmtMoney(simResult.assumptions.margin_per_incremental_fan, 2) },
                    { label: 'Break-even Uplift', value: simResult.outputs.break_even_uplift_attendance ?? 'N/A' },
                    { label: 'Break-even Media Spend', value: simResult.outputs.break_even_media_spend === null ? 'N/A' : fmtMoney(simResult.outputs.break_even_media_spend, 2) },
                    {
                      label: 'Uplift 80% Range',
                      value: simResult.assumptions.expected_uplift_ci80_low == null
                        ? 'N/A'
                        : `${fmtInt(simResult.assumptions.expected_uplift_ci80_low)} to ${fmtInt(simResult.assumptions.expected_uplift_ci80_high)}`,
                    },
                  ]}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="empty-card">Run the simulator to produce an uncertainty-aware campaign economics estimate.</div>
        )}

        <div className="recommendation-list">
          <h3>Analyst Recommendations</h3>
          {recommendations.length ? recommendations.map((rec, idx) => (
            <article className="recommendation-card" key={`${rec.category}-${idx}`}>
              <div className="recommendation-meta">
                <span className="tag">{rec.category}</span>
                <span className={`tag ${rec.priority === 'High' ? 'warn' : 'good'}`}>{rec.priority}</span>
              </div>
              <p><strong>{rec.recommendation}</strong></p>
              <p className="micro-note">{rec.rationale}</p>
            </article>
          )) : <p className="micro-note">Recommendations populate from the holistic analysis payload.</p>}
        </div>
      </Panel>
    </div>
  );
}

export default MarketingSection;
