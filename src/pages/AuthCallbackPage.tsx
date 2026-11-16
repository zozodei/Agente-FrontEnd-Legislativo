import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Spinner } from '@/components/ui/States';
import { useAuth } from '@/features/auth/useAuth';
import { leerDestinoGoogle, mensajeErrorGoogle, parseCallbackGoogle } from '@/features/auth/google';
import { authErrorMessage, destinoAlEntrar, destinoSeguro } from '@/features/auth/validacion';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import styles from './AuthCallbackPage.module.css';

/**
 * Vuelta de Google: Supabase trae `?code=` (PKCE). El backend lo canjea con el
 * verifier de su cookie HttpOnly y deja las cookies de sesión; después se va al
 * destino que pedía el usuario (o a /). Ruta pública: no la envuelve RutaProtegida.
 */
export default function AuthCallbackPage() {
  useDocumentTitle('Completando tu inicio de sesión');
  const navigate = useNavigate();
  const location = useLocation();
  const { completarGoogle } = useAuth();
  // Se parsea una sola vez: después de leerlo, el código sale de la URL.
  const [resultado] = useState(() => parseCallbackGoogle(location.hash, location.search));
  const [errorAsync, setErrorAsync] = useState<string | null>(null);
  const error = resultado.tipo !== 'codigo' ? mensajeErrorGoogle(resultado) : errorAsync;
  const hecho = useRef(false);

  useEffect(() => {
    if (hecho.current) return; // StrictMode en dev monta los efectos dos veces
    hecho.current = true;
    const destino = destinoSeguro(leerDestinoGoogle(), '/');
    // El código (y cualquier token en el hash) sale de la URL y del historial.
    window.history.replaceState(null, '', window.location.pathname);
    if (resultado.tipo !== 'codigo') return;
    completarGoogle(resultado.code)
      .then((usuario) => navigate(destinoAlEntrar(usuario, destino), { replace: true }))
      .catch((err) => setErrorAsync(authErrorMessage(err)));
  }, [completarGoogle, navigate, resultado]);

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
