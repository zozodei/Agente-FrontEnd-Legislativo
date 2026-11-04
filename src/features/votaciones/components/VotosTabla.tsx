import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '@/components/ui/Avatar';
import { BloqueChip, VotoBadge } from '@/components/ui/Badges';
import { SearchInput, Segmented, SelectField } from '@/components/ui/Fields';
import { EmptyState } from '@/components/ui/States';
import { VOTO_COLOR, VOTO_LABEL } from '@/styles/palette';
import type { VotoEnVotacion, VotoReal } from '@/types';
import { nombreLegible, normalize, titleCase } from '@/utils/text';
import styles from './VotosTabla.module.css';

const VOTOS: VotoReal[] = ['AFIRMATIVO', 'NEGATIVO', 'ABSTENCION', 'AUSENTE'];

/** Quién votó qué, filtrable por bloque, tipo de voto y nombre. */
export function VotosTabla({
  votos,
  bloque,
  onBloqueChange,
  voto,
  onVotoChange,
}: {
  votos: VotoEnVotacion[];
  bloque: string;
  onBloqueChange: (b: string) => void;
  voto: VotoReal | 'TODOS';
  onVotoChange: (v: VotoReal | 'TODOS') => void;
}) {
  const [q, setQ] = useState('');
  const bloques = useMemo(
    () =>
      [...new Set(votos.map((v) => v.bloque ?? 'Sin bloque'))].sort((a, b) =>
        a.localeCompare(b, 'es'),
      ),
    [votos],
  );

  const filtrados = useMemo(() => {
    const needle = normalize(q);
    return votos.filter(
      (v) =>
        (voto === 'TODOS' || v.voto === voto) &&
        (!bloque || (v.bloque ?? 'Sin bloque') === bloque) &&
        (!needle || normalize(v.nombre).includes(needle)),
    );
  }, [votos, voto, bloque, q]);

  return (
    <div>
      <div className={styles.filters}>
        <SearchInput
          label="Buscar diputado"
          placeholder="Buscar diputado…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <SelectField label="Bloque" value={bloque} onChange={(e) => onBloqueChange(e.target.value)}>
          <option value="">Todos</option>
          {bloques.map((b) => (
            <option key={b} value={b}>
              {titleCase(b)}
            </option>
          ))}
        </SelectField>
      </div>
      <div className={styles.segmented}>
        <Segmented
          size="sm"
          label="Filtrar por voto"
          value={voto}
          onChange={onVotoChange}
          options={[
            { value: 'TODOS', label: 'Todos' },
            ...VOTOS.map((v) => ({ value: v, label: VOTO_LABEL[v], color: VOTO_COLOR[v] })),
          ]}
        />
      </div>

      {filtrados.length === 0 ? (
        <EmptyState titulo="Nadie coincide con esos filtros" />
      ) : (
        <ul className={styles.list}>
          {filtrados.map((v) => {
            const nombre = nombreLegible(v.nombre);
            const content = (
              <>
                <Avatar src={v.fotoUrl} nombre={nombre} size={36} />
                <span className={styles.name}>{nombre}</span>
                <BloqueChip bloque={v.bloque} />
                <span className={styles.prov}>{titleCase(v.provincia)}</span>
                <VotoBadge voto={v.voto} />
              </>
            );
            return (
              <li key={v.personaId} className={styles.row}>
                {v.diputadoId ? (
                  <Link to={`/diputados/${v.diputadoId}`} className={styles.rowInner}>
                    {content}
                  </Link>
                ) : (
                  <div className={styles.rowInner}>{content}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
