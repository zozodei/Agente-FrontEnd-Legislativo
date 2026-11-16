import { bloqueStyle } from '@/styles/palette';
import type { VotoEnVotacion } from '@/types';
import { crearBancas } from '../tablero/escenario';
import type { Asiento } from './comun';

/**
 * Portada 1 · Votación real. Datos puros: reparte los votos reales de una votación en las
 * 257 bancas (agrupados por bloque, como el hemiciclo) y decide en qué orden se encienden
 * (aleatorio y determinista: así votan los diputados, no de izquierda a derecha).
 */

/** IVE, 14/06/2018: 129 a 125, la media sanción más ajustada de la serie. */
export const VOTACION_DESTACADA = 1516;

export type VotoBanca = 'afirmativo' | 'negativo' | 'abstencion' | 'ausente' | 'presidente';

export interface BancaVotada extends Asiento {
  voto: VotoBanca;
  /** 0..1: cuándo se enciende su pantalla. */
  orden: number;
  nombre: string;
}

const VOTO: Record<string, VotoBanca> = {
  AFIRMATIVO: 'afirmativo',
  NEGATIVO: 'negativo',
  ABSTENCION: 'abstencion',
  AUSENTE: 'ausente',
  PRESIDENTE: 'presidente',
};

function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function repartirVotos(votos: VotoEnVotacion[], semilla = 2018): BancaVotada[] {
  const asientos = crearBancas();
  const ordenados = [...votos].sort(
    (a, b) =>
      bloqueStyle(a.bloque).orden - bloqueStyle(b.bloque).orden ||
      (a.bloque ?? '').localeCompare(b.bloque ?? '') ||
      a.nombre.localeCompare(b.nombre),
  );
  const rand = prng(semilla);
  const n = Math.min(asientos.length, ordenados.length);
  // Permutación aleatoria de los turnos de encendido.
  const turnos = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [turnos[i], turnos[j]] = [turnos[j], turnos[i]];
  }
  return Array.from({ length: n }, (_, i) => ({
    x: asientos[i].x,
    z: asientos[i].z,
    giro: asientos[i].giro,
    voto: VOTO[ordenados[i].voto] ?? 'ausente',
    orden: n > 1 ? turnos[i] / (n - 1) : 0,
    nombre: ordenados[i].nombre,
  }));
}

/** Tramo del scroll en el que se vota (las pantallas se encienden). */
export const TRAMO_VOTO = { desde: 0.12, hasta: 0.78 } as const;

export function avanceVoto(p: number): number {
  return Math.min(1, Math.max(0, (p - TRAMO_VOTO.desde) / (TRAMO_VOTO.hasta - TRAMO_VOTO.desde)));
}

export type ConteoReal = Record<VotoBanca, number>;

export function conteoReal(bancas: BancaVotada[], p: number): ConteoReal {
  const c: ConteoReal = { afirmativo: 0, negativo: 0, abstencion: 0, ausente: 0, presidente: 0 };
  const v = avanceVoto(p);
  if (v <= 0) return c;
  for (const b of bancas) if (b.orden <= v) c[b.voto] += 1;
  return c;
}
