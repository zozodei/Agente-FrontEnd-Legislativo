/**
 * Geometría del hemiciclo: distribuye N bancas en filas concéntricas de un semicírculo.
 *
 * - Cada fila tiene una cantidad de bancas proporcional a su radio (las de afuera tienen más).
 * - Las posiciones se ordenan por ángulo (de izquierda a derecha) para que, al asignar
 *   los diputados ordenados por bloque, cada bloque quede como una "porción" del arco.
 *
 * Coordenadas: centro en (0, 0), radio exterior = 1, y hacia arriba (positivo).
 * El componente las escala y da vuelta el eje Y para dibujar en SVG.
 */

export interface SeatPosition {
  x: number;
  y: number;
  angle: number;
  row: number;
}

export interface HemicicloLayout {
  seats: SeatPosition[];
  seatRadius: number;
  rows: number;
}

const INNER_RATIO = 0.36;

export function rowsFor(n: number): number {
  return Math.max(3, Math.round(Math.sqrt(n / 2.6)));
}

export function computeLayout(n: number, requestedRows = rowsFor(n)): HemicicloLayout {
  if (n <= 0) return { seats: [], seatRadius: 0, rows: 0 };
  // Nunca más filas que bancas: cada fila necesita al menos una.
  const rows = Math.max(1, Math.min(requestedRows, n));

  const radii = Array.from({ length: rows }, (_, i) =>
    rows === 1 ? 1 : INNER_RATIO + ((1 - INNER_RATIO) * i) / (rows - 1),
  );
  const totalRadius = radii.reduce((a, b) => a + b, 0);

  // Bancas por fila, proporcional al radio; el redondeo se corrige en las filas externas.
  const perRow = radii.map((r) => Math.max(1, Math.round((n * r) / totalRadius)));
  let diff = n - perRow.reduce((a, b) => a + b, 0);
  for (let i = rows - 1; diff !== 0; i = (i - 1 + rows) % rows) {
    const step = diff > 0 ? 1 : -1;
    if (perRow[i] + step >= 1) {
      perRow[i] += step;
      diff -= step;
    }
  }

  const seats: SeatPosition[] = [];
  radii.forEach((r, row) => {
    const k = perRow[row];
    for (let j = 0; j < k; j += 1) {
      const angle = k === 1 ? Math.PI / 2 : Math.PI * (1 - j / (k - 1));
      seats.push({ x: r * Math.cos(angle), y: r * Math.sin(angle), angle, row });
    }
  });

  // Izquierda → derecha; a igual ángulo, de adentro hacia afuera.
  seats.sort((a, b) => b.angle - a.angle || a.row - b.row);

  const rowGap = rows === 1 ? 0.2 : (1 - INNER_RATIO) / (rows - 1);
  const outerArc = Math.PI / Math.max(1, perRow[rows - 1] - 1);
  const seatRadius = Math.min(rowGap, outerArc) * 0.42;

  return { seats, seatRadius, rows };
}
