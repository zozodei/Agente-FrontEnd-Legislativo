import { Suspense, useState } from 'react';
import { NavLink, Outlet, ScrollRestoration } from 'react-router-dom';
import { Menu, Monitor, Moon, Sun, X } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { Skeleton } from '@/components/ui/States';
import styles from './AppLayout.module.css';

const NAV = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/diputados', label: 'Diputados' },
  { to: '/votaciones', label: 'Votaciones' },
  { to: '/poroteos', label: 'Poroteos' },
];

const THEME_LABEL = {
  system: 'Tema del sistema',
  light: 'Tema claro',
  dark: 'Tema oscuro',
} as const;

const THEME_ICON = { system: Monitor, light: Sun, dark: Moon } as const;

export function AppLayout() {
  const { theme, cycle } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const ThemeIcon = THEME_ICON[theme];

  return (
    <div className={styles.shell}>
      <ScrollRestoration />
      <a href="#contenido" className="skip-link">
        Saltar al contenido
      </a>

      <header className={styles.nav} data-open={menuOpen || undefined}>
        <div className={styles.navInner}>
          <NavLink to="/" className={styles.brand} aria-label="Poroteo Legislativo, inicio">
            <BrandMark />
            <span className={styles.brandName}>Poroteo</span>
            <span className={styles.brandSub}>Diputados</span>
          </NavLink>

          <nav id="nav-principal" className={styles.links} aria-label="Principal">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  [styles.link, isActive && styles.linkActive].filter(Boolean).join(' ')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className={styles.tools}>
            <button
              type="button"
              className={styles.iconButton}
              onClick={cycle}
              title={`${THEME_LABEL[theme]} (cambiar)`}
              aria-label={`${THEME_LABEL[theme]}. Cambiar tema`}
            >
              <ThemeIcon size={17} strokeWidth={1.75} aria-hidden />
            </button>
            <button
              type="button"
              className={`${styles.iconButton} ${styles.menuButton}`}
              aria-expanded={menuOpen}
              aria-controls="nav-principal"
              aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
              onClick={() => setMenuOpen((o) => !o)}
            >
              {menuOpen ? (
                <X size={19} strokeWidth={1.75} aria-hidden />
              ) : (
                <Menu size={19} strokeWidth={1.75} aria-hidden />
              )}
            </button>
          </div>
        </div>
      </header>

      <main id="contenido" className={styles.main}>
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <BrandMark />
            <p>
              <strong>Poroteo Legislativo</strong>
              <br />
              Un prototipo de{' '}
              <a href="https://democraciaenred.org" target="_blank" rel="noreferrer">
                Democracia en Red
              </a>{' '}
              desarrollado en el programa Hola Mundo Profesional.
            </p>
          </div>
          <div className={styles.footerCol}>
            <p className={styles.footerTitle}>Fuente de los datos</p>
            <p>
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
          <div className={styles.footerCol}>
            <p className={styles.footerTitle}>Sobre los poroteos</p>
            <p>
              Un poroteo es un escenario armado por quien lo carga, no una predicción oficial ni una
              posición de los legisladores.
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
      <Skeleton width="45%" height={44} />
      <Skeleton width="60%" height={18} />
      <Skeleton height={320} />
    </div>
  );
}

function BrandMark() {
  // Cinco porotos en arco (contar votos); el del centro es el sol.
  return (
    <svg viewBox="0 0 40 24" className={styles.brandMark} aria-hidden>
      <circle cx="5" cy="20" r="3.4" />
      <circle cx="10" cy="9.5" r="3.4" />
      <circle cx="20" cy="4.5" r="3.4" className={styles.brandSun} />
      <circle cx="30" cy="9.5" r="3.4" />
      <circle cx="35" cy="20" r="3.4" />
    </svg>
  );
}
