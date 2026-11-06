import { useState } from 'react';
import { errorMessage } from '@/api/client';
import { useAuth } from '../useAuth';
import styles from './GoogleButton.module.css';

/**
 * "Continuar con Google": pide la URL al backend y redirige con navegación
 * completa (Google → /auth/callback → /). Si ya hay sesión, no se muestra.
 */
export function GoogleButton({ destino }: { destino?: string }) {
  const { estado, iniciarGoogle } = useAuth();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (estado !== 'anonimo') return null;

  const onClick = async () => {
    setCargando(true);
    setError(null);
    try {
      const url = await iniciarGoogle(destino);
      window.location.href = url;
    } catch (err) {
      setError(errorMessage(err));
      setCargando(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.boton}
        onClick={onClick}
        disabled={cargando}
        aria-busy={cargando || undefined}
      >
        <LogoGoogle />
        {cargando ? 'Redirigiendo a Google…' : 'Continuar con Google'}
      </button>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** La "G" multicolor de Google (colores de marca, no del tema). */
function LogoGoogle() {
  return (
    <svg className={styles.logo} viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  );
}
