import { VoteBar } from '@/components/ui/VoteBar';
import { VOTO_COLOR, VOTO_LABEL } from '@/styles/palette';
import type { ResumenPoroteo, VotoPoroteo } from '@/types';
import { TIPO_MAYORIA_LABEL } from '../resultado';
import styles from './ResultadoPanel.module.css';

const ORDEN: VotoPoroteo[] = ['AFIRMATIVO', 'NEGATIVO', 'ABSTENCION', 'AUSENTE'];

const TITULAR = {
  APROBADO: 'Se aprueba',
  RECHAZADO: 'Se rechaza',
  SIN_QUORUM: 'Sin quórum',
} as const;

/** Contador en vivo del poroteo: quórum, mayoría y si el resultado ya está definido. */
export function ResultadoPanel({ resumen }: { resumen: ResumenPoroteo }) {
  const { conteo, quorum, mayoria, resultado, definido, escenarios, enDisputa } = resumen;

  let bajada: string;
  if (!quorum.alcanzado) {
    bajada = `Faltan ${quorum.faltan} presentes para el quórum de ${quorum.requerido}.`;
  } else if (resultado === 'APROBADO') {
    bajada = `${conteo.AFIRMATIVO} afirmativos alcanzan los ${mayoria.requeridos} necesarios.`;
  } else {
    bajada = `Faltan ${mayoria.faltan} votos afirmativos para aprobarlo.`;
  }

  return (
    <section className={styles.panel} aria-live="polite" aria-label="Resultado estimado">
      <span className={styles.kicker}>
        Resultado estimado · {TIPO_MAYORIA_LABEL[resumen.tipoMayoria]}
      </span>
      <p className={styles.titular} data-resultado={resultado}>
        {TITULAR[resultado]}
      </p>
      <p className={styles.bajada}>{bajada}</p>

      <p className={styles.estado} data-definido={definido || undefined}>
        {definido
          ? enDisputa
            ? `Definido: los ${enDisputa} votos sin definir no alcanzan para cambiarlo.`
            : 'Todas las bancas asignadas.'
          : `Abierto: con ${enDisputa} bancas sin definir, puede ${escenarios.mejorCaso === 'APROBADO' ? 'aprobarse' : 'no reunir quórum'} o ${escenarios.peorCaso === 'RECHAZADO' ? 'rechazarse' : 'quedar sin quórum'}.`}
      </p>

      <dl className={styles.counts}>
        {ORDEN.map((v) => (
          <div key={v}>
            <dt>
              <i style={{ background: VOTO_COLOR[v] }} aria-hidden />
              {VOTO_LABEL[v]}
            </dt>
            <dd className="num">{conteo[v]}</dd>
          </div>
        ))}
        <div>
          <dt>
            <i className={styles.dotEmpty} aria-hidden />
            Sin definir
          </dt>
          <dd className="num">{enDisputa}</dd>
        </div>
      </dl>

      <div className={styles.bar}>
        <VoteBar
          height={12}
          total={257}
          segments={[
            { voto: 'AFIRMATIVO', value: conteo.AFIRMATIVO },
            { voto: 'NEGATIVO', value: conteo.NEGATIVO },
            { voto: 'ABSTENCION', value: conteo.ABSTENCION },
            { voto: 'INDEFINIDO', value: enDisputa },
            { voto: 'AUSENTE', value: conteo.AUSENTE },
          ]}
          marker={{ at: 129, label: '129' }}
        />
      </div>

      <dl className={styles.meta}>
        <div>
          <dt>Presentes</dt>
          <dd className="num">
            {resumen.presentes} <span>/ 257</span>
          </dd>
        </div>
        <div>
          <dt>Quórum</dt>
          <dd data-ok={quorum.alcanzado || undefined}>{quorum.alcanzado ? 'Sí' : 'No'}</dd>
        </div>
        <div>
          <dt>Necesarios</dt>
          <dd className="num">{mayoria.requeridos}</dd>
        </div>
      </dl>
    </section>
  );
}
