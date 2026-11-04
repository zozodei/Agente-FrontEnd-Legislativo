import { Suspense, useState } from 'react';
import { NavLink, Outlet, ScrollRestoration } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';
import { Skeleton } from '@/components/ui/States';
import styles from './AppLayout.module.css';

const NAV = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/diputados', label: 'Diputados' },
  { to: '/votaciones', label: 'Votaciones' },
  { to: '/poroteos', label: 'Poroteo' },
];

const THEME_LABEL = {
  system: 'Tema: sistema',
  light: 'Tema: claro',
  dark: 'Tema: oscuro',
} as const;

export function AppLayout() {
  const { theme, cycle } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className={styles.shell}>
      <ScrollRestoration />
      <a href="#contenido" className="skip-link">
        Saltar al contenido
      </a>

      <header className={styles.masthead}>
        <div className={styles.mastheadInner}>
          <NavLink to="/" className={styles.brand} aria-label="Poroteo Legislativo, inicio">
            <BrandMark />
            <span className={styles.brandText}>
              <span className={styles.brandName}>Poroteo</span>
              <span className={styles.brandSub}>Cámara de Diputados</span>
            </span>
          </NavLink>

          <button
            type="button"
            className={styles.menuButton}
            aria-expanded={menuOpen}
            aria-controls="nav-principal"
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? 'Cerrar' : 'Menú'}
          </button>

          <nav
            id="nav-principal"
            className={styles.nav}
            data-open={menuOpen || undefined}
            aria-label="Principal"
          >
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  [styles.navLink, isActive && styles.navActive].filter(Boolean).join(' ')
                }
              >
                {item.label}
              </NavLink>
            ))}
            <button
              type="button"
              className={styles.theme}
              onClick={cycle}
              title={THEME_LABEL[theme]}
            >
              <ThemeIcon theme={theme} />
              <span className="visually-hidden">{THEME_LABEL[theme]}</span>
            </button>
          </nav>
        </div>
      </header>

      <main id="contenido" className={styles.main}>
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div>
            <p className={styles.footerTitle}>Poroteo Legislativo</p>
            <p className={styles.footerText}>
              Prototipo de{' '}
              <a href="https://democraciaenred.org" target="_blank" rel="noreferrer">
                Democracia en Red
              </a>
              , desarrollado en el programa Hola Mundo Profesional. Las estimaciones de un poroteo
              son escenarios, no predicciones oficiales.
            </p>
          </div>
          <div>
            <p className={styles.footerTitle}>Fuente de los datos</p>
            <p className={styles.footerText}>
              Votaciones nominales de la HCDN procesadas por{' '}
              <a href="https://comovoto.dev.ar" target="_blank" rel="noreferrer">
                ¿Cómo Votó?
              </a>{' '}
              de Rodrigo Quiroga (
              <a href="https://github.com/rquiroga7/Como_voto" target="_blank" rel="noreferrer">
                repositorio
              </a>
              ). Alineamientos y agrupaciones son criterios de esa fuente.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function PageFallback() {
  return (
    <div className={styles.fallback} aria-busy="true">
      <Skeleton width="30%" height={14} />
      <Skeleton width="70%" height={56} />
      <Skeleton width="50%" height={18} />
    </div>
  );
}

function BrandMark() {
  // Cinco porotos en arco: la idea de "contar" votos.
  return (
    <svg viewBox="0 0 40 24" className={styles.brandMark} aria-hidden>
      <circle cx="5" cy="20" r="3.2" />
      <circle cx="10" cy="9.5" r="3.2" />
      <circle cx="20" cy="4.5" r="3.2" className={styles.brandAccent} />
      <circle cx="30" cy="9.5" r="3.2" />
      <circle cx="35" cy="20" r="3.2" />
    </svg>
  );
}

function ThemeIcon({ theme }: { theme: 'system' | 'light' | 'dark' }) {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden>
      <circle cx="10" cy="10" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      {theme === 'dark' && <path d="M10 3.5a6.5 6.5 0 0 0 0 13z" fill="currentColor" />}
      {theme === 'light' && <circle cx="10" cy="10" r="3" fill="currentColor" />}
      {theme === 'system' && <path d="M10 3.5v13" stroke="currentColor" strokeWidth="1.5" />}
    </svg>
  );
}
