import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  avancePoroteo,
  avanceViaje,
  CENTRO_Z,
  crearPorotos,
  radiosFilas,
  type Poroto,
  type VotoEjemplo,
} from './escenario';
import type { Progreso } from './progreso';

/**
 * Escena 3D de la portada: 257 porotos que caen en un montón y, al scrollear, ocupan
 * cada uno su banca del hemiciclo y se pintan con su voto.
 *
 * Un solo InstancedMesh (una llamada de dibujo para los 257), render bajo demanda
 * (`frameloop="demand"`): solo se dibuja mientras algo se mueve.
 * Los colores salen de los tokens CSS (`--poroto`, `--voto-*`, `--celeste`, `--sol`),
 * así respetan el modo claro/oscuro y no hay hex en este componente.
 */

export interface PorotosEscenaProps {
  progreso: Progreso;
  /** prefers-reduced-motion: sin caída ni inclinación; se muestra el estado del progreso. */
  reducido: boolean;
  /** La portada está en pantalla (si no, se ignora el puntero). */
  activo: boolean;
}

const DUR_CAIDA = 0.9; // s
const ALTO_POROTO = 0.055;

type Colores = Record<VotoEjemplo | 'celeste' | 'sol' | 'cielo' | 'suelo', THREE.Color>;

const TOKENS: Record<keyof Colores, string> = {
  afirmativo: '--voto-afirmativo',
  negativo: '--voto-negativo',
  abstencion: '--voto-abstencion',
  pendiente: '--poroto',
  celeste: '--celeste',
  sol: '--sol',
  cielo: '--noche-ink',
  suelo: '--noche',
};

function leerColores(): Colores {
  const css = getComputedStyle(document.documentElement);
  const out = {} as Colores;
  for (const [k, token] of Object.entries(TOKENS) as [keyof Colores, string][]) {
    out[k] = new THREE.Color(css.getPropertyValue(token).trim() || 'gray');
  }
  return out;
}

/** Colores de los tokens; se vuelven a leer si cambia el tema (data-theme o el del sistema). */
function useColores(onCambio: () => void) {
  const colores = useRef<Colores>(leerColores());
  useEffect(() => {
    const releer = () => {
      colores.current = leerColores();
      onCambio();
    };
    const obs = new MutationObserver(releer);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', releer);
    return () => {
      obs.disconnect();
      mq.removeEventListener('change', releer);
    };
  }, [onCambio]);
  return colores;
}

/** Poroto: una esfera estirada, curvada en forma de riñón y con el hilo hundido. */
function crearGeometriaPoroto(): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(1, 24, 16);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    let Z = z * 0.082 - 0.045 * x * x; // las puntas se curvan hacia atrás
    if (z < 0) Z += 0.025 * Math.exp(-x * x * 8) * -z; // hilo en el lado cóncavo
    pos.setXYZ(i, x * 0.13, y * ALTO_POROTO, Z);
  }
  g.computeVertexNormals();
  return g;
}

const easeOutBounce = (t: number) => {
  const n = 7.5625;
  const d = 2.75;
  if (t < 1 / d) return n * t * t;
  if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
  if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
  return n * (t -= 2.625 / d) * t + 0.984375;
};
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

// Temporales reutilizados en cada cuadro (sin basura en el loop). Hay una sola escena.
const TMP = {
  obj: new THREE.Object3D(),
  qMonton: new THREE.Quaternion(),
  qBanca: new THREE.Quaternion(),
  euler: new THREE.Euler(),
  color: new THREE.Color(),
};

