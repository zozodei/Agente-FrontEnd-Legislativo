import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { fieldErrors } from '@/api/client';
import { Button, ButtonLink } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Fields';
import { SesionPendiente } from '@/features/auth/SesionPendiente';
import { AuthShell } from '@/features/auth/components/AuthShell';
import formStyles from '@/features/auth/components/AuthForm.module.css';
import { useAuth } from '@/features/auth/useAuth';
import {
  destinoAlEntrar,
  authErrorMessage,
  destinoSeguro,
  validarEmail,
  validarNombre,
  validarPasswordNueva,
} from '@/features/auth/validacion';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function RegistroPage() {
  useDocumentTitle('Crear cuenta');
  const { estado, usuario, registrar } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const destino = destinoSeguro(params.get('redirect'));

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [intentado, setIntentado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [confirmarEmail, setConfirmarEmail] = useState<string | null>(null);

  if (estado === 'cargando' || estado === 'error') return <SesionPendiente />;
  if (estado === 'autenticado' && !enviando)
    return <Navigate to={destinoAlEntrar(usuario, destino)} replace />;

  if (confirmarEmail) {
    return (
      <AuthShell
        kicker="Último paso"
        titulo={
          <>
            Revisá tu <em>email.</em>
          </>
        }
      >
        <div className={formStyles.ok} role="status">
          <h2 className={formStyles.okTitulo}>Te mandamos un link de confirmación</h2>
          <p>
            Lo enviamos a <strong>{confirmarEmail}</strong>. Abrilo para activar tu cuenta y después
            iniciá sesión. Si no lo ves, revisá la carpeta de spam.
          </p>
          <div>
            <ButtonLink to="/login" variant="primary">
              Ir a iniciar sesión
            </ButtonLink>
          </div>
        </div>
      </AuthShell>
    );
  }

  const servidor = fieldErrors(error);
  const local = {
    nombre: validarNombre(nombre),
    email: validarEmail(email),
    password: validarPasswordNueva(password),
    confirmar: confirmar !== password ? 'Las contraseñas no coinciden.' : null,
  };
  const errores = {
    nombre: (intentado ? local.nombre : null) ?? servidor.nombre,
    email: (intentado ? local.email : null) ?? servidor.email,
    password: (intentado ? local.password : null) ?? servidor.password,
    confirmar: intentado ? local.confirmar : null,
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIntentado(true);
    setError(null);
    if (Object.values(local).some(Boolean)) return;
    setEnviando(true);
    try {
      const res = await registrar({ nombre: nombre.trim(), email: email.trim(), password });
      if (res.requiereConfirmacion || !res.sesion) {
        setConfirmarEmail(res.usuario.email || email.trim());
        setEnviando(false);
      } else {
        navigate(destinoAlEntrar(res.usuario, destino), { replace: true });
      }
    } catch (err) {
      setError(err);
      setEnviando(false);
    }
  };

  return (
    <AuthShell
      kicker="Crear cuenta"
      titulo={
        <>
          Tu primer <em>poroteo</em> empieza acá.
        </>
      }
      bajada="Es gratis. Tus poroteos quedan guardados en tu cuenta."
      pie={
        <>
          ¿Ya tenés cuenta? <Link to="/login">Iniciá sesión</Link>.
        </>
      }
    >
      <form className={formStyles.form} onSubmit={onSubmit} noValidate>
        {error !== null && Object.keys(servidor).length === 0 ? (
          <p className={formStyles.alerta} role="alert">
            {authErrorMessage(error)}
          </p>
        ) : null}
        <TextField
          label="Nombre"
          name="nombre"
          autoComplete="name"
          maxLength={120}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          error={errores.nombre}
          hint="Aparece como autor de tus poroteos."
          autoFocus
          required
        />
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
          required
        />
        <TextField
          label="Contraseña"
          type={verPassword ? 'text' : 'password'}
          name="password"
          autoComplete="new-password"
          maxLength={72}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errores.password}
          hint="Entre 8 y 72 caracteres."
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
        <TextField
          label="Repetí la contraseña"
          type={verPassword ? 'text' : 'password'}
          name="confirmar"
          autoComplete="new-password"
          maxLength={72}
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
          error={errores.confirmar}
          required
        />
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={enviando}
          className={formStyles.submit}
        >
          Crear cuenta
        </Button>
      </form>
    </AuthShell>
  );
}
