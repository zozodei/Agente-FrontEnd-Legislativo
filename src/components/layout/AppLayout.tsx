import { Suspense, useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet, ScrollRestoration, useMatches } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';
import { Skeleton } from '@/components/ui/States';
import { BrandMark, Wordmark } from './Brand';
import styles from './AppLayout.module.css';

const NAV = [
  { to: '/camara', label: 'La Cámara' },
  { to: '/diputados', label: 'Diputados' },
  { to: '/votaciones', label: 'Votaciones' },
  { to: '/poroteos', label: 'Mis poroteos' },
];

const THEME_LABEL = {
  system: 'Tema: sistema',
  light: 'Tema: claro',
  dark: 'Tema: oscuro',
} as const;

/**
 * `cuenta`: zona de sesión del encabezado. Se inyecta desde el router para que
 * components/ no dependa de features/ (regla de dependencias).
 */
export function AppLayout({ cuenta }: { cuenta?: (cerrarMenu: () => void) => ReactNode }) {
  const { theme, cycle } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const matches = useMatches();
  const bleed = matches.some((m) => (m.handle as { bleed?: boolean } | undefined)?.bleed);

  return (
    <div className={styles.shell}>
      <ScrollRestoration />
      <a href="#contenido" className="skip-link">
        Saltar al contenido
      </a>

      <header className={styles.masthead}>
        <div className={styles.franja} aria-hidden />
        <div className={styles.mastheadInner}>
          <NavLink to="/" className={styles.brand} aria-label="demoIA, inicio">
            <BrandMark className={styles.brandMark} />
            <span className={styles.brandText}>
              <Wordmark className={styles.brandName} />
              <span className={styles.brandSub}>Poroteo legislativo</span>
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
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  [styles.navLink, isActive && styles.navActive].filter(Boolean).join(' ')
                }
              >
                {item.label}
              </NavLink>
            ))}
            <span className={styles.navSep} aria-hidden />
            {cuenta?.(() => setMenuOpen(false))}
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

      <main id="contenido" className={styles.main} data-bleed={bleed || undefined}>
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </main>

      <footer className={styles.footer}>
        <div className={styles.franja} aria-hidden />
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <Link to="/" className={styles.footerLogo} aria-label="demoIA, inicio">
              <BrandMark className={styles.brandMark} />
              <Wordmark className={styles.brandName} />
            </Link>
            <p className={styles.footerText}>
              Una herramienta abierta para anticipar cómo vota el Congreso. Las estimaciones de un
              poroteo son escenarios, no predicciones oficiales.
            </p>
          </div>
          <div>
            <p className={styles.footerTitle}>Quiénes</p>
            <p className={styles.footerText}>
              Un proyecto de{' '}
              <a href="https://democraciaenred.org" target="_blank" rel="noreferrer">
                Democracia en Red
              </a>
              , desarrollado por estudiantes del programa Hola Mundo Profesional.
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
