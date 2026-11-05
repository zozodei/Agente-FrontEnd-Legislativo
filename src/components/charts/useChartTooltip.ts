import { useCallback, useRef, useState, type ReactNode } from 'react';

/**
 * Tooltip compartido por los gráficos. Se posiciona relativo al contenedor
 * del gráfico (`wrapRef`) siguiendo al mouse o al elemento enfocado con teclado.
 */
export interface TooltipState {
  x: number;
  y: number;
  content: ReactNode;
}

export function useChartTooltip<T extends HTMLElement = HTMLDivElement>() {
  const wrapRef = useRef<T>(null);
  const [tip, setTip] = useState<TooltipState | null>(null);

  const showAt = useCallback((target: Element, content: ReactNode, clientX?: number) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const box = wrap.getBoundingClientRect();
    const r = target.getBoundingClientRect();
    const x = (clientX ?? r.left + r.width / 2) - box.left;
    setTip({ x: Math.max(8, Math.min(box.width - 8, x)), y: r.top - box.top, content });
  }, []);

  const hide = useCallback(() => setTip(null), []);

  /** Props listas para un elemento con hover + foco de teclado. */
  const bind = useCallback(
    (content: ReactNode) => ({
      onMouseMove: (e: React.MouseEvent) => showAt(e.currentTarget, content, e.clientX),
      onMouseLeave: hide,
      onFocus: (e: React.FocusEvent) => showAt(e.currentTarget, content),
      onBlur: hide,
    }),
    [showAt, hide],
  );

  return { wrapRef, tip, bind, hide };
}
