import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ButtonLink } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/States';
import { AuthShell } from '@/features/auth/components/AuthShell';
import formStyles from '@/features/auth/components/AuthForm.module.css';
import { GoogleButton } from '@/features/auth/components/GoogleButton';
import { leerRetorno, tomarPendiente } from '@/features/auth/google';
import { useAuth } from '@/features/auth/useAuth';
import { authErrorMessage, destinoSeguro } from '@/features/auth/validacion';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { Usuario } from '@/types';

/*
 * Un código de Google sirve una sola vez. En desarrollo React monta los
 * efectos dos veces (StrictMode): esta caché hace que ambos esperen el mismo canje.
 */
const canjes = new Map<string, Promise<{ usuario: Usuario; destino: string }>>();

/** Vuelta del login con Google: canjea el código por la sesión y sigue de largo. */
export default function AuthCallbackPage() {
  useDocumentTitle('Iniciando sesión');
  const { loginConGoogle } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { code, error: errorGoogle, errorDescripcion } = leerRetorno(location);
    let vigente = true;

    let canje = code ? canjes.get(code) : undefined;
    if (!canje) {
      const pendiente = tomarPendiente();
      if (errorGoogle || !code) {
        canje = Promise.reject(
          new Error(
            errorGoogle === 'access_denied'
              ? 'Cancelaste el inicio con Google.'
              : errorDescripcion || 'Google no devolvió un código de acceso.',
          ),
        );
      } else if (!pendiente) {
        canje = Promise.reject(
          new Error(
            'Este intento de inicio de sesión venció o se abrió en otra pestaña. Probá de nuevo.',
          ),
        );
      } else {
        canje = loginConGoogle(code, pendiente.codeVerifier).then((usuario) => ({
          usuario,
          destino: destinoSeguro(pendiente.destino),
        }));
      }
      if (code) canjes.set(code, canje);
    }

    canje.then(
      ({ destino }) => vigente && navigate(destino, { replace: true }),
      (err: unknown) => {
        if (!vigente) return;
        setError(err instanceof Error && !('code' in err) ? err.message : authErrorMessage(err));
        // Sacamos el código de la URL: no sirve más y no queremos que quede en el historial.
        window.history.replaceState(null, '', '/auth/callback');
      },
    );
    return () => {
      vigente = false;
    };
    // Solo al llegar: el canje no debe repetirse si cambia algo después.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!error) return <Spinner label="Conectando con Google…" />;

  return (
    <AuthShell
      kicker="Inicio con Google"
      titulo={
        <>
          No pudimos <em>entrar.</em>
        </>
      }
    >
      <div className={formStyles.form}>
        <p className={formStyles.alerta} role="alert">
          {error}
        </p>
        <GoogleButton destino="/poroteos" texto="Probar de nuevo con Google" />
        <ButtonLink to="/login" variant="ghost">
          Entrar con email y contraseña
        </ButtonLink>
        <p>
          <Link to="/">Volver al inicio</Link>
        </p>
      </div>
    </AuthShell>
  );
}
