import { VOTO_COLOR, VOTO_LABEL } from '@/styles/palette';
import type { AnalisisBloques } from '@/types';
import { titleCase } from '@/utils/text';
import { pct } from '../estado';
import styles from './PoroteoIA.module.css';

/** Postura estimada de cada bloque por el analista de IA (lo que después se reparte por diputado). */
export function AnalisisBloquesIA({ analisis }: { analisis: AnalisisBloques }) {
  const filas = Object.entries(analisis.bloques);
  return (
    <section className={styles.analisis} aria-label="Análisis de bloques por IA">
      <span className={styles.toolLabel}>
        Análisis del proyecto por IA · postura estimada de cada bloque
      </span>
      {analisis.resumen && <p>{analisis.resumen}</p>}
      <p className={styles.nota}>
        Probabilidad de que el proyecto divida a la Cámara: {pct(analisis.divideALaCamara)}. Es una
        estimación a partir del texto del proyecto y del historial de votos; si sabés la postura
        real de un bloque, indicala en los supuestos y reemplaza a esta.
      </p>
      <div className={styles.scroll}>
        <table>
          <thead>
            <tr>
              <th scope="col">Bloque</th>
              <th scope="col">Postura estimada</th>
              <th scope="col">A favor / En contra / Abst.</th>
              <th scope="col">Por qué</th>
            </tr>
          </thead>
          <tbody>
            {filas.map(([bloque, a]) => (
              <tr key={bloque}>
                <th scope="row">{titleCase(bloque)}</th>
                <td>
                  <span style={{ color: VOTO_COLOR[a.postura] }}>●</span> {VOTO_LABEL[a.postura]}
                </td>
                <td className="num">
                  {pct(a.probabilidades.AFIRMATIVO)} / {pct(a.probabilidades.NEGATIVO)} /{' '}
                  {pct(a.probabilidades.ABSTENCION)}
                </td>
                <td className={styles.razon}>{a.razon}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
