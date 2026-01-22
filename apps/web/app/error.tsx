'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.href = '/';
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <html>
      <body className="shell">
        <div className="card">
          <p className="eyebrow">Interne fout</p>
          <h1>Er ging iets mis</h1>
          <p className="lede">We leiden je zo terug naar de startpagina.</p>
          <p className="muted">Details: {error.message}</p>
          <div className="row" style={{ marginTop: '1rem', gap: '0.75rem' }}>
            <button className="button" onClick={reset}>
              Probeer opnieuw
            </button>
            <a className="link-btn" href="/">
              Naar start
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
