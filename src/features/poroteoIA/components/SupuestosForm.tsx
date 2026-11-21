import { useMemo } from 'react';
import { SelectField } from '@/components/ui/Fields';
import type { Diputado, SupuestosEscenario } from '@/types';
import { titleCase } from '@/utils/text';
import { TEMAS } from '../estado';
import styles from './PoroteoIA.module.css';

type Postura = 'AFIRMATIVO' | 'NEGATIVO' | 'ABSTENCION';

interface Props {
  diputados: Diputado[];
  valor: SupuestosEscenario;
  onChange: (v: SupuestosEscenario) => void;
  temaDetectado?: string | null;
  disabled?: boolean;
}

/**
 * Supuestos opcionales del escenario. Lo que el usuario sabe (p. ej. "este bloque anunció que
 * vota en contra") se combina con el historial: cada diputado lo sigue según su disciplina.
 */
export function SupuestosForm({ diputados, valor, onChange, temaDetectado, disabled }: Props) {
  const bloques = useMemo(() => {
    const cuenta = new Map<string, number>();
    for (const d of diputados) cuenta.set(d.bloque, (cuenta.get(d.bloque) ?? 0) + 1);
    return [...cuenta].sort((a, b) => b[1] - a[1]);
  }, [diputados]);
  const posturas = valor.posturasBloque ?? {};

  const setPostura = (bloque: string, p: Postura | '') => {
    const next = { ...posturas };
    if (p) next[bloque] = p;
    else delete next[bloque];
    onChange({ ...valor, posturasBloque: next });
  };

  return (
    <fieldset className={styles.supuestos} disabled={disabled}>
      <legend>Supuestos del escenario (opcionales)</legend>
      <p className={styles.nota}>
        Si no completás nada, la IA estima solo con datos históricos. Si sabés cómo va a votar un
        bloque, indicalo: cada diputado lo sigue según cuánto acompañó a su bloque en el pasado.
      </p>
      <div className={styles.supuestosGrid}>
        <SelectField
          label="Tema del proyecto"
          value={valor.tema ?? ''}
          onChange={(e) => onChange({ ...valor, tema: e.target.value || undefined })}
        >
          <option value="">
            {temaDetectado
              ? `Detectado: ${TEMAS[temaDetectado] ?? temaDetectado}`
              : 'Detectar automáticamente'}
          </option>
          {Object.entries(TEMAS).map(([id, nombre]) => (
            <option key={id} value={id}>
              {nombre}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Tipo de votación"
          value={valor.tipo ?? 'proyecto'}
          onChange={(e) => onChange({ ...valor, tipo: e.target.value as 'proyecto' | 'mocion' })}
        >
          <option value="proyecto">Proyecto (votación en general)</option>
          <option value="mocion">Moción de procedimiento</option>
        </SelectField>
        {valor.tipo === 'mocion' && (
          <SelectField
            label="Moción pedida por"
            value={valor.solicitanteDiputadoId ? String(valor.solicitanteDiputadoId) : ''}
            onChange={(e) =>
              onChange({
                ...valor,
                solicitanteDiputadoId: e.target.value ? Number(e.target.value) : null,
              })
            }
          >
            <option value="">No sé</option>
            {[...diputados]
              .sort((a, b) => a.apellido.localeCompare(b.apellido, 'es'))
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.apellido}, {d.nombre} ({titleCase(d.bloque)})
                </option>
              ))}
          </SelectField>
        )}
        <SelectField
          label="Postura del oficialismo"
          value={valor.posturaOficialismo ?? ''}
          onChange={(e) =>
            onChange({
              ...valor,
              posturaOficialismo: (e.target.value ||
                null) as SupuestosEscenario['posturaOficialismo'],
            })
          }
        >
          <option value="">Sin supuesto</option>
          <option value="AFIRMATIVO">A favor</option>
          <option value="NEGATIVO">En contra</option>
        </SelectField>
      </div>
      <label className={styles.check}>
        <input
          type="checkbox"
          checked={valor.usarAnalistaIA !== false}
          onChange={(e) => onChange({ ...valor, usarAnalistaIA: e.target.checked })}
        />
        Que la IA lea el proyecto y estime la postura de cada bloque (recomendado)
      </label>
      <label className={styles.check}>
        <input
          type="checkbox"
          checked={Boolean(valor.comoTemaDividido)}
          onChange={(e) => onChange({ ...valor, comoTemaDividido: e.target.checked })}
        />
        Se vota como las votaciones divididas del mismo tema (por ejemplo, la IVE): cada diputado
        según cómo votó en ellas o, si no estaba, según su bloque
      </label>
      <details className={styles.bloquesDetalle} open={Object.keys(posturas).length > 0}>
        <summary>Postura anunciada por bloque ({Object.keys(posturas).length})</summary>
        <div className={styles.bloquesGrid}>
          {bloques.map(([bloque, n]) => (
            <SelectField
              key={bloque}
              label={`${titleCase(bloque)} (${n})`}
              value={posturas[bloque] ?? ''}
              onChange={(e) => setPostura(bloque, e.target.value as Postura | '')}
            >
              <option value="">Sin supuesto</option>
              <option value="AFIRMATIVO">A favor</option>
              <option value="NEGATIVO">En contra</option>
              <option value="ABSTENCION">Abstención</option>
            </SelectField>
          ))}
        </div>
      </details>
    </fieldset>
  );
}
