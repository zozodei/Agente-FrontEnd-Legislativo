import type {
  AjusteManual,
  NivelConfianza,
  PoroteoDetalle,
  PrediccionDiputado,
  VotoPoroteo,
} from '@/types';

export const NIVEL_LABEL: Record<NivelConfianza, string> = {
  alta: 'Firme',
  media: 'Probable',
  baja: 'Dudosa',
};

export const NIVEL_AYUDA: Record<NivelConfianza, string> = {
  alta: 'La opción más probable supera el 75 %.',
  media: 'La opción más probable está entre el 50 % y el 75 %.',
  baja: 'Ninguna opción supera el 50 % o hay pocos datos del diputado.',
};

/** Voto final = ajuste pendiente (optimista) > voto guardado (ajuste vigente o predicción). */
export function votosFinales(
  poroteo: PoroteoDetalle,
  pendientes: Map<number, VotoPoroteo | null>,
  predicciones: Map<number, PrediccionDiputado>,
): Map<number, VotoPoroteo> {
  const mapa = new Map<number, VotoPoroteo>(poroteo.votos.map((v) => [v.diputadoId, v.voto]));
  for (const [id, voto] of pendientes) {
    if (voto === null) {
      const p = predicciones.get(id);
      if (p) mapa.set(id, p.voto);
      else mapa.delete(id);
    } else mapa.set(id, voto);
  }
  return mapa;
}

/** Diputados cuyo voto final no viene de la IA. */
export function editados(
  poroteo: PoroteoDetalle,
  pendientes: Map<number, VotoPoroteo | null>,
): Set<number> {
  const set = new Set(poroteo.votos.filter((v) => v.origen === 'manual').map((v) => v.diputadoId));
  for (const [id, voto] of pendientes) {
    if (voto === null) set.delete(id);
    else set.add(id);
  }
  return set;
}

export function historialDe(historial: AjusteManual[], diputadoId: number) {
  return historial.filter((a) => a.diputadoId === diputadoId).reverse();
}

export const pct = (x: number) => `${Math.round(x * 100)} %`;

/** Temas del clasificador del backend (src/prediccion/proyecto.js). */
export const TEMAS: Record<string, string> = {
  procedimiento: 'Procedimiento parlamentario',
  economia: 'Economía, impuestos y presupuesto',
  trabajo: 'Trabajo y previsión social',
  salud: 'Salud',
  discapacidad: 'Discapacidad y desarrollo social',
  educacion: 'Educación, ciencia y cultura',
  seguridad: 'Seguridad y justicia penal',
  justicia: 'Justicia e instituciones',
  derechos: 'Derechos humanos y género',
  ambiente: 'Ambiente y energía',
  produccion: 'Producción, agro e industria',
  infraestructura: 'Infraestructura, transporte y comunicaciones',
  exterior: 'Relaciones exteriores y defensa',
  simbolico: 'Declaraciones, homenajes y transferencias',
  otros: 'Otros temas',
};
