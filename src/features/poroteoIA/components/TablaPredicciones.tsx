import { useEffect, useMemo, useState } from 'react';
import { VotoBadge } from '@/components/ui/Badges';
import { SearchInput, SelectField } from '@/components/ui/Fields';
import { VOTO_LABEL } from '@/styles/palette';
import type { Diputado, NivelConfianza, PrediccionDiputado, VotoPoroteo } from '@/types';
import { normalize, titleCase } from '@/utils/text';
import { NIVEL_LABEL, pct } from '../estado';
import { ConfianzaBadge, EditadoMarca } from './Piezas';
import styles from './PoroteoIA.module.css';

interface Props {
  diputados: Diputado[];
  predicciones: Map<number, PrediccionDiputado>;
  votos: Map<number, VotoPoroteo>;
  editados: Set<number>;
  seleccionado: number | null;
  onSeleccionar: (id: number) => void;
  /** Para resaltar en el hemiciclo lo que queda filtrado. */
  onFiltrar?: (ids: Set<number> | null) => void;
}

const VOTOS: VotoPoroteo[] = ['AFIRMATIVO', 'NEGATIVO', 'ABSTENCION', 'AUSENTE', 'INDEFINIDO'];
const NIVELES: NivelConfianza[] = ['alta', 'media', 'baja'];

/** Tabla filtrable por bloque, provincia, voto y confianza (alternativa accesible al hemiciclo). */
export function TablaPredicciones({
  diputados,
  predicciones,
  votos,
  editados,
  seleccionado,
  onSeleccionar,
  onFiltrar,
}: Props) {
  const [q, setQ] = useState('');
  const [bloque, setBloque] = useState('');
  const [provincia, setProvincia] = useState('');
  const [voto, setVoto] = useState('');
  const [confianza, setConfianza] = useState('');
  const [soloEditados, setSoloEditados] = useState(false);

  const bloques = useMemo(
    () => [...new Set(diputados.map((d) => d.bloque))].sort((a, b) => a.localeCompare(b, 'es')),
    [diputados],
  );
  const provincias = useMemo(
    () => [...new Set(diputados.map((d) => d.distrito))].sort((a, b) => a.localeCompare(b, 'es')),
    [diputados],
  );

  const filas = useMemo(() => {
    const needle = normalize(q);
    return diputados
      .filter((d) => !needle || normalize(`${d.nombre} ${d.apellido}`).includes(needle))
      .filter((d) => !bloque || d.bloque === bloque)
      .filter((d) => !provincia || d.distrito === provincia)
      .filter((d) => !voto || (votos.get(d.id) ?? 'INDEFINIDO') === voto)
      .filter((d) => !confianza || predicciones.get(d.id)?.nivelConfianza === confianza)
      .filter((d) => !soloEditados || editados.has(d.id))
      .sort((a, b) => a.apellido.localeCompare(b.apellido, 'es'));
  }, [
    diputados,
    q,
    bloque,
    provincia,
    voto,
    confianza,
    soloEditados,
    votos,
    predicciones,
    editados,
  ]);

  const hayFiltro = Boolean(q || bloque || provincia || voto || confianza || soloEditados);
  // Avisar al hemiciclo qué bancas quedan (null = sin filtro).
  const ids = useMemo(
    () => (hayFiltro ? new Set(filas.map((d) => d.id)) : null),
    [filas, hayFiltro],
  );
  useEffect(() => onFiltrar?.(ids), [ids, onFiltrar]);

  return (
    <div className={styles.tabla}>
      <div className={styles.filtros}>
        <SearchInput
          label="Buscar diputado"
          placeholder="Buscá por nombre"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <SelectField label="Bloque" value={bloque} onChange={(e) => setBloque(e.target.value)}>
          <option value="">Todos</option>
          {bloques.map((b) => (
            <option key={b} value={b}>
              {titleCase(b)}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Provincia"
          value={provincia}
          onChange={(e) => setProvincia(e.target.value)}
        >
          <option value="">Todas</option>
          {provincias.map((p) => (
            <option key={p} value={p}>
              {titleCase(p)}
            </option>
          ))}
        </SelectField>
        <SelectField label="Voto" value={voto} onChange={(e) => setVoto(e.target.value)}>
          <option value="">Todos</option>
          {VOTOS.map((v) => (
            <option key={v} value={v}>
              {VOTO_LABEL[v]}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Confianza"
          value={confianza}
          onChange={(e) => setConfianza(e.target.value)}
        >
          <option value="">Todas</option>
          {NIVELES.map((n) => (
            <option key={n} value={n}>
              {NIVEL_LABEL[n]}
            </option>
          ))}
        </SelectField>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={soloEditados}
            onChange={(e) => setSoloEditados(e.target.checked)}
          />
          Solo editados
        </label>
      </div>
      <p className={styles.conteoFilas} role="status">
        {filas.length} de {diputados.length} diputados
      </p>
      <div className={styles.scroll}>
        <table>
          <caption className="visually-hidden">Predicción por diputado</caption>
          <thead>
            <tr>
              <th scope="col">Diputado</th>
              <th scope="col">Bloque</th>
              <th scope="col">Provincia</th>
              <th scope="col">Voto</th>
              <th scope="col">IA</th>
              <th scope="col">Confianza</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((d) => {
              const p = predicciones.get(d.id);
              const v = votos.get(d.id) ?? 'INDEFINIDO';
              return (
                <tr
                  key={d.id}
                  aria-selected={seleccionado === d.id}
                  data-seleccionado={seleccionado === d.id || undefined}
                >
                  <th scope="row">
                    <button
                      type="button"
                      className={styles.linkBtn}
                      onClick={() => onSeleccionar(d.id)}
                    >
                      {d.apellido}, {d.nombre}
                    </button>
                  </th>
                  <td>{titleCase(d.bloque)}</td>
                  <td>{titleCase(d.distrito)}</td>
                  <td>
                    <span className={styles.celdaVoto}>
                      <VotoBadge voto={v} />
                      {editados.has(d.id) && <EditadoMarca />}
                    </span>
                  </td>
                  <td>{p ? `${VOTO_LABEL[p.voto]} · ${pct(p.confianza)}` : '—'}</td>
                  <td>{p ? <ConfianzaBadge nivel={p.nivelConfianza} /> : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
