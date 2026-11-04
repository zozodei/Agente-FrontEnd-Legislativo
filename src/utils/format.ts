const nf = new Intl.NumberFormat('es-AR');
const nf1 = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const formatNumber = (n: number | null | undefined) =>
  n === null || n === undefined ? '—' : nf.format(n);

export const formatPct = (n: number | null | undefined) =>
  n === null || n === undefined ? '—' : `${nf1.format(n)}%`;

/** Las fechas de la base vienen sin zona horaria ("2026-10-22T03:28:00"): se muestran tal cual. */
function parseLocal(iso: string): Date {
  const [d, t = '00:00:00'] = iso.split('T');
  const [y, m, day] = d.split('-').map(Number);
  const [hh, mm] = t.split(':').map(Number);
  return new Date(y, m - 1, day, hh || 0, mm || 0);
}

const dateLong = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const dateShort = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

export const formatDate = (iso: string | null | undefined) =>
  iso ? dateLong.format(parseLocal(iso)) : '—';
/** "22 oct 2026": compacto, para listas. */
export function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return '—';
  const parts = dateShort.formatToParts(parseLocal(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('day')} ${get('month').replace('.', '')} ${get('year')}`;
}

export function formatTime(iso: string | null | undefined): string {
  if (!iso || !iso.includes('T')) return '';
  return iso.split('T')[1].slice(0, 5);
}

/** Fechas con zona (timestamptz, ej. updatedAt de poroteos). */
const relative = new Intl.RelativeTimeFormat('es-AR', { numeric: 'auto' });
export function formatRelative(iso: string): string {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const abs = Math.abs(diff);
  if (abs < 60) return relative.format(Math.round(diff), 'second');
  if (abs < 3600) return relative.format(Math.round(diff / 60), 'minute');
  if (abs < 86400) return relative.format(Math.round(diff / 3600), 'hour');
  if (abs < 86400 * 30) return relative.format(Math.round(diff / 86400), 'day');
  return dateShort.format(new Date(iso));
}
