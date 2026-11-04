import { memo, useMemo, useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { BloqueChip } from '@/components/ui/Badges';
import { SearchInput, SelectField } from '@/components/ui/Fields';
import { VOTO_COLOR, VOTO_LABEL } from '@/styles/palette';
import type { Diputado, VotoPoroteo } from '@/types';
import { normalize, titleCase } from '@/utils/text';
import type { VotosMap } from '../usePoroteoEditor';
import styles from './ListaVotos.module.css';

const VOTOS: VotoPoroteo[] = ['AFIRMATIVO', 'NEGATIVO', 'ABSTENCION', 'AUSENTE', 'INDEFINIDO'];
const CORTO: Record<VotoPoroteo, string> = {
  AFIRMATIVO: 'Sí',
  NEGATIVO: 'No',
  ABSTENCION: 'Abst.',
  AUSENTE: 'Aus.',
  INDEFINIDO: '?',
};

/** Alternativa accesible al hemiciclo: asignar votos desde una lista. */
export function ListaVotos({
  diputados,
  votos,
  onAsignar,
}: {
  diputados: Diputado[];
  votos: VotosMap;
  onAsignar: (ids: number[], voto: VotoPoroteo | null) => void;
}) {
  const [q, setQ] = useState('');
  const [bloque, setBloque] = useState('');
  const [filtroVoto, setFiltroVoto] = useState<VotoPoroteo | ''>('');

  const bloques = useMemo(() => [...new Set(diputados.map((d) => d.bloque))].sort(), [diputados]);
  const filtrados = useMemo(() => {
    const needle = normalize(q);
    return diputados
      .filter((d) => !needle || normalize(`${d.nombre} ${d.apellido}`).includes(needle))
      .filter((d) => !bloque || d.bloque === bloque)
      .filter((d) => !filtroVoto || (votos.get(d.id) ?? 'INDEFINIDO') === filtroVoto)
      .sort((a, b) => a.apellido.localeCompare(b.apellido, 'es'));
  }, [diputados, q, bloque, filtroVoto, votos]);

  return (
    <div>
      <div className={styles.filters}>
        <SearchInput
          label="Buscar diputado"
          placeholder="Buscar diputado…"
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
          label="Voto asignado"
          value={filtroVoto}
          onChange={(e) => setFiltroVoto(e.target.value as VotoPoroteo | '')}
        >
          <option value="">Todos</option>
          {VOTOS.map((v) => (
            <option key={v} value={v}>
              {v === 'INDEFINIDO' ? 'Sin definir' : VOTO_LABEL[v]}
            </option>
          ))}
        </SelectField>
      </div>
      <p className={`${styles.count} num`}>{filtrados.length} diputados</p>
      <ul className={styles.list}>
        {filtrados.map((d) => (
          <Fila key={d.id} d={d} voto={votos.get(d.id) ?? 'INDEFINIDO'} onAsignar={onAsignar} />
        ))}
      </ul>
    </div>
  );
}

const Fila = memo(function Fila({
  d,
  voto,
  onAsignar,
}: {
  d: Diputado;
  voto: VotoPoroteo;
  onAsignar: (ids: number[], voto: VotoPoroteo | null) => void;
}) {
  const nombre = `${d.nombre} ${d.apellido}`;
  return (
    <li className={styles.row}>
      <Avatar src={d.fotoUrl} nombre={nombre} size={36} />
      <span className={styles.who}>
        <strong>{d.apellido}</strong>, {d.nombre}
        <span className={styles.sub}>
          <BloqueChip bloque={d.bloque} corto /> · {titleCase(d.distrito)}
        </span>
      </span>
      <div className={styles.votes} role="radiogroup" aria-label={`Voto de ${nombre}`}>
        {VOTOS.map((v) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={voto === v}
            aria-label={VOTO_LABEL[v]}
            title={VOTO_LABEL[v]}
            className={styles.vote}
            style={{ '--c': VOTO_COLOR[v] } as React.CSSProperties}
            onClick={() => onAsignar([d.id], v === 'INDEFINIDO' ? null : v)}
          >
            {CORTO[v]}
          </button>
        ))}
      </div>
    </li>
  );
});
