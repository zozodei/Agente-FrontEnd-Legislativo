import { describe, expect, it } from 'vitest';
import { nombreLegible, normalize, titleCase } from './text';
import { bloqueStyle } from '@/styles/palette';
import { buildQuery } from '@/api/client';

describe('text utils', () => {
  it('normalize saca tildes y pasa a minúsculas', () => {
    expect(normalize('  Córdoba ÑANDÚ ')).toBe('cordoba nandu');
  });

  it('titleCase respeta siglas y conectores', () => {
    expect(titleCase('UNIÓN POR LA PATRIA')).toBe('Unión por la Patria');
    expect(titleCase('UCR - UNIÓN CÍVICA RADICAL')).toBe('UCR - Unión Cívica Radical');
    expect(titleCase('PRO')).toBe('PRO');
  });

  it('nombreLegible invierte "APELLIDO, Nombre"', () => {
    expect(nombreLegible('AGUERO, Guillermo Cesar')).toBe('Guillermo Cesar Aguero');
  });
});

describe('bloqueStyle', () => {
  it('reconoce bloques actuales e históricos', () => {
    expect(bloqueStyle('LA LIBERTAD AVANZA').corto).toBe('LLA');
    expect(bloqueStyle('La Libertad Avanza').color).toBe(bloqueStyle('LA LIBERTAD AVANZA').color);
    expect(bloqueStyle('Frente de Todos').corto).toBe('UxP');
  });

  it('ordena izquierda antes que LLA', () => {
    expect(bloqueStyle('PTS-FRENTE DE IZQUIERDA').orden).toBeLessThan(
      bloqueStyle('LA LIBERTAD AVANZA').orden,
    );
  });

  it('asigna un color estable a bloques desconocidos', () => {
    expect(bloqueStyle('Bloque Inventado').color).toBe(bloqueStyle('BLOQUE INVENTADO').color);
  });
});

describe('buildQuery', () => {
  it('omite vacíos y false', () => {
    expect(buildQuery({ q: 'ley', page: 2, vacio: '', no: false, nada: undefined, si: true })).toBe(
      '?q=ley&page=2&si=true',
    );
  });
});
