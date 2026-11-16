import { describe, expect, it } from 'vitest';
import type { VotoPoroteo, VotoPrediccion } from '@/types';
import { aplicarPrediccion, armarVotosInput, esIa, firmaIa, type IaMap } from './ia';

const pred = (diputadoId: number, voto: VotoPrediccion['voto'], confianza = 0.7) => ({
  diputadoId,
  voto,
  probabilidades: { AFIRMATIVO: 0.7, NEGATIVO: 0.2, ABSTENCION: 0.05, AUSENTE: 0.05 },
  confianza,
  justificacion: `motivo ${diputadoId}`,
  fuentes: [{ tipo: 'historial_tema' }],
});

describe('aplicarPrediccion', () => {
  const votos = new Map<number, VotoPoroteo>([[1, 'NEGATIVO']]);
  const prediccion = [pred(1, 'AFIRMATIVO'), pred(2, 'AFIRMATIVO')];

  it('"sinAsignar" respeta lo cargado a mano', () => {
    const r = aplicarPrediccion(votos, new Map(), prediccion, 'sinAsignar');
    expect(r.votos.get(1)).toBe('NEGATIVO');
    expect(r.votos.get(2)).toBe('AFIRMATIVO');
    expect(r.aplicados).toBe(1);
    expect(esIa(1, r.votos, r.ia)).toBe(false);
    expect(esIa(2, r.votos, r.ia)).toBe(true);
  });

  it('"todo" reemplaza y no muta los mapas de entrada', () => {
    const r = aplicarPrediccion(votos, new Map(), prediccion, 'todo');
    expect(r.votos.get(1)).toBe('AFIRMATIVO');
    expect(r.aplicados).toBe(2);
    expect(votos.get(1)).toBe('NEGATIVO');
  });
});

describe('armarVotosInput', () => {
  it('manda origen ia con su detalle y pasa a manual lo corregido', () => {
    const { votos, ia } = aplicarPrediccion(
      new Map(),
      new Map(),
      [pred(1, 'AFIRMATIVO', 0.81), pred(2, 'NEGATIVO')],
      'todo',
    );
    votos.set(2, 'AFIRMATIVO'); // corrección a mano
    votos.set(3, 'AUSENTE'); // manual
    expect(armarVotosInput(votos, ia)).toEqual([
      {
        diputadoId: 1,
        voto: 'AFIRMATIVO',
        origen: 'ia',
        confianza: 0.81,
        justificacion: 'motivo 1',
        fuentes: [{ tipo: 'historial_tema' }],
      },
      { diputadoId: 2, voto: 'AFIRMATIVO' },
      { diputadoId: 3, voto: 'AUSENTE' },
    ]);
  });

  it('la firma cambia si un voto igual pasa de manual a IA', () => {
    const votos = new Map<number, VotoPoroteo>([[1, 'AFIRMATIVO']]);
    const sinIa: IaMap = new Map();
    const conIa = aplicarPrediccion(votos, sinIa, [pred(1, 'AFIRMATIVO')], 'todo').ia;
    expect(firmaIa(votos, sinIa)).toBe('');
    expect(firmaIa(votos, conIa)).toBe('1');
  });
});
