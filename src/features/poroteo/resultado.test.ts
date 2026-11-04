import { describe, expect, it } from 'vitest';
import type { VotoPoroteo } from '@/types';
import { calcularResultado } from './resultado';

// Mismos casos que backend/tests/resultado.test.js: las dos copias deben coincidir.
const repeat = (voto: VotoPoroteo, n: number) => Array.from({ length: n }, () => voto);

describe('calcularResultado (copia del backend)', () => {
  it('sin votos: sin quórum y todo en disputa', () => {
    const r = calcularResultado([]);
    expect(r.resultado).toBe('SIN_QUORUM');
    expect(r.enDisputa).toBe(257);
  });

  it('mayoría simple con quórum', () => {
    const r = calcularResultado([
      ...repeat('AFIRMATIVO', 130),
      ...repeat('NEGATIVO', 120),
      ...repeat('AUSENTE', 7),
    ]);
    expect(r.resultado).toBe('APROBADO');
    expect(r.definido).toBe(true);
  });

  it('empate → rechazado', () => {
    expect(
      calcularResultado([...repeat('AFIRMATIVO', 128), ...repeat('NEGATIVO', 128), 'AUSENTE'])
        .resultado,
    ).toBe('RECHAZADO');
  });

  it('mayoría absoluta exige 129', () => {
    const votos = [
      ...repeat('AFIRMATIVO', 128),
      ...repeat('NEGATIVO', 10),
      ...repeat('AUSENTE', 119),
    ];
    expect(calcularResultado(votos, 'absoluta').resultado).toBe('RECHAZADO');
  });

  it('dos tercios de presentes', () => {
    const r = calcularResultado(
      [...repeat('AFIRMATIVO', 160), ...repeat('NEGATIVO', 90), ...repeat('AUSENTE', 7)],
      'dos_tercios',
    );
    expect(r.mayoria.requeridos).toBe(167);
    expect(r.resultado).toBe('RECHAZADO');
  });

  it('indefinidos dejan el resultado abierto', () => {
    const r = calcularResultado([
      ...repeat('AFIRMATIVO', 120),
      ...repeat('NEGATIVO', 115),
      ...repeat('INDEFINIDO', 22),
    ]);
    expect(r.escenarios).toEqual({ mejorCaso: 'APROBADO', peorCaso: 'RECHAZADO' });
    expect(r.definido).toBe(false);
  });
});
