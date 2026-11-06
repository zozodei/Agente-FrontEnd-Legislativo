import { useState } from 'react';
import { GOOGLE_G } from '@/styles/palette';
import { iniciarLoginGoogle } from '../google';
import { authErrorMessage } from '../validacion';
import styles from './GoogleButton.module.css';

/**
 * "Continuar con Google". Respeta la guía de marca de Google
 * (logo G sin alterar, texto estándar, fondo claro u oscuro neutro).
 */
export function GoogleButton({
  destino,
  texto = 'Continuar con Google',
}: {
  destino: string;
  texto?: string;
}) {
  const [yendo, setYendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    setError(null);
    setYendo(true);
    try {
      await iniciarLoginGoogle(destino);
      // Si todo va bien, el navegador ya está saliendo hacia Google.
    } catch (err) {
      setError(err instanceof Error && !('code' in err) ? err.message : authErrorMessage(err));
      setYendo(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.boton}
        onClick={onClick}
        disabled={yendo}
        aria-busy={yendo || undefined}
      >
        <GoogleG />
        <span>{yendo ? 'Abriendo Google…' : texto}</span>
      </button>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** Separador "o" entre Google y el formulario de email. */
export function SeparadorO() {
  return (
    <div className={styles.separador} role="separator" aria-label="o">
      <span aria-hidden>o con tu email</span>
    </div>
  );
}

function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden className={styles.logo}>
      <path
        fill={GOOGLE_G.rojo}
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill={GOOGLE_G.azul}
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill={GOOGLE_G.amarillo}
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill={GOOGLE_G.verde}
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
