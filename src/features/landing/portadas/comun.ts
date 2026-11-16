import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import * as THREE from 'three';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { gsap, useGSAP } from '@/utils/gsap';
import { crearProgreso, type Progreso } from '../tablero/progreso';

/**
 * Lógica compartida por las portadas 3D candidatas (ver PortadasPage): colores desde tokens
 * CSS, progreso del scroll de un riel, visibilidad y tipos. Los componentes 3D compartidos
 * están en piezas.tsx.
 */

/* ── Colores desde tokens ─────────────────────────────────────────── */

export function leerTokens<K extends string>(tokens: Record<K, string>): Record<K, THREE.Color> {
  const css = getComputedStyle(document.documentElement);
  const out = {} as Record<K, THREE.Color>;
  for (const k of Object.keys(tokens) as K[]) {
    out[k] = new THREE.Color(css.getPropertyValue(tokens[k]).trim() || 'gray');
  }
  return out;
}

/** Colores de tokens CSS como THREE.Color; se releen al cambiar el tema. */
export function useTokens<K extends string>(tokens: Record<K, string>, onCambio?: () => void) {
  const ref = useRef<Record<K, THREE.Color>>(leerTokens(tokens));
  useEffect(() => {
    const releer = () => {
      ref.current = leerTokens(tokens);
      onCambio?.();
    };
    const obs = new MutationObserver(releer);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', releer);
    return () => {
      obs.disconnect();
      mq.removeEventListener('change', releer);
    };
  }, [tokens, onCambio]);
  return ref;
}

export const TOKENS_VOTO = {
  afirmativo: '--voto-afirmativo',
  negativo: '--voto-negativo',
  abstencion: '--voto-abstencion',
  ausente: '--voto-ausente',
  apagada: '--noche-rule',
  enDuda: '--noche-ink-2',
  cielo: '--noche-ink',
  suelo: '--noche',
  noche2: '--noche-2',
  sol: '--sol',
  celeste: '--celeste',
} as const;

/* ── Progreso del scroll ─────────────────────────────────────────── */

/**
 * Progreso 0..1 del recorrido de un riel (contenedor alto con la portada sticky adentro).
 * Con movimiento reducido queda en 1 (estado final). No re-renderiza React en cada cuadro.
 */
export function useProgresoRiel(riel: RefObject<HTMLElement | null>): {
  progreso: Progreso;
  reducido: boolean;
} {
  const reducido = useReducedMotion();
  const progreso = useMemo(() => crearProgreso(0), []);
  useGSAP(
    () => {
      if (reducido || !riel.current) {
        progreso.set(1);
        return;
      }
      progreso.set(0);
      const proxy = { p: 0 };
      gsap.to(proxy, {
        p: 1,
        ease: 'none',
        onUpdate: () => progreso.set(proxy.p),
        scrollTrigger: {
          trigger: riel.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.8,
        },
      });
    },
    { dependencies: [reducido], revertOnUpdate: true },
  );
  return { progreso, reducido };
}

/** Valor del progreso como estado de React, solo cuando cruza un escalón (para textos). */
export function useProgresoEscalonado(progreso: Progreso, pasos = 200): number {
  const [valor, setValor] = useState(() => Math.round(progreso.valor * pasos) / pasos);
  useEffect(
    () => progreso.suscribir((v) => setValor(Math.round(v * pasos) / pasos)),
    [progreso, pasos],
  );
  return valor;
}

/** ¿El elemento está en pantalla? (para no dibujar escenas que no se ven). */
export function useEnPantalla(ref: RefObject<Element | null>): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), {
      rootMargin: '200px',
    });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return visible;
}

export function soportaWebGL(): boolean {
  try {
    if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)) return false;
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/* ── Utilidades de animación ─────────────────────────────────────── */

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const tramo = (p: number, desde: number, hasta: number) =>
  clamp01((p - desde) / (hasta - desde));
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
export const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  return 1 + (c1 + 1) * (t - 1) ** 3 + c1 * (t - 1) ** 2;
};

/* ── Tipos de los pupitres ───────────────────────────────────────── */

export interface Asiento {
  x: number;
  z: number;
  giro: number;
}

export interface EstadoPupitre {
  /** 0..1 altura (se levantan al aparecer). */
  alto: number;
  /** 0..1 cuánto está encendida la pantalla. */
  luz: number;
  /** Color de la pantalla encendida. */
  color: THREE.Color;
}

/** Tramos del scroll de la portada 2 (Congreso). */
export const TRAMOS_CONGRESO = {
  camara: [0, 0.66],
  desvanece: [0.36, 0.5],
  pupitres: [0.46, 0.6],
  voto: [0.62, 0.96],
} as const;

/** Puntos de luz por banca en la portada 3. */
export const PUNTOS_POR_BANCA = 96;

/** Props comunes a las portadas, para que la landing pueda usar cualquiera de ellas. */
export interface PortadaProps {
  /** En la landing es la portada de la página: el título pasa a ser el h1. */
  principal?: boolean;
  /** Destino del botón principal (p. ej. /poroteos/nuevo si hay sesión). */
  accionPrincipal?: string;
}
