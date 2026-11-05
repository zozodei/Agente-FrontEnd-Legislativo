/*
 * Primitivas de gráficos (HTML + CSS, sin librerías). Reglas en CLAUDE.md §6:
 * marcas finas, 2px de separación entre partes, el texto nunca lleva el color
 * del dato, tooltip con hover y teclado, y siempre una alternativa en texto/tabla.
 */
export { ChartTooltip, TooltipBody } from './ChartTooltip';
export { useChartTooltip, type TooltipState } from './useChartTooltip';
export { DotScale, type DotScaleRow, type DotScalePoint } from './DotScale';
export { SegmentedBar, type Segment } from './SegmentedBar';
export { StackedRows, type StackedGap, type StackedRow, type StackedSeries } from './StackedRows';