function Porotos({ progreso, reducido, activo }: PorotosEscenaProps) {
  const porotos = useMemo<Poroto[]>(() => crearPorotos(), []);
  const geometria = useMemo(() => crearGeometriaPoroto(), []);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const grupo = useRef<THREE.Group>(null);
  const invalidate = useThree((s) => s.invalidate);
  const colores = useColores(invalidate);
  const inicio = useRef<number | null>(null);
  const puntero = useRef({ x: 0, y: 0 });

  // Colores iniciales: crea instanceColor antes del primer cuadro.
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    for (let i = 0; i < porotos.length; i += 1) m.setColorAt(i, colores.current.pendiente);
  }, [porotos, colores]);

  useEffect(() => progreso.suscribir(() => invalidate()), [progreso, invalidate]);

  useEffect(() => {
    if (reducido) return;
    const mover = (e: PointerEvent) => {
      if (!activo) return;
      puntero.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      puntero.current.y = (e.clientY / window.innerHeight) * 2 - 1;
      invalidate();
    };
    window.addEventListener('pointermove', mover, { passive: true });
    return () => window.removeEventListener('pointermove', mover);
  }, [reducido, activo, invalidate]);

  useFrame(() => {
    const m = mesh.current;
    const g = grupo.current;
    if (!m || !g) return;
    inicio.current ??= performance.now();
    const t = reducido ? Infinity : (performance.now() - inicio.current) / 1000;
    const p = progreso.valor;
    const pintura = avancePoroteo(p);
    const c = colores.current;
    const { obj, qMonton, qBanca, euler, color } = TMP;
    let animando = false;

    for (let i = 0; i < porotos.length; i += 1) {
      const po = porotos[i];

      // 1. Caída inicial al montón (solo la primera vez).
      const tc = clamp01((t - po.retrasoCaida) / DUR_CAIDA);
      if (tc < 1) animando = true;
      const caida = 1 - easeOutBounce(tc);

      // 2. Viaje del montón a la banca (scroll).
      const v = easeInOutCubic(avanceViaje(po.orden, p));
      const [rx, ry, rz] = po.giroMonton;
      euler.set(rx + caida * 4, ry, rz + caida * 2);
      qMonton.setFromEuler(euler);
      euler.set(0, po.giroBanca, 0);
      qBanca.setFromEuler(euler);

      obj.position.set(
        po.monton.x + (po.banca.x - po.monton.x) * v,
        po.monton.y + (ALTO_POROTO - po.monton.y) * v + Math.sin(Math.PI * v) * 1.1 + caida * 6,
        po.monton.z + (po.banca.z - po.monton.z) * v,
      );
      obj.quaternion.slerpQuaternions(qMonton, qBanca, v);

      // 3. Poroteo: se pinta con un pequeño salto cuando le toca.
      const k = pintura > 0 ? clamp01((pintura - po.orden) / 0.025) : 0;
      const salto = k > 0 && k < 1 ? Math.sin(Math.PI * k) : 0;
      obj.position.y += salto * 0.12;
      obj.scale.setScalar(1 + salto * 0.3);
      obj.updateMatrix();
      m.setMatrixAt(i, obj.matrix);

      color.copy(c.pendiente).lerp(c[po.voto], k);
      m.setColorAt(i, color);
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;

    // Inclinación leve siguiendo al puntero.
    const objetivoY = reducido ? 0 : puntero.current.x * 0.12;
    const objetivoX = reducido ? 0 : puntero.current.y * 0.04;
    g.rotation.y += (objetivoY - g.rotation.y) * 0.08;
    g.rotation.x += (objetivoX - g.rotation.x) * 0.08;
    if (Math.abs(objetivoY - g.rotation.y) > 1e-4 || Math.abs(objetivoX - g.rotation.x) > 1e-4) {
      animando = true;
    }

    if (animando) invalidate();
  });

  return (
    <group ref={grupo}>
      <instancedMesh
        ref={mesh}
        args={[geometria, undefined, porotos.length]}
        castShadow
        frustumCulled={false}
      >
        <meshStandardMaterial roughness={0.38} metalness={0} />
      </instancedMesh>
      <Gradas color={colores.current.celeste} />
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <shadowMaterial transparent opacity={0.4} />
      </mesh>
    </group>
  );
}

/** Las filas del hemiciclo como líneas finas en el piso (la retícula técnica de la portada). */
function Gradas({ color }: { color: THREE.Color }) {
  const radios = useMemo(() => radiosFilas(), []);
  return (
    <group position={[0, 0.002, CENTRO_Z]} rotation-x={-Math.PI / 2}>
      {radios.map((r) => (
        <mesh key={r}>
          <ringGeometry args={[r - 0.006, r + 0.006, 128, 1, 0, Math.PI]} />
          <meshBasicMaterial color={color} transparent opacity={0.22} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function Luces({ colores }: { colores: Colores }) {
  return (
    <>
      <hemisphereLight args={[colores.cielo, colores.suelo, 1.1]} />
      <directionalLight
        position={[5, 9, 3]}
        intensity={2.4}
        color={colores.sol.clone().lerp(colores.cielo, 0.65)}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-bias={-0.0005}
      />
    </>
  );
}

/**
 * Encuadre: mantiene fijo el ancho visible (el hemiciclo entero) en cualquier proporción
 * del lienzo; en lienzos angostos (celular) abre el campo de visión vertical.
 */
const MEDIO_ANCHO = Math.tan(THREE.MathUtils.degToRad(16)) * 1.32;

function Encuadre() {
  const size = useThree((s) => s.size);
  const get = useThree((s) => s.get);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const { camera } = get();
    if (!(camera instanceof THREE.PerspectiveCamera) || size.height === 0) return;
    const aspecto = size.width / size.height;
    camera.fov = Math.max(32, THREE.MathUtils.radToDeg(2 * Math.atan(MEDIO_ANCHO / aspecto)));
    camera.updateProjectionMatrix();
    invalidate();
  }, [get, size, invalidate]);
  return null;
}

function Contenido(props: PorotosEscenaProps) {
  const colores = useMemo(() => leerColores(), []);
  return (
    <>
      <Encuadre />
      <Luces colores={colores} />
      <Porotos {...props} />
    </>
  );
}

export default function PorotosEscena(props: PorotosEscenaProps) {
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 2]}
      flat
      shadows="percentage"
      camera={{ position: [0, 9.5, 7.6], fov: 32 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      onCreated={({ camera }) => camera.lookAt(0, 0, -0.5)}
      aria-hidden
    >
      <Contenido {...props} />
    </Canvas>
  );
}
