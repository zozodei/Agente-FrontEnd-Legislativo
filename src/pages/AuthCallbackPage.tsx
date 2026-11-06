import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Spinner } from '@/components/ui/States';
import { useAuth } from '@/features/auth/useAuth';
import { leerDestinoGoogle, mensajeErrorGoogle, parseCallbackGoogle } from '@/features/auth/google';
import { authErrorMessage, destinoSeguro } from '@/features/auth/validacion';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import styles from './AuthCallbackPage.module.css';

/**
 * Volvé de Google: los tokens vienen en el hash (#access_token=…), se
 * guardan, se validan con GET /auth/me y se redirige al destino que pedía
 * el usuario (o a /). Ruta pública: no la envuelve RutaProtegida.
 */
export default function AuthCallbackPage() {
  useDocumentTitle('Completando tu inicio de sesión');
  const navigate = useNavigate();
  const location = useLocation();
  const { entrarConTokens } = useAuth();
  // El parseo es puro: error/vacío se deriva en el render; el efecto solo
  // hace el trabajo asíncrono (guardar + validar + navegar).
  const resultado = parseCallbackGoogle(location.hash, location.search);
  const [errorAsync, setErrorAsync] = useState<string | null>(null);
  const error = resultado.tipo !== 'sesion' ? mensajeErrorGoogle(resultado) : errorAsync;
  const hecho = useRef(false);

  useEffect(() => {
    if (hecho.current) return; // StrictMode en dev monta los efectos dos veces
    hecho.current = true;
    const destino = destinoSeguro(leerDestinoGoogle(), '/');
    // Los tokens salen de la URL cuanto antes (no quedan en el historial).
    window.history.replaceState(null, '', window.location.pathname);
    if (resultado.tipo !== 'sesion') return;
    entrarConTokens(resultado.sesion)
      .then(() => navigate(destino, { replace: true }))
      .catch((err) => setErrorAsync(authErrorMessage(err)));
  }, [entrarConTokens, navigate, resultado]);

  if (error) {
    return (
      <div className={styles.centro}>
        <p className={styles.alerta} role="alert">
          {error}
        </p>
        <p className={styles.acciones}>
          <Link to="/login">Volver a iniciar sesión</Link>
          <span aria-hidden>·</span>
          <Link to="/">Ir al inicio</Link>
        </p>
      </div>
    );
  }

  return (
    <div className={styles.centro}>
      <Spinner label="Completando tu inicio de sesión…" />
    </div>
  );
}
