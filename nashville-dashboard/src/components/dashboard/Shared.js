import React from 'react';

export function MetricCard({ label, value, note }) {
  return (
    <article className="metric-card">
      <p className="metric-label">{label}</p>
      <h3 className="metric-value">{value}</h3>
      {note ? <p className="metric-note">{note}</p> : null}
    </article>
  );
}

export function Panel({ title, subtitle, children, right }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p className="panel-subtitle">{subtitle}</p> : null}
        </div>
        {right ? <div className="panel-right">{right}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function KeyValueList({ items = [] }) {
  return (
    <div className="kv-list">
      {items.map((item) => (
        <div className="kv-row" key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  );
}
