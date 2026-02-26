import React from 'react';
import { Panel } from '../Shared';
import { titleCase } from '../utils';

function MethodsSection({ methodsRef, methods, caveats }) {
  return (
    <div className="jump-anchor" ref={methodsRef}>
      <Panel
        title="Methods, Assumptions, and Caveats"
        subtitle="Portfolio emphasis: statistical transparency, interpretation discipline, and uncertainty communication."
      >
        <div className="method-grid">
          {Object.entries(methods).map(([key, meta]) => (
            <article key={key} className="method-card">
              <h3>{titleCase(key)}</h3>
              <p><strong>Method:</strong> {meta.method}</p>
              <p><strong>Why Used:</strong> {meta.why_it_is_used}</p>
              <p><strong>Interpretation:</strong> {meta.interpretation}</p>
            </article>
          ))}
        </div>
        <div className="caveat-box">
          <h3>Analytical Caveats</h3>
          <ul className="clean-list">
            {caveats.map((note, idx) => <li key={`caveat-${idx}`}>{note}</li>)}
          </ul>
        </div>
      </Panel>
    </div>
  );
}

export default MethodsSection;
