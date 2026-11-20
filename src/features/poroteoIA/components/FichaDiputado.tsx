import { useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { VotoBadge } from '@/components/ui/Badges';
import { Button } from '@/components/ui/Button';
import { VOTO_COLOR, VOTO_LABEL } from '@/styles/palette';
import type { AjusteManual, Diputado, PrediccionDiputado, VotoPoroteo } from '@/types';
import { formatDateShort, formatRelative } from '@/utils/format';
import { titleCase } from '@/utils/text';
import { pct } from '../estado';
import { BarrasProbabilidad, ConfianzaBadge, EditadoMarca } from './Piezas';
import styles from './PoroteoIA.module.css';

const OPCIONES: VotoPoroteo[] = ['AFIRMATIVO', 'NEGATIVO', 'ABSTENCION', 'AUSENTE'];

interface Props {
  diputado: Diputado;
  prediccion: PrediccionDiputado | undefined;
  votoFinal: VotoPoroteo | null;
  editado: boolean;
  historial: AjusteManual[];
  puedeEditar: boolean;
  ocupado: boolean;
  onAjustar: (voto: VotoPoroteo | null, motivo: string) => void;
  onCerrar: () => void;
}

/** Detalle de un diputado: predicción, probabilidades, explicación, votos pasados y edición. */
export function FichaDiputado({
  diputado,
  prediccion,
  votoFinal,
  editado,
  historial,
  puedeEditar,
  ocupado,
  onAjustar,
  onCerrar,
}: Props) {
  const [motivo, setMotivo] = useState('');
  const f = prediccion?.factores;
  const pasados = f?.similares.filter((s) => s.voto).slice(0, 6) ?? [];

  return (
    <section className={styles.ficha} aria-label={`Ficha de ${diputado.nombreCompleto}`}>
      <header className={styles.fichaHeader}>
        <Avatar src={diputado.fotoUrl} nombre={diputado.nombreCompleto} size={56} />
        <div>
          <h2 className={styles.fichaNombre}>
            {diputado.apellido}, {diputado.nombre}
          </h2>
          <p className={styles.fichaMeta}>
            {titleCase(diputado.bloque)} · {titleCase(diputado.distrito)}
          </p>
        </div>
        <button
          type="button"
          className={styles.cerrar}
          onClick={onCerrar}
          aria-label="Cerrar ficha"
        >
          ×
        </button>
      </header>

      {prediccion ? (
        <>
          <div className={styles.fichaVoto}>
            <span className={styles.toolLabel}>Estimación de la IA</span>
            <VotoBadge voto={prediccion.voto} />
            <ConfianzaBadge nivel={prediccion.nivelConfianza} />
            <span className="num">{pct(prediccion.confianza)}</span>
          </div>
          <BarrasProbabilidad probabilidades={prediccion.probabilidades} />

          <div className={styles.explicacion}>
            <span className={styles.toolLabel}>Por qué</span>
            {prediccion.explicacion ? (
              <p>{prediccion.explicacion}</p>
            ) : (
              <p>Sin explicación disponible.</p>
            )}
            {prediccion.explicacionEstado === 'error' && (
              <p className={styles.nota} role="status">
                No se pudo redactar la explicación con el modelo de lenguaje: se muestra un resumen
                automático armado solo con los datos.
              </p>
            )}
            {f?.datos.pocosDatos && (
              <p className={styles.nota}>
                Hay pocos datos de este diputado ({f.datos.votacionesUltimosDosAnios} votaciones en
                dos años): tomá la estimación con cautela.
              </p>
            )}
          </div>

          {f && (
            <dl className={styles.factores}>
              <div>
                <dt>Acompañó a su bloque</dt>
                <dd className="num">
                  {f.disciplina.base >= 10 ? pct(f.disciplina.porcentaje) : 's/d'}
                </dd>
              </div>
              <div>
                <dt>Coincidió con el oficialismo</dt>
                <dd className="num">
                  {f.oficialismo.base >= 20 ? pct(f.oficialismo.alineacion) : 's/d'}
                </dd>
              </div>
              <div>
                <dt>Ausente en las últimas</dt>
                <dd className="num">
                  {f.ausentismo.ultimas10}/{f.ausentismo.registradas}
                </dd>
              </div>
            </dl>
          )}

          {pasados.length > 0 && (
            <div>
              <span className={styles.toolLabel}>Votos pasados en proyectos parecidos</span>
              <ul className={styles.pasados}>
                {pasados.map((s) => (
                  <li key={s.votacionId}>
                    <span className={styles.pasadoTitulo}>
                      {s.url ? (
                        <a href={s.url} target="_blank" rel="noreferrer">
                          {s.titulo}
                        </a>
                      ) : (
                        s.titulo
                      )}
                    </span>
                    <span className={styles.pasadoMeta}>
                      {formatDateShort(s.fecha)} · similitud {pct(s.similitud)}
                    </span>
                    <span className={styles.pasadoVoto}>
                      {s.voto && <VotoBadge voto={s.voto} />}
                      {s.mayoriaBloque && (
                        <span className={styles.pasadoBloque}>
                          bloque: {VOTO_LABEL[s.mayoriaBloque]}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <p className={styles.nota}>Este diputado no tiene predicción en este poroteo.</p>
      )}

      <div className={styles.editar}>
        <span className={styles.toolLabel}>Voto en el poroteo {editado && <EditadoMarca />}</span>
        <div className={styles.opciones} role="group" aria-label="Cambiar el voto">
          {OPCIONES.map((v) => (
            <button
              key={v}
              type="button"
              className={styles.opcion}
              aria-pressed={votoFinal === v}
              disabled={!puedeEditar || ocupado}
              style={{ ['--c' as string]: VOTO_COLOR[v] }}
              onClick={() => {
                onAjustar(v, motivo);
                setMotivo('');
              }}
            >
              {VOTO_LABEL[v]}
            </button>
          ))}
        </div>
        <label className={styles.motivo}>
          Motivo del cambio (opcional)
          <input
            type="text"
            maxLength={500}
            value={motivo}
            disabled={!puedeEditar || ocupado}
            placeholder="Ej.: anunció su voto en la sesión"
            onChange={(e) => setMotivo(e.target.value)}
          />
        </label>
        {editado && prediccion && (
          <Button
            size="sm"
            variant="ghost"
            disabled={!puedeEditar || ocupado}
            onClick={() => onAjustar(null, motivo)}
          >
            ↶ Volver a la predicción de la IA ({VOTO_LABEL[prediccion.voto]})
          </Button>
        )}
        {historial.length > 0 && (
          <details className={styles.historial}>
            <summary>Historial de ajustes ({historial.length})</summary>
            <ol>
              {historial.map((a) => (
                <li key={a.id}>
                  {a.voto ? VOTO_LABEL[a.voto] : 'Volvió a la predicción'} ·{' '}
                  {formatRelative(a.createdAt)}
                  {a.motivo ? ` — ${a.motivo}` : ''}
                </li>
              ))}
            </ol>
          </details>
        )}
      </div>
    </section>
  );
}
