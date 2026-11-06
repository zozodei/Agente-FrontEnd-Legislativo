import { normalize } from '@/utils/text';
import type { VotoPoroteo, VotoReal } from '@/types';

/**
 * Colores de datos accesibles desde JS (SVG del hemiciclo, gráficos).
 * Los votos usan variables CSS → respetan modo claro/oscuro automáticamente.
 */
export const VOTO_COLOR: Record<VotoReal | VotoPoroteo, string> = {
  AFIRMATIVO: 'var(--voto-afirmativo)',
  NEGATIVO: 'var(--voto-negativo)',
  ABSTENCION: 'var(--voto-abstencion)',
  AUSENTE: 'var(--voto-ausente)',
  INDEFINIDO: 'var(--voto-indefinido)',
  PRESIDENTE: 'var(--voto-presidente)',
};

export const VOTO_LABEL: Record<VotoReal | VotoPoroteo, string> = {
  AFIRMATIVO: 'Afirmativo',
  NEGATIVO: 'Negativo',
  ABSTENCION: 'Abstención',
  AUSENTE: 'Ausente',
  INDEFINIDO: 'Indefinido',
  PRESIDENTE: 'Presidencia',
};

/**
 * Bloques: color + posición en el hemiciclo (izquierda → derecha).
 * Se matchea por regex sobre el nombre normalizado (sin tildes, minúsculas),
 * así funciona con los nombres actuales (MAYÚSCULAS) y los históricos de v_votos.
 * El orden es una convención visual aproximada, no una clasificación ideológica oficial.
 */
interface BloqueRule {
  match: RegExp;
  color: string;
  orden: number;
  corto?: string;
}

const BLOQUE_RULES: BloqueRule[] = [
  { match: /izquierda|obrero|pts|trabajadores/, color: '#9b1d20', orden: 0, corto: 'FIT-U' },
  {
    match: /union por la patria|frente de todos|frente para la victoria|justicialista|peronis/,
    color: '#2a7ab8',
    orden: 10,
    corto: 'UxP',
  },
  { match: /elijo catamarca/, color: '#5a9bd4', orden: 12 },
  { match: /independencia/, color: '#4c8c9e', orden: 13 },
  { match: /por santa cruz/, color: '#6a9fb5', orden: 14 },
  { match: /primero san luis/, color: '#7e8fb8', orden: 15 },
  { match: /defendamos cordoba/, color: '#8a6db3', orden: 20 },
  { match: /coherencia/, color: '#b07aa1', orden: 22 },
  { match: /argentina federal/, color: '#d67a2c', orden: 30 },
  { match: /provincias unidas/, color: '#1f9e89', orden: 32 },
  { match: /encuentro federal|hacemos/, color: '#3f6f8f', orden: 34 },
  { match: /produccion y trabajo/, color: '#8c7a3d', orden: 36 },
  { match: /neuquinidad|movimiento popular neuquino/, color: '#5e7d4a', orden: 38 },
  { match: /coalicion civica|\bcc\b/, color: '#58a55c', orden: 40, corto: 'CC' },
  { match: /\bucr\b|radical/, color: '#d1343b', orden: 50, corto: 'UCR' },
  { match: /adelante buenos aires/, color: '#c26b6b', orden: 52 },
  {
    match: /\bpro\b|propuesta republicana|cambiemos|juntos por el cambio/,
    color: '#d4a00e',
    orden: 60,
    corto: 'PRO',
  },
  { match: /\bmid\b|integracion y desarrollo/, color: '#9c6b30', orden: 65, corto: 'MID' },
  { match: /libertad avanza|libertad/, color: '#6c3fa0', orden: 70, corto: 'LLA' },
];

const FALLBACK_COLORS = ['#8a8577', '#6f7f73', '#7b6f86', '#86765f', '#5f7786', '#7f6a6a'];

function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) h = (h * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export interface BloqueStyle {
  color: string;
  orden: number;
  corto: string | null;
}

const cache = new Map<string, BloqueStyle>();

export function bloqueStyle(nombre: string | null | undefined): BloqueStyle {
  const key = normalize(nombre ?? '');
  const hit = cache.get(key);
  if (hit) return hit;
  const rule = BLOQUE_RULES.find((r) => r.match.test(key));
  const style: BloqueStyle = rule
    ? { color: rule.color, orden: rule.orden, corto: rule.corto ?? null }
    : { color: FALLBACK_COLORS[hash(key) % FALLBACK_COLORS.length], orden: 45, corto: null };
  cache.set(key, style);
  return style;
}

/** Colores por coalición (los que usa ¿Cómo Votó?). */
export const COALICION_COLOR: Record<string, string> = {
  PJ: '#2a7ab8',
  PRO: '#d4a00e',
  LLA: '#6c3fa0',
  UCR: '#d1343b',
  JxC: '#d4a00e',
  CC: '#58a55c',
  OTROS: '#8a8577',
};

export const COALICION_LABEL: Record<string, string> = {
  pj: 'Peronismo',
  pro: 'PRO',
  lla: 'La Libertad Avanza',
  ucr: 'UCR',
};

/** Colores oficiales del logo "G" de Google (guía de marca: no se alteran). */
export const GOOGLE_G = {
  azul: '#4285F4',
  verde: '#34A853',
  amarillo: '#FBBC05',
  rojo: '#EA4335',
} as const;
