import React from 'react';
import { Line } from 'react-chartjs-2';
import { Panel } from '../Shared';
import { fmtInt, fmtNum } from '../utils';

function ForecastSection({ forecastChart, chartBaseOptions, forecast, kpis }) {
  return (
    <div className="two-col-layout">
      <Panel
        title="Forecasting and Uncertainty"
        subtitle="Interpretable OLS baseline with 3-game outlook and 80% prediction intervals for planning under uncertainty."
      >
        <div className="chart-box lg"><Line data={forecastChart} options={chartBaseOptions} /></div>
        <div className="table-wrap compact">
          <table>
            <thead>
              <tr>
                <th>Future Game #</th>
                <th>Forecast</th>
                <th>80% PI</th>
              </tr>
            </thead>
            <tbody>
              {(forecast.predictions || []).map((p) => (
                <tr key={p.game_number}>
                  <td>{p.game_number}</td>
                  <td>{fmtInt(p.predicted_attendance)}</td>
                  <td>{fmtInt(p.pi80_low)} - {fmtInt(p.pi80_high)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        title="Model Framing"
        subtitle="Why a simple model? This portfolio intentionally emphasizes interpretability and communication."
        right={<span className="soft-pill">R² = {fmtNum(kpis.forecast_r_squared, 4)}</span>}
      >
        <div className="narrative-stack">
          <div className="info-card">
            <h3>Why this forecast model?</h3>
            <p>
              A linear trend baseline is easy to audit and explain. It demonstrates model-building discipline, residual uncertainty handling,
              and decision relevance without hiding assumptions inside a black-box model.
            </p>
          </div>
          <div className="info-card alt">
            <h3>How to read the results</h3>
            <ul className="clean-list">
              <li><strong>Slope per game:</strong> directional change in attendance across the season.</li>
              <li><strong>R²:</strong> in-sample fit only; not a guarantee of future predictive accuracy.</li>
              <li><strong>Prediction interval:</strong> planning range for staffing, inventory, and media pacing.</li>
            </ul>
          </div>
        </div>
      </Panel>
    </div>
  );
}

export default ForecastSection;
