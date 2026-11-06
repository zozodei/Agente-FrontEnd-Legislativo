import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Button, ButtonLink } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/useAuth';
import styles from './Backoffice.module.css';

export function BackofficeLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [saliendo, setSaliendo] = useState(false);
  return (
    <section className={styles.shell} aria-label="Backoffice">
      <div className={styles.masthead}>
        <div>
          <span className={styles.kicker}>demoIA · Administración</span>
          <p className={styles.title}>Backoffice</p>
          <p>Consulta de la plataforma</p>
        </div>
        <div className={styles.actions}>
          <ButtonLink to="/poroteos">Volver a la aplicación</ButtonLink>
          <Button
            loading={saliendo}
            onClick={async () => {
              setSaliendo(true);
              await logout();
              navigate('/login', { replace: true });
            }}
          >
            Cerrar sesión
          </Button>
        </div>
      </div>
      <nav className={styles.nav} aria-label="Secciones del backoffice">
        <NavLink to="/backoffice" end>
          Inicio
        </NavLink>
        <NavLink to="/backoffice/poroteos">Poroteos</NavLink>
        <NavLink to="/backoffice/cuentas">Cuentas</NavLink>
      </nav>
      <Outlet />
    </section>
  );
}
