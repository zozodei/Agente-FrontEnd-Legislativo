import { describe, expect, it } from 'vitest';
import {
  avanceCamara,
  avanceVotacion,
  BANCAS,
  CONTEO_FINAL,
  conteoEn,
  crearBancas,
  radiosFilas,
  TRAMO_CAMARA,
  TRAMO_VOTACION,
} from './escenario';
import { crearProgreso } from './progreso';

describe('tablero de votación de la portada', () => {
  const bancas = crearBancas();

  it('crea las 257 bancas, con el reparto del ejemplo', () => {
    expect(bancas).toHaveLength(BANCAS);
    const total = Object.values(CONTEO_FINAL).reduce((a, b) => a + b, 0);
    expect(total).toBe(BANCAS);
    expect(conteoEn(bancas, 1)).toEqual(CONTEO_FINAL);
  });

  it('es determinista', () => {
    expect(crearBancas()).toEqual(bancas);
  });

  it('al principio todo está en duda y el conteo avanza sin retroceder', () => {
    expect(conteoEn(bancas, 0)).toEqual({
      afirmativo: 0,
      negativo: 0,
      abstencion: 0,
      pendiente: BANCAS,
    });
    let previo = conteoEn(bancas, 0);
    for (let p = 0; p <= 1.0001; p += 0.01) {
      const c = conteoEn(bancas, p);
      expect(c.afirmativo).toBeGreaterThanOrEqual(previo.afirmativo);
      expect(c.negativo).toBeGreaterThanOrEqual(previo.negativo);
      expect(c.pendiente).toBeLessThanOrEqual(previo.pendiente);
      previo = c;
    }
  });

  it('la cámara llega a la vista cenital antes de que termine la votación', () => {
    expect(avanceCamara(0)).toBe(0);
    expect(avanceCamara(TRAMO_CAMARA.hasta)).toBe(1);
    expect(TRAMO_CAMARA.hasta).toBeLessThan(TRAMO_VOTACION.hasta);
    expect(avanceVotacion(1)).toBe(1);
  });

  it('las bancas quedan dentro del radio de las filas', () => {
    const radios = radiosFilas();
    expect(radios.length).toBeGreaterThan(0);
    expect(Math.max(...radios)).toBeCloseTo(4.2, 5);
  });
});

describe('progreso compartido', () => {
  it('avisa a los suscriptores solo cuando cambia', () => {
    const progreso = crearProgreso();
    const vistos: number[] = [];
    const cancelar = progreso.suscribir((v) => vistos.push(v));
    progreso.set(0.5);
    progreso.set(0.5);
    progreso.set(1);
    cancelar();
    progreso.set(0.2);
    expect(vistos).toEqual([0.5, 1]);
    expect(progreso.valor).toBe(0.2);
  });
});
