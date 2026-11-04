import type { VotoPoroteo, VotoReal } from '@/types';

export type HemicicloModo = 'bloques' | 'votacion' | 'poroteo';

/** Una banca del hemiciclo. Genérica: sirve para diputados actuales e históricos. */
export interface Banca {
  id: number | string;
  nombre: string;
  bloque: string | null;
  provincia: string | null;
  fotoUrl: string | null;
  voto?: VotoReal | VotoPoroteo | null;
  /** Link al perfil (modos bloques / votación). */
  href?: string | null;
  /** Para ordenar dentro del bloque (por defecto, nombre). */
  orden?: string;
}
