import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { fieldErrors } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Fields';
import { Spinner } from '@/components/ui/States';
import { AuthShell } from '@/features/auth/components/AuthShell';
import { GoogleButton } from '@/features/auth/components/GoogleButton';
import formStyles from '@/features/auth/components/AuthForm.module.css';
import { useAuth } from '@/features/auth/useAuth';
import { authErrorMessage, destinoSeguro, validarEmail } from '@/features/auth/validacion';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function LoginPage() {
  useDocumentTitle('Iniciar sesión');
  const { estado, login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const destino = destinoSeguro(params.get('redirect'));
  const estadoPrevio = (useLocation().state as { desde?: unknown } | null)?.desde;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [intentado, setIntentado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<unknown>(null);

  if (estado === 'cargando') return <Spinner label="Verificando tu sesión…" />;
  if (estado === 'autenticado' && !enviando)
    return <Navigate to={destino} replace state={estadoPrevio} />;

  const servidor = fieldErrors(error);
  const errores = {
    email: (intentado ? validarEmail(email) : null) ?? servidor.email,
    password: (intentado && !password ? 'Ingresá tu contraseña.' : null) ?? servidor.password,
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIntentado(true);
    setError(null);
    if (validarEmail(email) || !password) return;
    setEnviando(true);
    try {
      await login(email, password);
      navigate(destino, { replace: true, state: estadoPrevio });
    } catch (err) {
      setError(err);
      setEnviando(false);
    }
  };

  return (
    <AuthShell
      kicker="Tu cuenta"
      titulo={
        <>
          Volvé a <em>porotear.</em>
        </>
      }
      bajada="Ingresá para ver y editar tus poroteos."
      pie={
        <>
          ¿Todavía no tenés cuenta?{' '}
          <Link
            to={`/registro${params.get('redirect') ? `?redirect=${encodeURIComponent(destino)}` : ''}`}
          >
            Creá una gratis
          </Link>
          .
        </>
      }
    >
      <GoogleButton destino={destino} />
      <div className={formStyles.divisor} aria-hidden>
        o con email
      </div>
      <form className={formStyles.form} onSubmit={onSubmit} noValidate>
        {error !== null && Object.keys(servidor).length === 0 ? (
          <p className={formStyles.alerta} role="alert">
            {authErrorMessage(error)}
          </p>
        ) : null}
        <TextField
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          maxLength={254}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errores.email}
          autoFocus
          required
        />
        <TextField
          label="Contraseña"
          type={verPassword ? 'text' : 'password'}
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errores.password}
          required
          aside={
            <button
              type="button"
              className={formStyles.toggle}
              onClick={() => setVerPassword((v) => !v)}
              aria-pressed={verPassword}
            >
              {verPassword ? 'Ocultar' : 'Mostrar'}
            </button>
          }
        />
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={enviando}
          className={formStyles.submit}
        >
          Iniciar sesión
        </Button>
      </form>
    </AuthShell>
  );
}
