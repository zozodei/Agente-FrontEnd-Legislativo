import { errorMessage } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Fields';
import type { Prediccion } from '@/types';
import { titleCase } from '@/utils/text';
import type { ModoAplicar } from '../ia';
import styles from './PrediccionPanel.module.css';

const pct = (p: number) => `${Math.round(p * 100)}%`;
const n = (x: number) => Math.round(x).toLocaleString('es-AR');

/**
 * Estimar con IA: pide la propuesta, la aplica al editor y muestra lo que el modelo
 * sabe del conjunto (probabilidad de aprobación, conteo esperado, alerta de división).
 * Nada se guarda hasta que la persona aprieta "Guardar cambios".
 */
export function PrediccionPanel({
  prediccion,
  aplicados,
  pendiente,
  error,
  bloqueo,
  modo,
  onModo,
  hayVotos,
  onEstimar,
}: {
  prediccion: Prediccion | null;
  aplicados: number | null;
  pendiente: boolean;
  error: unknown;
  /** Motivo por el que no se puede estimar ahora (null = se puede). */
  bloqueo: string | null;
  modo: ModoAplicar;
  onModo: (modo: ModoAplicar) => void;
  hayVotos: boolean;
  onEstimar: () => void;
}) {
  const r = prediccion?.resumen;
  return (
    <section className={styles.panel} aria-label="Estimación con IA">
      <div className={styles.head}>
        <span className={styles.kicker}>Estimación con IA</span>
        {prediccion?.modelo.simulado && (
          <span className={styles.simulado} title="Datos de mentira para probar la pantalla">
            Simulación
          </span>
        )}
      </div>

      {hayVotos && (
        <Segmented
          size="sm"
          label="Qué bancas completa la IA"
          value={modo}
          onChange={onModo}
          options={[
            { value: 'sinAsignar', label: 'Solo sin asignar' },
            { value: 'todo', label: 'Reemplazar todo' },
          ]}
        />
      )}
      <Button variant="primary" onClick={onEstimar} loading={pendiente} disabled={bloqueo !== null}>
        {prediccion ? 'Volver a estimar' : 'Estimar con IA'}
      </Button>
      {bloqueo && <p className={styles.nota}>{bloqueo}</p>}
      {pendiente && (
        <p className={styles.nota} role="status">
          Calculando… puede tardar unos segundos.
        </p>
      )}
      {Boolean(error) && !pendiente && (
        <p className={styles.error} role="alert">
          {errorMessage(error)}
        </p>
      )}

      {prediccion && r && !pendiente && (
        <div className={styles.result} aria-live="polite">
          {r.probAprobacion !== null && (
            <p className={styles.prob}>
              <span className="num">{pct(r.probAprobacion)}</span>
              <span className={styles.probLabel}>probabilidad de aprobarse</span>
            </p>
          )}
          <p className={styles.esperados}>
            Se esperan{' '}
            <b className="num">
              ≈{'\u00a0'}
              {n(r.esperados.afirmativos)}
            </b>{' '}
            afirmativos y{' '}
            <b className="num">
              ≈{'\u00a0'}
              {n(r.esperados.negativos)}
            </b>{' '}
            negativos.
          </p>
          {r.posibleDividida && (
            <p className={styles.alerta} role="note">
              <b>Posible votación dividida</b>
              {r.probDividida !== null && ` (${pct(r.probDividida)})`}. En estos casos el modelo se
              equivoca más: revisá los bloques en disputa.
            </p>
          )}
          <p className={styles.nota}>
            {aplicados === 0
              ? 'No había bancas sin asignar: no se cambió ningún voto.'
              : `Se cargaron ${aplicados} votos estimados. Las bancas de la IA se ven más tenues cuanto menor es la confianza. Revisalos y guardá.`}
          </p>
          <p className={styles.nota}>
            El contador del hemiciclo suma el voto más probable de cada banca; el conteo esperado
            suma probabilidades, por eso pueden no coincidir.
          </p>

          <details className={styles.detalles}>
            <summary>Intervalo y detalles</summary>
            <dl>
              {r.intervalo80 && (
                <>
                  <div>
                    <dt>Afirmativos (80%)</dt>
                    <dd className="num">
                      {n(r.intervalo80.afirmativos[0])}–{n(r.intervalo80.afirmativos[1])}
                    </dd>
                  </div>
                  <div>
                    <dt>Negativos (80%)</dt>
                    <dd className="num">
                      {n(r.intervalo80.negativos[0])}–{n(r.intervalo80.negativos[1])}
                    </dd>
                  </div>
                </>
              )}
              {r.probQuorum !== null && (
                <div>
                  <dt>Quórum</dt>
                  <dd className="num">{pct(r.probQuorum)}</dd>
                </div>
              )}
              {prediccion.tema?.valor && (
                <div>
                  <dt>Tema</dt>
                  <dd>{titleCase(prediccion.tema.valor)}</dd>
                </div>
              )}
              <div>
                <dt>Modelo</dt>
                <dd>
                  {prediccion.modelo.simulado
                    ? 'Simulación de prueba'
                    : `${prediccion.modelo.nombre} v${prediccion.modelo.version}`}
                  {prediccion.modelo.datosHasta && ` · datos al ${prediccion.modelo.datosHasta}`}
                </dd>
              </div>
            </dl>
            <p className={styles.nota}>
              El intervalo es ancho a propósito: los diputados de un mismo bloque votan juntos, y el
              modelo todavía no sabe bien qué proyectos dividen a la Cámara.
            </p>
          </details>

          {prediccion.advertencias.length > 0 && (
            <ul className={styles.advertencias}>
              {prediccion.advertencias.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
