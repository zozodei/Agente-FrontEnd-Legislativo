import { describe, expect, it } from 'vitest';
import {
  avanceViaje,
  BANCAS,
  CONTEO_FINAL,
  conteoEn,
  crearPorotos,
  radiosFilas,
} from './escenario';
import { crearProgreso } from './progreso';

describe('escenario de porotos de la portada', () => {
  const porotos = crearPorotos();

  it('crea un poroto por banca, con el reparto del ejemplo', () => {
    expect(porotos).toHaveLength(BANCAS);
    const total = Object.values(CONTEO_FINAL).reduce((a, b) => a + b, 0);
    expect(total).toBe(BANCAS);
    expect(conteoEn(porotos, 1)).toEqual(CONTEO_FINAL);
  });

  it('es determinista', () => {
    expect(crearPorotos()).toEqual(porotos);
  });

  it('al principio todo está en duda y el conteo avanza sin retroceder', () => {
    expect(conteoEn(porotos, 0)).toEqual({
      afirmativo: 0,
      negativo: 0,
      abstencion: 0,
      pendiente: BANCAS,
    });
    let previo = conteoEn(porotos, 0);
    for (let p = 0; p <= 1.0001; p += 0.01) {
      const c = conteoEn(porotos, p);
      expect(c.afirmativo).toBeGreaterThanOrEqual(previo.afirmativo);
      expect(c.negativo).toBeGreaterThanOrEqual(previo.negativo);
      expect(c.pendiente).toBeLessThanOrEqual(previo.pendiente);
      previo = c;
    }
  });

  it('cada poroto termina el viaje a su banca antes del final del scroll', () => {
    for (const po of porotos) {
      expect(avanceViaje(po.orden, 0)).toBe(0);
      expect(avanceViaje(po.orden, 0.6)).toBeCloseTo(1, 9);
    }
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
