import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Panel } from '../Shared';
import { fmtInt, fmtMoney, fmtNum, fmtPctValue } from '../utils';

function PromotionSection({ methods, promoChart, chartBaseOptions, promotionEffects }) {
  return (
    <Panel
      title="Promotion Inference"
      subtitle="Observed attendance uplift by promotion type, with bootstrap confidence intervals and permutation-test p-values."
    >
      <div className="info-card warn-card">
        <h3>Simulation Disclosure</h3>
        <p>
          Promotion names and game-level promotion assignments are simulated to create a realistic portfolio scenario. Treat these uplift estimates as a methods demonstration, not real campaign performance.
        </p>
      </div>
      <div className="three-col-layout">
        <div className="chart-box"><Bar data={promoChart} options={chartBaseOptions} /></div>
        <div className="info-card alt">
          <h3>Method</h3>
          <p>{methods.promotion_inference?.method}</p>
          <h3>Why it matters</h3>
          <p>{methods.promotion_inference?.why_it_is_used}</p>
          <h3>Interpretation</h3>
          <p>{methods.promotion_inference?.interpretation}</p>
        </div>
        <div className="info-card">
          <h3>Decision Guidance</h3>
          <ul className="clean-list">
            <li>Use uplift + uncertainty together, not uplift alone.</li>
            <li>Prioritize promotions with both practical lift and operational feasibility.</li>
            <li>Treat results as observational and validate with controlled follow-up tests when possible.</li>
          </ul>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Promotion</th>
              <th>Games</th>
              <th>Uplift</th>
              <th>Uplift %</th>
              <th>80% CI</th>
              <th>p-value</th>
              <th>Modeled Revenue Lift</th>
              <th>Raw Avg Revenue Diff</th>
            </tr>
          </thead>
          <tbody>
            {promotionEffects.map((row) => (
              <tr key={row.promotion}>
                <td>{row.promotion}</td>
                <td>{row.n_games_with_promo}</td>
                <td>{fmtInt(row.uplift_attendance)}</td>
                <td>{fmtPctValue(row.uplift_pct, 2)}</td>
                <td>{fmtInt(row.ci80_low)} to {fmtInt(row.ci80_high)}</td>
                <td>{fmtNum(row.permutation_p_value, 4)}</td>
                <td>{fmtMoney(row.modeled_revenue_lift_from_uplift)}</td>
                <td>{fmtMoney(row.raw_avg_total_revenue_diff)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export default PromotionSection;
