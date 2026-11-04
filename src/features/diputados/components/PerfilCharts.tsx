import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts';
import { COALICION_COLOR, VOTO_COLOR, VOTO_LABEL } from '@/styles/palette';
import type { AlineamientoAnual, StatsAnio } from '@/types';
import { Leyenda } from '@/components/hemiciclo';
import styles from './PerfilCharts.module.css';

const AXIS = { stroke: 'var(--ink-3)', fontSize: 11, fontFamily: 'var(--font-mono)' };

/* ── Alineamiento anual con cada coalición ───────────────────────────────── */

const COALICIONES = [
  { key: 'PJ', label: 'Peronismo' },
  { key: 'PRO', label: 'PRO' },
  { key: 'LLA', label: 'LLA' },
  { key: 'UCR', label: 'UCR' },
] as const;

export function AlineamientoChart({ data }: { data: AlineamientoAnual }) {
  const [tabla, setTabla] = useState(false);
  const rows = useMemo(
    () =>
      Object.entries(data)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([anio, v]) => ({
          anio,
          PJ: v.PJ ?? null,
          PRO: v.PRO ?? null,
          LLA: v.LLA ?? null,
          UCR: v.UCR ?? null,
        })),
    [data],
  );
  const series = COALICIONES.filter((c) => rows.some((r) => r[c.key] !== null));
  if (rows.length === 0 || series.length === 0)
    return <p className={styles.empty}>Sin datos de alineamiento.</p>;

  return (
    <figure className={styles.figure}>
      <Leyenda
        compacta
        items={series.map((s) => ({ key: s.key, label: s.label, color: COALICION_COLOR[s.key] }))}
      />
      {tabla ? (
        <TablaAlineamiento rows={rows} series={series.map((s) => s.key)} />
      ) : (
        <div className={styles.chart} style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 12, right: 12, bottom: 0, left: -18 }}>
              <CartesianGrid vertical={false} stroke="var(--rule)" strokeDasharray="2 4" />
              <XAxis
                dataKey="anio"
                tick={AXIS}
                tickLine={false}
                axisLine={{ stroke: 'var(--rule)' }}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tick={AXIS}
                tickLine={false}
                axisLine={false}
                unit="%"
              />
              <Tooltip
                content={<ChartTooltip suffix="%" />}
                cursor={{ stroke: 'var(--ink-3)', strokeWidth: 1 }}
              />
              {series.map((s) => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stroke={COALICION_COLOR[s.key]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, stroke: 'var(--surface)', strokeWidth: 2 }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <figcaption className={styles.caption}>
        % de votaciones de cada año en las que votó igual que la mayoría de cada coalición.{' '}
        <button type="button" className={styles.toggle} onClick={() => setTabla((t) => !t)}>
          {tabla ? 'Ver gráfico' : 'Ver como tabla'}
        </button>
      </figcaption>
    </figure>
  );
}

function TablaAlineamiento({
  rows,
  series,
}: {
  rows: Array<Record<string, string | number | null>>;
  series: string[];
}) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Año</th>
            {series.map((s) => (
              <th key={s}>{s}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={String(r.anio)}>
              <td>{r.anio}</td>
              {series.map((s) => (
                <td key={s}>{r[s] === null ? '—' : `${r[s]}%`}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Votos por año (barras apiladas) ─────────────────────────────────────── */

const VOTOS_SERIES = ['AFIRMATIVO', 'NEGATIVO', 'ABSTENCION', 'AUSENTE'] as const;

export function VotosPorAnioChart({ data }: { data: Record<string, StatsAnio> }) {
  const rows = useMemo(
    () =>
      Object.entries(data)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([anio, v]) => ({ anio, ...v })),
    [data],
  );
  if (rows.length === 0) return <p className={styles.empty}>Sin votaciones registradas.</p>;

  return (
    <figure className={styles.figure}>
      <Leyenda
        compacta
        items={VOTOS_SERIES.map((v) => ({ key: v, label: VOTO_LABEL[v], color: VOTO_COLOR[v] }))}
      />
      <div className={styles.chart} style={{ height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            margin={{ top: 12, right: 12, bottom: 0, left: -18 }}
            barCategoryGap="18%"
          >
            <CartesianGrid vertical={false} stroke="var(--rule)" strokeDasharray="2 4" />
            <XAxis
              dataKey="anio"
              tick={AXIS}
              tickLine={false}
              axisLine={{ stroke: 'var(--rule)' }}
            />
            <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--paper-sunken)' }} />
            {VOTOS_SERIES.map((v, i) => (
              <Bar
                key={v}
                dataKey={v}
                name={VOTO_LABEL[v]}
                stackId="votos"
                fill={VOTO_COLOR[v]}
                stroke="var(--paper)"
                strokeWidth={1}
                radius={i === VOTOS_SERIES.length - 1 ? [3, 3, 0, 0] : 0}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className={styles.caption}>
        Cantidad de votaciones nominales por año y cómo votó en cada una.
      </figcaption>
    </figure>
  );
}

/* ── Tooltip compartido ─────────────────────────────────────────────────── */

function ChartTooltip({
  active,
  payload,
  label,
  suffix = '',
}: TooltipProps<number, string> & { suffix?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      <span className={styles.tooltipTitle}>{label}</span>
      {payload
        .filter((p) => p.value !== null && p.value !== undefined)
        .map((p) => (
          <span key={String(p.dataKey)} className={styles.tooltipRow}>
            <i style={{ background: p.color }} aria-hidden />
            <span>{p.name}</span>
            <strong className="num">
              {p.value}
              {suffix}
            </strong>
          </span>
        ))}
    </div>
  );
}
