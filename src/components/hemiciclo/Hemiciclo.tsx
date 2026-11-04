import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { bloqueStyle, VOTO_COLOR, VOTO_LABEL } from '@/styles/palette';
import { titleCase } from '@/utils/text';
import { Avatar } from '@/components/ui/Avatar';
import { computeLayout } from './layout';
import type { Banca, HemicicloModo } from './types';
import styles from './Hemiciclo.module.css';

export interface HemicicloProps {
  bancas: Banca[];
  modo: HemicicloModo;
  /** Etiqueta accesible que resume lo que muestra el gráfico. */
  ariaLabel: string;
  /** Poroteo: click (o tap) en una banca. */
  onBancaClick?: (banca: Banca) => void;
  /** Poroteo: arrastrar con el mouse "pinta" las bancas por las que pasa. */
  onBancaPaint?: (banca: Banca) => void;
  /** Si se pasa, las bancas que no están en el set se atenúan (filtros). */
  resaltadas?: Set<Banca['id']> | null;
  /** Contenido en el centro del arco (ej. un número grande). */
  centro?: ReactNode;
  className?: string;
}

const SCALE = 100;
const PAD = 4;

interface Hover {
  banca: Banca;
  x: number;
  y: number;
  sticky: boolean;
  below: boolean;
}

/**
 * Hemiciclo de la Cámara. Componente reutilizable con tres modos:
 *  - `bloques`:  color por bloque; click → perfil.
 *  - `votacion`: color por voto real; click → perfil (si sigue en funciones).
 *  - `poroteo`:  color por voto estimado; click/arrastre → cambia el voto.
 * Las bancas se agrupan por bloque (orden de izquierda a derecha definido en palette.ts).
 */
export function Hemiciclo({
  bancas,
  modo,
  ariaLabel,
  onBancaClick,
  onBancaPaint,
  resaltadas,
  centro,
  className,
}: HemicicloProps) {
  const navigate = useNavigate();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<Hover | null>(null);
  const painting = useRef(false);

  const ordenadas = useMemo(
    () =>
      [...bancas].sort((a, b) => {
        const sa = bloqueStyle(a.bloque);
        const sb = bloqueStyle(b.bloque);
        return (
          sa.orden - sb.orden ||
          (a.bloque ?? '').localeCompare(b.bloque ?? '', 'es') ||
          (a.orden ?? a.nombre).localeCompare(b.orden ?? b.nombre, 'es')
        );
      }),
    [bancas],
  );

  const layout = useMemo(() => computeLayout(ordenadas.length), [ordenadas.length]);
  const r = layout.seatRadius * SCALE;

  const colorDe = useCallback(
    (banca: Banca) => {
      if (modo === 'bloques') return bloqueStyle(banca.bloque).color;
      return VOTO_COLOR[banca.voto ?? 'INDEFINIDO'];
    },
    [modo],
  );

  const showTooltip = (banca: Banca, target: SVGCircleElement, sticky: boolean) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const a = target.getBoundingClientRect();
    const b = wrap.getBoundingClientRect();
    const half = Math.min(140, b.width / 2);
    const x = Math.min(Math.max(a.left + a.width / 2 - b.left, half), b.width - half);
    const below = a.top - b.top < 140;
    setHover({ banca, x, y: below ? a.bottom - b.top : a.top - b.top, sticky, below });
  };

  const handlePointerDown = (banca: Banca, e: React.PointerEvent<SVGCircleElement>) => {
    if (modo === 'poroteo') {
      if (e.pointerType === 'mouse') {
        painting.current = true;
        e.currentTarget.releasePointerCapture?.(e.pointerId);
      }
      onBancaClick?.(banca);
      showTooltip(banca, e.currentTarget, false);
      return;
    }
    // Táctil: el primer toque muestra la ficha (con link al perfil).
    if (e.pointerType !== 'mouse') {
      showTooltip(banca, e.currentTarget, true);
      return;
    }
    if (banca.href) navigate(banca.href);
  };

  const handlePointerEnter = (banca: Banca, e: React.PointerEvent<SVGCircleElement>) => {
    if (e.pointerType !== 'mouse') return;
    if (modo === 'poroteo' && painting.current && e.buttons === 1) onBancaPaint?.(banca);
    showTooltip(banca, e.currentTarget, false);
  };

  const width = 2 * SCALE + PAD * 2;
  const height = SCALE + PAD * 2 + r;

  return (
    <div
      ref={wrapRef}
      className={[styles.wrap, className].filter(Boolean).join(' ')}
      data-modo={modo}
      onPointerLeave={() => {
        painting.current = false;
        setHover((h) => (h?.sticky ? h : null));
      }}
      onPointerUp={() => {
        painting.current = false;
      }}
    >
      <svg
        className={styles.svg}
        viewBox={`${-SCALE - PAD} ${-SCALE - PAD} ${width} ${height}`}
        role="img"
        aria-label={ariaLabel}
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) setHover(null);
        }}
      >
        {ordenadas.map((banca, i) => {
          const seat = layout.seats[i];
          if (!seat) return null;
          const atenuada = resaltadas ? !resaltadas.has(banca.id) : false;
          const sinVoto = modo !== 'bloques' && (!banca.voto || banca.voto === 'INDEFINIDO');
          return (
            <circle
              key={banca.id}
              cx={seat.x * SCALE}
              cy={-seat.y * SCALE}
              r={r}
              style={{ fill: colorDe(banca) }}
              className={[
                styles.seat,
                atenuada && styles.dim,
                sinVoto && styles.empty,
                hover?.banca.id === banca.id && styles.active,
              ]
                .filter(Boolean)
                .join(' ')}
              onPointerDown={(e) => handlePointerDown(banca, e)}
              onPointerEnter={(e) => handlePointerEnter(banca, e)}
              onPointerLeave={() => setHover((h) => (h?.sticky ? h : null))}
            >
              <title>{`${banca.nombre} · ${titleCase(banca.bloque)}${banca.voto ? ` · ${VOTO_LABEL[banca.voto]}` : ''}`}</title>
            </circle>
          );
        })}
      </svg>

      {centro && <div className={styles.centro}>{centro}</div>}

      {hover && (
        <div
          className={styles.tooltip}
          style={{ left: hover.x, top: hover.y }}
          role="tooltip"
          data-sticky={hover.sticky || undefined}
          data-below={hover.below || undefined}
        >
          <Avatar src={hover.banca.fotoUrl} nombre={hover.banca.nombre} size={52} />
          <div className={styles.tooltipBody}>
            <strong className={styles.tooltipName}>{hover.banca.nombre}</strong>
            <span className={styles.tooltipMeta}>
              <i style={{ background: bloqueStyle(hover.banca.bloque).color }} aria-hidden />
              {titleCase(hover.banca.bloque)}
            </span>
            <span className={styles.tooltipMeta}>{titleCase(hover.banca.provincia)}</span>
            {modo !== 'bloques' && (
              <span
                className={styles.tooltipVoto}
                style={{ color: VOTO_COLOR[hover.banca.voto ?? 'INDEFINIDO'] }}
              >
                {VOTO_LABEL[hover.banca.voto ?? 'INDEFINIDO']}
              </span>
            )}
            {hover.sticky && hover.banca.href && (
              <Link className={styles.tooltipLink} to={hover.banca.href}>
                Ver perfil →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
