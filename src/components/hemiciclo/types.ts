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
  /** Poroteo con IA: qué tan firme es la estimación (las dudosas se ven más tenues). */
  confianza?: 'alta' | 'media' | 'baja' | null;
  /** Poroteo con IA: el voto fue corregido a mano (anillo de tinta). */
  editado?: boolean;
}
