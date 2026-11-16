import { computeLayout } from '@/components/hemiciclo/layout';

/**
 * Escenario de ejemplo de la portada, en datos puros (sin three.js) para poder testearlo.
 *
 * El recinto como tablero de votación electrónica: cada banca es un pupitre con una luz.
 * Al cargar, los pupitres se levantan fila por fila; al scrollear, la cámara sube hasta la
 * vista cenital y las luces se encienden banca por banca (izquierda → derecha) hasta llegar
 * al conteo final del ejemplo.
 */

export type VotoEjemplo = 'afirmativo' | 'negativo' | 'abstencion' | 'pendiente';

export const BANCAS = 257;
export const QUORUM = 129;

/** Conteo final del escenario inventado (rotulado como ejemplo en la UI). */
export const CONTEO_FINAL: Record<VotoEjemplo, number> = {
  afirmativo: 131,
  negativo: 98,
  abstencion: 6,
  pendiente: 22,
};

/** Radio del hemiciclo en unidades de la escena. */
export const RADIO = 4.2;
/** Desplazamiento del centro del hemiciclo hacia la cámara (eje z de la escena). */
export const CENTRO_Z = 1.2;

export interface Banca3D {
  x: number;
  z: number;
  /** Giro (rad, eje y) para que el pupitre mire al centro del hemiciclo. */
  giro: number;
  fila: number;
  /** Retraso (s) con el que se levanta al cargar: de adentro hacia afuera. */
  retrasoSubida: number;
  /** 0..1: cuándo se enciende su luz (izquierda → derecha). */
  orden: number;
  voto: VotoEjemplo;
}

/** PRNG determinista (mulberry32): el escenario es siempre el mismo. */
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

export function crearBancas(semilla = 257): Banca3D[] {
  const rand = prng(semilla);
  const { seats, rows } = computeLayout(BANCAS);

  // Votos agrupados por porción del arco (como los bloques), con ruido para que haya
  // disidencias. Los indecisos quedan en la franja del medio, que es donde se define.
  const puntaje = seats.map((_, i) => ({ i, s: i / BANCAS + (rand() - 0.5) * 0.32 }));
  puntaje.sort((a, b) => a.s - b.s);
  const votos: VotoEjemplo[] = new Array(BANCAS);
  const cortes: [VotoEjemplo, number][] = [
    ['afirmativo', CONTEO_FINAL.afirmativo],
    ['pendiente', CONTEO_FINAL.pendiente],
    ['abstencion', CONTEO_FINAL.abstencion],
    ['negativo', CONTEO_FINAL.negativo],
  ];
  let k = 0;
  for (const [voto, n] of cortes) {
    for (let j = 0; j < n; j += 1) votos[puntaje[k++].i] = voto;
  }

  return seats.map((seat, i) => ({
    x: seat.x * RADIO,
    z: -seat.y * RADIO + CENTRO_Z,
    // Mirando al centro: el frente del pupitre (eje -z local) apunta hacia la presidencia.
    giro: seat.angle + Math.PI / 2,
    fila: seat.row,
    retrasoSubida: (seat.row / Math.max(1, rows - 1)) * 0.7 + rand() * 0.18,
    orden: i / (BANCAS - 1),
    voto: votos[i],
  }));
}

/** Radio de cada fila del hemiciclo, en unidades de la escena (para dibujar las gradas). */
export function radiosFilas(): number[] {
  const { seats, rows } = computeLayout(BANCAS);
  const radios = new Array<number>(rows).fill(0);
  for (const s of seats) radios[s.row] = Math.hypot(s.x, s.y) * RADIO;
  return radios;
}

/**
 * Tramos del progreso de scroll (0..1):
 * - cámara: de una toma baja, a la altura de las bancas, a la vista cenital del tablero;
 * - votación: las luces se encienden una por una.
 */
export const TRAMO_CAMARA = { desde: 0, hasta: 0.75 } as const;
export const TRAMO_VOTACION = { desde: 0.15, hasta: 0.95 } as const;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function avanceCamara(progreso: number): number {
  const { desde, hasta } = TRAMO_CAMARA;
  return clamp01((progreso - desde) / (hasta - desde));
}

/** Avance (0..1) de la votación completa. */
export function avanceVotacion(progreso: number): number {
  const { desde, hasta } = TRAMO_VOTACION;
  return clamp01((progreso - desde) / (hasta - desde));
}

/** ¿La luz de esta banca ya se encendió? */
export function estaEncendida(orden: number, progreso: number): boolean {
  const p = avanceVotacion(progreso);
  return p > 0 && orden <= p;
}

/** Conteo visible para un progreso: las bancas sin luz todavía cuentan como "en duda". */
export function conteoEn(bancas: Banca3D[], progreso: number): Record<VotoEjemplo, number> {
  const conteo: Record<VotoEjemplo, number> = {
    afirmativo: 0,
    negativo: 0,
    abstencion: 0,
    pendiente: 0,
  };
  for (const b of bancas) {
    conteo[estaEncendida(b.orden, progreso) ? b.voto : 'pendiente'] += 1;
  }
  return conteo;
}
