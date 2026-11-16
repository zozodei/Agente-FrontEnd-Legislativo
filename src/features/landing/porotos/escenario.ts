import { computeLayout } from '@/components/hemiciclo/layout';

/**
 * Escenario de ejemplo de la portada, en datos puros (sin three.js) para poder testearlo.
 *
 * Cada poroto tiene dos lugares: el montón donde cae al cargar la página y su banca en el
 * hemiciclo. Al scrollear, viajan del montón a las bancas y después se "porotean": se pintan
 * de izquierda a derecha hasta llegar al conteo final del ejemplo.
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

export interface Poroto {
  /** Posición de la banca sobre el piso (y = 0). */
  banca: { x: number; z: number };
  /** Hacia dónde mira el poroto en su banca (tangente al arco). */
  giroBanca: number;
  /** Posición en el montón inicial. */
  monton: { x: number; y: number; z: number };
  /** Rotación (euler XYZ) en el montón. */
  giroMonton: [number, number, number];
  /** Retraso de la caída inicial, en segundos. */
  retrasoCaida: number;
  /** 0..1: cuándo viaja a su banca y cuándo se pinta (izquierda → derecha). */
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

export function crearPorotos(semilla = 257): Poroto[] {
  const rand = prng(semilla);
  const { seats } = computeLayout(BANCAS);

  // Votos: agrupados por porción del arco (como los bloques), con algo de ruido para que
  // haya disidencias. Los indecisos quedan en la franja del medio, que es donde se define.
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

  return seats.map((seat, i) => {
    // Montón: un cono bajo en la boca del hemiciclo, donde estaría la presidencia.
    const r = Math.sqrt(rand()) * 1.25;
    const a = rand() * Math.PI * 2;
    const altura = (1 - r / 1.25) * 0.55 + rand() * 0.08;
    return {
      banca: { x: seat.x * RADIO, z: -seat.y * RADIO + CENTRO_Z },
      giroBanca: seat.angle + Math.PI / 2 + (rand() - 0.5) * 0.35,
      monton: { x: Math.cos(a) * r * 1.3, y: 0.06 + altura, z: 2.1 + Math.sin(a) * r * 0.7 },
      giroMonton: [(rand() - 0.5) * 1.4, rand() * Math.PI * 2, (rand() - 0.5) * 1.4],
      retrasoCaida: rand() * 0.9,
      orden: i / (BANCAS - 1),
      voto: votos[i],
    };
  });
}

/** Radio de cada fila del hemiciclo, en unidades de la escena (para dibujar las gradas). */
export function radiosFilas(): number[] {
  const { seats, rows } = computeLayout(BANCAS);
  const radios = new Array<number>(rows).fill(0);
  for (const s of seats) radios[s.row] = Math.hypot(s.x, s.y) * RADIO;
  return radios;
}

/** Desplazamiento del centro del hemiciclo hacia la cámara (eje z de la escena). */
export const CENTRO_Z = 1.2;

/**
 * Tramos del progreso de scroll (0..1):
 * - viaje: los porotos van del montón a su banca;
 * - poroteo: se pintan uno por uno.
 */
export const TRAMO_VIAJE = { desde: 0, hasta: 0.6, ancho: 0.22 } as const;
export const TRAMO_POROTEO = { desde: 0.55, hasta: 0.97 } as const;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Avance (0..1) del viaje de un poroto, según el progreso general. */
export function avanceViaje(orden: number, progreso: number): number {
  const { desde, hasta, ancho } = TRAMO_VIAJE;
  const inicio = desde + orden * (hasta - desde - ancho);
  return clamp01((progreso - inicio) / ancho);
}

/** Avance (0..1) del poroteo completo. */
export function avancePoroteo(progreso: number): number {
  const { desde, hasta } = TRAMO_POROTEO;
  return clamp01((progreso - desde) / (hasta - desde));
}

/** ¿Este poroto ya tiene voto asignado? */
export function estaPintado(orden: number, progreso: number): boolean {
  const p = avancePoroteo(progreso);
  return p > 0 && orden <= p;
}

/** Conteo visible para un progreso: lo no pintado todavía cuenta como "en duda". */
export function conteoEn(porotos: Poroto[], progreso: number): Record<VotoEjemplo, number> {
  const conteo: Record<VotoEjemplo, number> = {
    afirmativo: 0,
    negativo: 0,
    abstencion: 0,
    pendiente: 0,
  };
  for (const p of porotos) {
    conteo[estaPintado(p.orden, progreso) ? p.voto : 'pendiente'] += 1;
  }
  return conteo;
}
