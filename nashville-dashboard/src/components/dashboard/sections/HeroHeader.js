import React from 'react';
import { KeyValueList } from '../Shared';
import { fmtInt } from '../utils';

function HeroHeader({
  context,
  health,
  holisticAnalysis,
  loadErrors,
  statusTone,
  storyTabs,
  activeStory,
  onStoryJump,
  seasonHighlights,
}) {
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Graduate Portfolio Project</p>
          <h1>{context.title || 'Nashville SC Data Science Dashboard'}</h1>
          <p className="hero-text">
            {context.portfolio_intent || 'End-to-end analytics product for sports demand, revenue, and decision support.'}
          </p>
          <div className="pill-row">
            <span className={`status-pill ${statusTone}`}>API {health?.status || (loadErrors.length ? 'error' : 'unknown')}</span>
            <span className="soft-pill">Games: {fmtInt(holisticAnalysis?.meta?.sample_size_games)}</span>
            <span className="soft-pill">Attendance + synthetic commercial data</span>
            <span className="soft-pill">Uncertainty-aware inference</span>
          </div>
          <div className={`status-panel ${loadErrors.length ? 'error-panel' : 'ok-panel'}`} role={loadErrors.length ? 'alert' : 'status'}>
            {loadErrors.length ? (
              <>
                <strong>Data load issue detected</strong>
                <ul>
                  {loadErrors.map((err, idx) => (
                    <li key={`err-${idx}`}>{err}</li>
                  ))}
                </ul>
                <p>
                  Start Flask first, then React. In development, the frontend uses the CRA proxy or `REACT_APP_API_BASE` if set.
                </p>
              </>
            ) : (
              <>
                <strong>Data pipeline healthy</strong>
                <p>
                  API responses loaded successfully. You can use this area for quick context while exploring the dashboard story tabs.
                </p>
              </>
            )}
          </div>
        </div>
        <div className="hero-side">
          <div className="hero-card">
            <h3>Business Questions</h3>
            <ul className="clean-list">
              {(context.business_questions || []).map((q, idx) => (
                <li key={`q-${idx}`}>{q}</li>
              ))}
            </ul>
          </div>
          <div className="hero-card">
            <h3>Data Provenance</h3>
            <KeyValueList
              items={[
                { label: 'Attendance', value: context.data_provenance?.attendance || 'Observed records' },
                { label: 'Promotions', value: context.data_provenance?.promotions || 'Simulated campaign labels' },
                { label: 'Merch / Ticket', value: context.data_provenance?.ticket_and_merch || 'Synthetic scenario data' },
                { label: 'API Health', value: health?.status || 'Unknown' },
                { label: 'Backend Port', value: health?.port_hint || '5000' },
              ]}
            />
            <p className="micro-note">
              Reader note: promotion assignments and commercial (ticket/merch) data are simulated for portfolio demonstration. Attendance values are the primary observed series.
            </p>
          </div>
          {!!seasonHighlights?.length && (
            <div className="hero-card">
              <h3>Season-Specific Highlights</h3>
              <ul className="clean-list">
                {seasonHighlights.map((item, idx) => (
                  <li key={`highlight-${idx}`}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      <section className="story-tabs">
        {storyTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`tab-btn ${activeStory === tab.id ? 'active' : ''}`}
            onClick={() => onStoryJump(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </section>
    </>
  );
}

export default HeroHeader;
