import { lazy, Suspense, useMemo, useRef, useState } from 'react';
import { ButtonLink } from '@/components/ui/Button';
import { useResumen } from '@/features/dashboard/queries';
import { useDiputados } from '@/features/diputados/queries';
import { bloqueStyle } from '@/styles/palette';
import { formatNumber } from '@/utils/format';
import { crearBancas } from '../tablero/escenario';
import {
  PUNTOS_POR_BANCA,
  soportaWebGL,
  useEnPantalla,
  useProgresoEscalonado,
  useProgresoRiel,
} from './comun';
import styles from './Portadas.module.css';

const Escena = lazy(() => import('./EscenaVotos'));

/**
 * Portada 3 · Miles de votos: el historial de votaciones nominales como puntos de luz que se
 * ordenan en la Cámara de hoy, cada banca con el color de su bloque.
 */
export function PortadaVotos() {
  const riel = useRef<HTMLDivElement>(null);
  const escenario = useRef<HTMLDivElement>(null);
  const { progreso, reducido } = useProgresoRiel(riel);
  const p = useProgresoEscalonado(progreso, 100);
  const activo = useEnPantalla(escenario);
  const [webgl] = useState(soportaWebGL);
  const diputados = useDiputados();
  const resumen = useResumen();

  const bancas = useMemo(() => {
    if (!diputados.data) return [];
    const asientos = crearBancas();
    const ordenados = [...diputados.data].sort(
      (a, b) =>
        bloqueStyle(a.bloque).orden - bloqueStyle(b.bloque).orden ||
        (a.bloque ?? '').localeCompare(b.bloque ?? ''),
    );
    return asientos.map((s, i) => ({
      ...s,
      color: bloqueStyle(ordenados[i]?.bloque).color,
    }));
  }, [diputados.data]);

  const votaciones = resumen.data?.votaciones.total ?? 0;
  const puntos = bancas.length * PUNTOS_POR_BANCA;
  const votosPorPunto = puntos > 0 ? Math.round((votaciones * 257) / puntos) : 0;
  const bloques = resumen.data?.camara.bloques;

  return (
    <div ref={riel} className={styles.riel} data-reducido={reducido || undefined}>
      <div ref={escenario} className={styles.escenario}>
        <div className={styles.lienzo} aria-hidden>
          {webgl && bancas.length > 0 && (
            <Suspense fallback={null}>
              <Escena bancas={bancas} progreso={progreso} activo={activo} reducido={reducido} />
            </Suspense>
          )}
        </div>
        <div className={styles.veloIzq} aria-hidden />
        <div className={styles.capa}>
          <div className={styles.texto}>
            <p className={styles.kicker}>
              <span className={styles.dot} aria-hidden /> Congreso de la Nación Argentina
            </p>
            <h2 className={styles.titulo}>
              Sabé si una ley sale <em>antes de que se vote.</em>
            </h2>
            <p className={styles.lead}>
              demoIA aprende de cada votación nominal de Diputados para estimar cómo votaría cada
              banca un proyecto nuevo.
            </p>
            <div className={styles.acciones}>
              <ButtonLink to="/registro" variant="inverse" size="lg">
                Empezar a porotear
              </ButtonLink>
              <ButtonLink to="/votaciones" variant="outlineInverse" size="lg">
                Ver votaciones
              </ButtonLink>
            </div>
          </div>
          <div className={styles.lectura}>
            <p className={styles.etapa} data-oculta={p >= 0.55 || undefined} hidden={p >= 0.55}>
              {votaciones ? formatNumber(votaciones) : '—'} votaciones nominales
              <strong>{puntos ? formatNumber(puntos) : '—'} puntos de luz</strong>
              Cada uno resume unos {votosPorPunto || '—'} votos registrados.
            </p>
            <p className={styles.etapa} data-oculta={p < 0.55 || undefined} hidden={p < 0.55}>
              La Cámara, hoy
              <strong>257 bancas{bloques ? `, ${bloques} bloques` : ''}</strong>
              Cada columna toma el color del bloque que ocupa la banca.
            </p>
          </div>
        </div>
        {!reducido && (
          <p className={styles.pista} data-oculta={p > 0.02 || undefined}>
            Bajá para ordenar los votos
          </p>
        )}
      </div>
    </div>
  );
}
