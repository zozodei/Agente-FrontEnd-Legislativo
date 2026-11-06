/*
 * Tipos compartidos. Reflejan exactamente los DTOs que devuelve el backend
 * (ver CLAUDE.md del backend, sección API). Si cambia el backend, cambiá esto.
 */

export type VotoReal = 'AFIRMATIVO' | 'NEGATIVO' | 'ABSTENCION' | 'AUSENTE' | 'PRESIDENTE';
export type VotoPoroteo = 'AFIRMATIVO' | 'NEGATIVO' | 'ABSTENCION' | 'AUSENTE' | 'INDEFINIDO';
export type ResultadoVotacion = 'AFIRMATIVO' | 'NEGATIVO' | 'EMPATE';
export type TipoMayoria = 'simple' | 'absoluta' | 'dos_tercios';
export type ResultadoPoroteo = 'APROBADO' | 'RECHAZADO' | 'SIN_QUORUM';

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

export interface Alineamiento {
  pj: number | null;
  pro: number | null;
  lla: number | null;
  ucr: number | null;
}

export interface Diputado {
  id: number;
  apellido: string;
  nombre: string;
  nombreCompleto: string;
  distrito: string;
  bloque: string;
  iniciaMandato: string;
  finalizaMandato: string;
  personaId: number | null;
  fotoUrl: string | null;
  coalicionHistorica: string | null;
  presentismo: number | null;
  totalVotaciones: number | null;
  ausencias: number | null;
  abstenciones: number | null;
  alineamiento: Alineamiento;
}

export interface Mandato {
  camara: string;
  desde: number | null;
  hasta: number | null;
  bloque: string | null;
  provincia: string | null;
  coalicion: string | null;
  alianza: string | null;
}

export interface StatsAnio {
  total: number;
  AFIRMATIVO: number;
  NEGATIVO: number;
  ABSTENCION: number;
  AUSENTE: number;
  PRESIDENTE: number;
}

export interface EstadisticasDiputado {
  total: number;
  conteo: {
    afirmativo: number;
    negativo: number;
    abstencion: number;
    ausente: number;
    presidente: number;
  };
  porcentaje: {
    afirmativo: number | null;
    negativo: number | null;
    abstencion: number | null;
    ausente: number | null;
  };
  alineacionBloque: { votaciones: number; coincidencias: number; porcentaje: number | null } | null;
  porAnio: Record<string, StatsAnio>;
}

export type AlineamientoAnual = Record<string, Record<string, number | null>>;

export interface DiputadoPerfil extends Diputado {
  mandatos: Mandato[];
  estadisticas: EstadisticasDiputado;
  alineamientoAnual: AlineamientoAnual;
  alineamientoEra: AlineamientoAnual;
}

export interface Posturas {
  pj: string | null;
  pro: string | null;
  lla: string | null;
  ucr: string | null;
}

export interface VotoHistorial {
  votacionId: number;
  fecha: string;
  anio: number;
  titulo: string;
  nombreLey: string | null;
  etiqueta: string | null;
  resultado: string | null;
  leyId: number | null;
  voto: VotoReal;
  bloque: string | null;
  coalicion: string | null;
  provincia: string | null;
  posturas: Posturas;
  url: string | null;
}

export interface Conteo {
  afirmativos: number;
  negativos: number;
  abstenciones: number;
  ausentes: number;
}

export interface Votacion {
  id: number;
  titulo: string;
  tituloActa: string | null;
  nombreLey: string | null;
  leyId: number | null;
  etiqueta: string | null;
  esGeneral: boolean;
  fecha: string;
  anio: number;
  resultado: ResultadoVotacion | null;
  resultadoOriginal: string | null;
  conteo: Conteo;
  porcentajes: Conteo;
  url: string | null;
}

export interface VotoEnVotacion {
  personaId: number;
  diputadoId: number | null;
  nombre: string;
  bloque: string | null;
  coalicion: string | null;
  provincia: string | null;
  voto: VotoReal;
  fotoUrl: string | null;
}

export interface BloqueEnVotacion {
  bloque: string;
  AFIRMATIVO: number;
  NEGATIVO: number;
  ABSTENCION: number;
  AUSENTE: number;
  PRESIDENTE: number;
  total: number;
}

export interface VotacionDetalle extends Votacion {
  keywords: string[];
  posturas: Posturas;
  ley: {
    id: number;
    nombre: string;
    anio: number | null;
    keywords: string[];
    cantidadVotaciones: number | null;
  } | null;
  votacionesDeLaLey: Array<{
    id: number;
    etiqueta: string | null;
    esGeneral: boolean;
    resultado: ResultadoVotacion | null;
    fecha: string;
  }>;
  porBloque: BloqueEnVotacion[];
  votos: VotoEnVotacion[];
}

export interface BloqueResumen {
  nombre: string;
  bancas: number;
}

export interface Resumen {
  camara: {
    bancas: number;
    diputados: number;
    quorum: number;
    bloques: number;
    primeraMinoria: BloqueResumen | null;
    presentismoPromedio: number | null;
    mandatosQueVencen: Record<string, number>;
  };
  composicion: BloqueResumen[];
  votaciones: {
    total: number;
    aprobadas: number;
    rechazadas: number;
    anioActual: { anio: number; total: number };
    ultimas: Votacion[];
  };
  fuente: {
    nombre: string;
    autor: string;
    sitio: string;
    repo: string;
    actualizado: string | null;
    cargado: string | null;
    commit: string | null;
  };
}

export interface ResumenPoroteo {
  tipoMayoria: TipoMayoria;
  conteo: Record<VotoPoroteo, number> & { sinAsignar: number };
  presentes: number;
  enDisputa: number;
  quorum: { requerido: number; alcanzado: boolean; faltan: number };
  mayoria: { requeridos: number; faltan: number };
  resultado: ResultadoPoroteo;
  escenarios: { mejorCaso: ResultadoPoroteo; peorCaso: ResultadoPoroteo };
  definido: boolean;
}

export interface Poroteo {
  id: string;
  titulo: string;
  descripcion: string | null;
  archivoNombre: string | null;
  camara: 'diputados' | 'senadores';
  tipoMayoria: TipoMayoria;
  estado: 'borrador' | 'final';
  origen: 'manual' | 'ia' | 'mixto';
  autor: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  resumen: ResumenPoroteo;
}

export interface PoroteoVoto {
  diputadoId: number;
  voto: VotoPoroteo;
  origen: 'manual' | 'ia';
  confianza: number | null;
  justificacion: string | null;
  fuentes: unknown[] | null;
  updatedAt: string;
}

export interface PoroteoDetalle extends Poroteo {
  textoProyecto: string | null;
  votos: PoroteoVoto[];
}

/* ── Autenticación ─────────────────────────────────────────────────────── */

export interface Usuario {
  id: string; // uuid
  email: string;
  nombre: string | null;
  createdAt?: string; // ISO; no viene en /auth/me
}

export interface Sesion {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // segundos (~3600)
  expiresAt: number; // timestamp Unix en SEGUNDOS (no ms)
  tokenType: 'bearer';
}

export interface AuthResponse {
  usuario: Usuario;
  sesion: Sesion;
}

export interface RegistroResponse {
  usuario: Usuario;
  /** null si el backend exige confirmar el email antes de entrar. */
  sesion: Sesion | null;
  requiereConfirmacion: boolean;
}
