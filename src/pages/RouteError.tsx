import { Link, useRouteError } from 'react-router-dom';

/** Error inesperado de render: pantalla mínima, sin depender del layout. */
export function RouteError() {
  const error = useRouteError() as Error | undefined;
  return (
    <div style={{ maxWidth: 640, margin: '15vh auto', padding: '0 24px' }}>
      <p
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          textTransform: 'uppercase',
          color: 'var(--danger)',
        }}
      >
        Error
      </p>
      <h1 style={{ fontSize: 'var(--text-3xl)', margin: '8px 0 16px' }}>
        Algo se rompió en esta pantalla.
      </h1>
      <p style={{ color: 'var(--ink-2)' }}>{error?.message ?? 'Error desconocido.'}</p>
      <p style={{ marginTop: 24 }}>
        <Link to="/">Volver al inicio</Link>
      </p>
    </div>
  );
}
