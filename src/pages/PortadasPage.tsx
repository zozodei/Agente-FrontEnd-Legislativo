import { PortadaCongreso } from '@/features/landing/portadas/PortadaCongreso';
import { PortadaVotacionReal } from '@/features/landing/portadas/PortadaVotacionReal';
import { PortadaVotos } from '@/features/landing/portadas/PortadaVotos';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import styles from './PortadasPage.module.css';

const PORTADAS = [
  {
    id: 'portada-1',
    n: 1,
    nombre: 'Votación real',
    nota: 'La IVE de 2018 (129 a 125) reproducida banca por banca con los votos de la base.',
    Componente: PortadaVotacionReal,
  },
  {
    id: 'portada-2',
    n: 2,
    nombre: 'Del edificio al recinto',
    nota: 'La cámara sube al Congreso, atraviesa la cúpula y baja a votar.',
    Componente: PortadaCongreso,
  },
  {
    id: 'portada-3',
    n: 3,
    nombre: 'Miles de votos',
    nota: 'El historial de votaciones como puntos de luz que se ordenan en la Cámara de hoy.',
    Componente: PortadaVotos,
  },
];

/**
 * Página de trabajo para comparar las portadas candidatas de la landing (no está en el menú).
 * Cuando se elija una, pasa a LandingPage y esta página se borra.
 */
export default function PortadasPage() {
  useDocumentTitle('Portadas candidatas');
  return (
    <div className={styles.page}>
      <header className={styles.cabecera}>
        <p className={styles.kicker}>Comparar portadas</p>
        <h1 className={styles.titulo}>Tres portadas para la landing</h1>
        <p className={styles.bajada}>
          Cada una ocupa la pantalla y cuenta su historia con el scroll. Recorrelas y elegí.
        </p>
        <ol className={styles.indice}>
          {PORTADAS.map((p) => (
            <li key={p.id}>
              <a href={`#${p.id}`}>
                <span className="num">{p.n}</span> {p.nombre}
              </a>
            </li>
          ))}
        </ol>
      </header>
      {PORTADAS.map(({ id, n, nombre, nota, Componente }) => (
        <section key={id} id={id} aria-label={`Portada ${n}: ${nombre}`}>
          <div className={styles.rotulo}>
            <span className="num">{n}</span>
            <strong>{nombre}</strong>
            <span>{nota}</span>
          </div>
          <Componente />
        </section>
      ))}
    </div>
  );
}
