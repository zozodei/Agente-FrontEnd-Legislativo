import { lazy, Suspense, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { gsap, useGSAP } from '@/utils/gsap';
import {
  avancePoroteo,
  BANCAS,
  conteoEn,
  crearPorotos,
  estaPintado,
  QUORUM,
  type VotoEjemplo,
} from './escenario';
import { crearProgreso } from './progreso';
import styles from './PoroteoEnVivo.module.css';

const PorotosEscena = lazy(() => import('./PorotosEscena'));

function soportaWebGL(): boolean {
  try {
    if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)) return false;
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

type Conteo = Record<VotoEjemplo, number>;
const igual = (a: Conteo, b: Conteo) =>
  a.afirmativo === b.afirmativo &&
  a.negativo === b.negativo &&
  a.abstencion === b.abstencion &&
  a.pendiente === b.pendiente;

const ETIQUETAS: [VotoEjemplo, string][] = [
  ['afirmativo', 'A favor'],
  ['negativo', 'En contra'],
  ['abstencion', 'Abst.'],
  ['pendiente', 'En duda'],
];

export interface PoroteoEnVivoProps {
  /** Sección que se fija (pin) mientras se porotea, en escritorio. */
  pinRef: RefObject<HTMLElement | null>;
}

/**
 * Portada: el escenario de ejemplo contado con porotos 3D. El scroll mueve el progreso
 * (0 → montón, 1 → hemiciclo poroteado). Sin WebGL se dibuja el mismo escenario en SVG;
 * con movimiento reducido se muestra directamente el resultado, sin fijar la sección.
 */
export function PoroteoEnVivo({ pinRef }: PoroteoEnVivoProps) {
  const reducido = useReducedMotion();
  const porotos = useMemo(() => crearPorotos(), []);
  const progreso = useMemo(() => crearProgreso(0), []);
  const [webgl] = useState(soportaWebGL);
  const [activo, setActivo] = useState(true);
  const [estado, setEstado] = useState(() => ({ conteo: conteoEn(porotos, 0), p: 0 }));
  const figura = useRef<HTMLElement>(null);

  // El conteo de la UI solo se actualiza cuando cambia algún número (≤ 257 veces).
  useEffect(
    () =>
      progreso.suscribir((p) => {
        const conteo = conteoEn(porotos, p);
        const hito = (x: number) => (x > 0.02 ? 1 : 0) + (avancePoroteo(x) >= 1 ? 1 : 0);
        setEstado((prev) =>
          igual(prev.conteo, conteo) && hito(p) === hito(prev.p) ? prev : { conteo, p },
        );
      }),
    [progreso, porotos],
  );

  useEffect(() => {
    const el = figura.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setActivo(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useGSAP(
    () => {
      if (reducido) {
        progreso.set(1);
        return;
      }
      progreso.set(0);
      const proxy = { p: 0 };
      const tween = (scrollTrigger: ScrollTrigger.Vars) =>
        gsap.to(proxy, {
          p: 1,
          ease: 'none',
          onUpdate: () => progreso.set(proxy.p),
          scrollTrigger,
        });
      const mm = gsap.matchMedia();
      // Escritorio: la portada queda fija mientras se porotea.
      // Los efectos de los hijos corren antes de que React asigne el ref del padre, así que
      // si todavía no está, se busca la sección que contiene a la figura.
      const seccion = pinRef.current ?? figura.current?.closest('section') ?? null;
      mm.add('(min-width: 961px)', () => {
        if (!seccion) return;
        tween({ trigger: seccion, start: 'top top', end: '+=140%', pin: true, scrub: 0.6 });
      });
      // Celular / tablet: sin fijar; el poroteo avanza mientras la figura cruza la pantalla.
      mm.add('(max-width: 960px)', () => {
        tween({ trigger: figura.current, start: 'top 90%', end: 'top 15%', scrub: 0.6 });
      });
    },
    { dependencies: [reducido], revertOnUpdate: true },
  );

  const { conteo } = estado;
  const presentes = conteo.afirmativo + conteo.negativo + conteo.abstencion;
  const terminado = avancePoroteo(estado.p) >= 1;
  const resultado = !terminado
    ? 'Poroteando…'
    : conteo.afirmativo > conteo.negativo
      ? 'Se aprueba'
      : 'No se aprueba';

  return (
    <figure
      ref={figura}
      className={styles.figura}
      aria-label="Escenario de ejemplo: 131 a favor, 98 en contra, 6 abstenciones y 22 en duda. Se aprueba."
    >
      <div className={styles.lienzo} aria-hidden>
        {webgl ? (
          <Suspense fallback={null}>
            <PorotosEscena progreso={progreso} reducido={reducido} activo={activo} />
          </Suspense>
        ) : (
          <HemicicloPlano porotos={porotos} p={estado.p} />
        )}
        {!reducido && (
          <p className={styles.pista} data-oculta={estado.p > 0.02 || undefined}>
            Bajá para contar los porotos
          </p>
        )}
      </div>

      <figcaption className={styles.lectura}>
        <p className={styles.cabeza}>
          <span>Escenario de ejemplo · mayoría simple</span>
          <span className={styles.vivo}>
            <span className={styles.dot} aria-hidden /> en vivo
          </span>
        </p>
        <div className={styles.barra} aria-hidden>
          {(['afirmativo', 'negativo', 'abstencion'] as const).map((v) => (
            <span
              key={v}
              data-voto={v}
              style={{ '--w': `${(conteo[v] / BANCAS) * 100}%` } as React.CSSProperties}
            />
          ))}
          <i className={styles.quorum} style={{ left: `${(QUORUM / BANCAS) * 100}%` }} />
        </div>
        <dl className={styles.conteo}>
          {ETIQUETAS.map(([v, etiqueta]) => (
            <div key={v} data-voto={v}>
              <dt>{etiqueta}</dt>
              <dd className="num">{conteo[v]}</dd>
            </div>
          ))}
        </dl>
        <p className={styles.resultado}>
          <span>{presentes >= QUORUM ? 'Hay quórum' : `Presentes ${presentes} de ${QUORUM}`}</span>
          <strong data-terminado={terminado || undefined}>{resultado}</strong>
        </p>
        <p className={styles.prompt}>
          <span aria-hidden>&gt;</span> estimar con IA
          <span className={styles.cursor} aria-hidden />
          <span className={styles.pronto}>próximamente</span>
        </p>
      </figcaption>
    </figure>
  );
}

/** Alternativa sin WebGL: el mismo escenario visto desde arriba, en SVG. */
function HemicicloPlano({ porotos, p }: { porotos: ReturnType<typeof crearPorotos>; p: number }) {
  return (
    <svg className={styles.plano} viewBox="-4.6 -3.4 9.2 4.9" role="presentation">
      {porotos.map((po, i) => (
        <ellipse
          key={i}
          cx={po.banca.x}
          cy={po.banca.z}
          rx={0.13}
          ry={0.085}
          transform={`rotate(${(-po.giroBanca * 180) / Math.PI} ${po.banca.x} ${po.banca.z})`}
          style={{
            fill:
              po.voto !== 'pendiente' && estaPintado(po.orden, p)
                ? `var(--voto-${po.voto})`
                : 'var(--poroto)',
          }}
        />
      ))}
    </svg>
  );
}
