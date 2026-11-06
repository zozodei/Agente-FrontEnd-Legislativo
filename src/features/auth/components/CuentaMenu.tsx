import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../useAuth';
import styles from './CuentaMenu.module.css';

/** Zona de cuenta del encabezado: ingresar / crear cuenta, o el usuario y "Cerrar sesión". */
export function CuentaMenu({ onNavigate }: { onNavigate?: () => void }) {
  const { estado, usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [saliendo, setSaliendo] = useState(false);

  if (estado === 'cargando') return <span className={styles.placeholder} aria-hidden />;

  if (estado === 'anonimo') {
    return (
      <span className={styles.cuenta}>
        <NavLink
          to="/login"
          className={({ isActive }) =>
            [styles.link, isActive && styles.activo].filter(Boolean).join(' ')
          }
          onClick={onNavigate}
        >
          Ingresar
        </NavLink>
        <Link to="/registro" className={styles.cta} onClick={onNavigate}>
          Crear cuenta
        </Link>
      </span>
    );
  }

  const nombre = usuario?.nombre?.trim() || usuario?.email || 'Mi cuenta';
  const onSalir = async () => {
    setSaliendo(true);
    await logout();
    setSaliendo(false);
    onNavigate?.();
    navigate('/', { replace: true });
  };

  return (
    <span className={styles.cuenta}>
      <span className={styles.usuario} title={usuario?.email}>
        <span className={styles.inicial} aria-hidden>
          {nombre.charAt(0).toUpperCase()}
        </span>
        <span className={styles.nombre}>{nombre}</span>
      </span>
      <button type="button" className={styles.salir} onClick={onSalir} disabled={saliendo}>
        {saliendo ? 'Saliendo…' : 'Cerrar sesión'}
      </button>
    </span>
  );
}
