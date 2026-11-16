import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function leer(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(QUERY).matches
    : false;
}

/** `true` si la persona pidió reducir el movimiento (se actualiza en vivo). */
export function useReducedMotion(): boolean {
  const [reducido, setReducido] = useState(leer);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(QUERY);
    const cambio = () => setReducido(mq.matches);
    mq.addEventListener('change', cambio);
    return () => mq.removeEventListener('change', cambio);
  }, []);
  return reducido;
}
