'use client';

/**
 * Root-level error boundary (Next.js). Catches errors thrown by the ROOT layout
 * itself — the one place `error.tsx` cannot reach — and therefore must render its
 * own <html>/<body>. Segment/page errors are handled by `app/error.tsx`; this is
 * the last-resort 500 surface. Never exposes the raw error to the user.
 */

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console -- dev-only diagnostic; replace with logger sink in prod
    if (process.env.NODE_ENV === 'development') console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          padding: '1.5rem',
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <h1 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Something went wrong</h1>
        <p style={{ maxWidth: '28rem', fontSize: '0.875rem', color: '#6b7280' }}>
          A critical error occurred while loading the console. You can try again; if it persists,
          contact your administrator.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            borderRadius: '0.375rem',
            border: '1px solid #d1d5db',
            padding: '0.5rem 1rem',
            fontSize: '0.875rem',
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
