import { describe, expect, it } from 'vitest';
import { computeLayout, rowsFor } from './layout';

describe('computeLayout', () => {
  it.each([257, 72, 10, 1])('genera exactamente %i bancas', (n) => {
    expect(computeLayout(n).seats).toHaveLength(n);
  });

  it('usa 10 filas para Diputados y 5 para el Senado', () => {
    expect(rowsFor(257)).toBe(10);
    expect(rowsFor(72)).toBe(5);
  });

  it('ordena las bancas de izquierda a derecha', () => {
    const { seats } = computeLayout(257);
    for (let i = 1; i < seats.length; i += 1) {
      expect(seats[i].angle).toBeLessThanOrEqual(seats[i - 1].angle);
    }
  });

  it('todas las bancas quedan dentro del semicírculo', () => {
    for (const s of computeLayout(257).seats) {
      expect(s.y).toBeGreaterThanOrEqual(-1e-9);
      expect(Math.hypot(s.x, s.y)).toBeLessThanOrEqual(1 + 1e-9);
    }
  });

  it('las bancas no se superponen', () => {
    const { seats, seatRadius } = computeLayout(257);
    let min = Infinity;
    for (let i = 0; i < seats.length; i += 1) {
      for (let j = i + 1; j < seats.length; j += 1) {
        min = Math.min(min, Math.hypot(seats[i].x - seats[j].x, seats[i].y - seats[j].y));
      }
    }
    expect(min).toBeGreaterThan(seatRadius * 2);
  });

  it('n = 0 devuelve un layout vacío', () => {
    expect(computeLayout(0).seats).toEqual([]);
  });
});
