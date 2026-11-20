import { VOTO_LABEL } from '@/styles/palette';
import type { PrediccionPoroteo, VotoPredicho } from '@/types';
import { formatDateShort, formatRelative } from '@/utils/format';
import { NIVEL_AYUDA, NIVEL_LABEL } from '../estado';
import { ConfianzaBadge } from './Piezas';
import styles from './PoroteoIA.module.css';

const ORDEN: VotoPredicho[] = ['AFIRMATIVO', 'NEGATIVO', 'ABSTENCION', 'AUSENTE'];

/** Lo que usó la IA: votos esperados, firmeza, votaciones parecidas y supuestos. */
export function ResumenIA({
  prediccion,
  editados,
}: {
  prediccion: PrediccionPoroteo;
  editados: number;
}) {
  const r = prediccion.resumen;
  if (!r) return null;
  const sup = prediccion.supuestos ?? {};
  const bloquesDeclarados = Object.entries(sup.posturasBloque ?? {});
  return (
    <section className={styles.resumen} aria-label="Cómo estimó la IA">
      <div>
        <span className={styles.toolLabel}>Votos esperados (suma de probabilidades)</span>
        <dl className={styles.esperados}>
          {ORDEN.map((v) => (
            <div key={v}>
              <dt>{VOTO_LABEL[v]}</dt>
              <dd className="num">{Math.round(r.esperados[v])}</dd>
            </div>
          ))}
        </dl>
        <p className={styles.nota}>
          Más realista que contar votos uno por uno cuando hay muchas predicciones dudosas.
        </p>
      </div>
      <div>
        <span className={styles.toolLabel}>Firmeza de las predicciones</span>
        <ul className={styles.niveles}>
          {(['alta', 'media', 'baja'] as const).map((n) => (
            <li key={n} title={NIVEL_AYUDA[n]}>
              <ConfianzaBadge nivel={n} /> <span className="num">{r.nivelConfianza[n]}</span>
              <span className="visually-hidden"> diputados con predicción {NIVEL_LABEL[n]}</span>
            </li>
          ))}
          <li>
            <span className={styles.editado}>Editados a mano</span>{' '}
            <span className="num">{editados}</span>
          </li>
        </ul>
      </div>
      <div>
        <span className={styles.toolLabel}>Tema detectado</span>
        <p>
          {r.proyecto.temaNombre}
          {r.proyecto.tipo === 'mocion' ? ' · moción' : ''}
        </p>
        {(sup.posturaOficialismo || bloquesDeclarados.length > 0) && (
          <>
            <span className={styles.toolLabel}>Supuestos del escenario</span>
            <ul className={styles.listaSimple}>
              {sup.posturaOficialismo && <li>Oficialismo: {VOTO_LABEL[sup.posturaOficialismo]}</li>}
              {bloquesDeclarados.map(([b, v]) => (
                <li key={b}>
                  {b}: {VOTO_LABEL[v]}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      <div className={styles.similaresBox}>
        <span className={styles.toolLabel}>Votaciones parecidas que usó la IA</span>
        <ol className={styles.listaSimple}>
          {[...r.similaresRecientes, ...r.similares]
            .filter((s, i, arr) => arr.findIndex((x) => x.votacionId === s.votacionId) === i)
            .slice(0, 6)
            .map((s) => (
              <li key={s.votacionId}>
                {s.url ? (
                  <a href={s.url} target="_blank" rel="noreferrer">
                    {s.titulo}
                  </a>
                ) : (
                  s.titulo
                )}{' '}
                <span className={styles.pasadoMeta}>
                  {formatDateShort(s.fecha)}
                  {s.conteo ? ` · ${s.conteo.afirmativos}–${s.conteo.negativos}` : ''}
                </span>
              </li>
            ))}
        </ol>
      </div>
      <p className={styles.pie}>
        Modelo {prediccion.versionModelo} · estimado{' '}
        {prediccion.generadaAt ? formatRelative(prediccion.generadaAt) : ''}
        {r.explicaciones.llm
          ? ' · explicaciones redactadas con IA'
          : ' · explicaciones automáticas basadas en datos'}
      </p>
    </section>
  );
}
