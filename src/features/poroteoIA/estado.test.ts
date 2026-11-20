import { describe, expect, it } from 'vitest';
import { calcularResultado } from '@/features/poroteo/resultado';
import type { PoroteoDetalle, PrediccionDiputado } from '@/types';
import { editados, historialDe, votosFinales } from './estado';

const poroteo = {
  votos: [
    { diputadoId: 1, voto: 'AFIRMATIVO', origen: 'ia' },
    { diputadoId: 2, voto: 'NEGATIVO', origen: 'manual' },
    { diputadoId: 3, voto: 'AUSENTE', origen: 'ia' },
  ],
} as unknown as PoroteoDetalle;

const predicciones = new Map<number, PrediccionDiputado>([
  [1, { diputadoId: 1, voto: 'AFIRMATIVO' } as PrediccionDiputado],
  [2, { diputadoId: 2, voto: 'AFIRMATIVO' } as PrediccionDiputado],
  [3, { diputadoId: 3, voto: 'AUSENTE' } as PrediccionDiputado],
]);

describe('voto final del poroteo con IA', () => {
  it('usa lo guardado si no hay cambios pendientes', () => {
    const v = votosFinales(poroteo, new Map(), predicciones);
    expect([...v]).toEqual([
      [1, 'AFIRMATIVO'],
      [2, 'NEGATIVO'],
      [3, 'AUSENTE'],
    ]);
    expect([...editados(poroteo, new Map())]).toEqual([2]);
  });

  it('un ajuste pendiente cambia el voto y los totales al instante', () => {
    const pendientes = new Map([[3, 'NEGATIVO' as const]]);
    const v = votosFinales(poroteo, pendientes, predicciones);
    expect(v.get(3)).toBe('NEGATIVO');
    expect(editados(poroteo, pendientes).has(3)).toBe(true);
    const r = calcularResultado(v.values(), 'simple');
    expect(r.conteo.NEGATIVO).toBe(2);
    expect(r.conteo.AUSENTE).toBe(0);
  });

  it('volver a la predicción (null) restaura el voto de la IA y quita la marca de editado', () => {
    const pendientes = new Map([[2, null]]);
    const v = votosFinales(poroteo, pendientes, predicciones);
    expect(v.get(2)).toBe('AFIRMATIVO');
    expect(editados(poroteo, pendientes).has(2)).toBe(false);
  });

  it('historial por diputado, del más reciente al más viejo', () => {
    const h = historialDe(
      [
        { id: 1, diputadoId: 2, voto: 'NEGATIVO', motivo: null, userId: null, createdAt: 'a' },
        { id: 2, diputadoId: 5, voto: 'AUSENTE', motivo: null, userId: null, createdAt: 'b' },
        { id: 3, diputadoId: 2, voto: null, motivo: 'vuelve', userId: null, createdAt: 'c' },
      ],
      2,
    );
    expect(h.map((a) => a.id)).toEqual([3, 1]);
  });
});
