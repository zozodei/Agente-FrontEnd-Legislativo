import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  avanceCamara,
  avanceVotacion,
  CENTRO_Z,
  crearBancas,
  radiosFilas,
  type Banca3D,
  type VotoEjemplo,
} from './escenario';
import type { Progreso } from './progreso';

/**
 * Escena 3D de la portada: el recinto como tablero de votación electrónica.
 * 257 pupitres con su pantalla de voto. Al cargar se levantan fila por fila; con el scroll la
 * cámara sube de una toma baja a la vista cenital y las luces se encienden banca por banca.
 *
 * Dos InstancedMesh (pupitres y luces: dos llamadas de dibujo para las 257 bancas) y render
 * bajo demanda (`frameloop="demand"`): solo se dibuja mientras algo se mueve.
 * Los colores salen de los tokens CSS (`--voto-*`, `--noche*`, `--sol`), así respetan el modo
 * claro/oscuro y no hay hex en este componente. Las luces usan material sin iluminación para
 * que el color del voto se vea exacto (es dato).
 */

export interface TableroEscenaProps {
  progreso: Progreso;
  /** prefers-reduced-motion: sin subida ni inclinación; se muestra el estado del progreso. */
  reducido: boolean;
  /** La portada está en pantalla (si no, se ignora el puntero). */
  activo: boolean;
}

const DUR_SUBIDA = 0.7; // s
const PUPITRE = { ancho: 0.25, alto: 0.11, fondo: 0.16 } as const;
/** Pantalla de voto sobre la tapa del pupitre (inclinada como la tapa). */
const LUZ = { ancho: 0.2, alto: 0.014, fondo: 0.11 } as const;
const INCLINACION_TAPA = -Math.atan(0.035 / PUPITRE.fondo);

type Colores = Record<
  Exclude<VotoEjemplo, 'pendiente'> | 'enDuda' | 'apagada' | 'pupitre' | 'sol' | 'cielo' | 'suelo',
  THREE.Color
>;

const TOKENS: Record<string, string> = {
  afirmativo: '--voto-afirmativo',
  negativo: '--voto-negativo',
  abstencion: '--voto-abstencion',
  enDuda: '--noche-ink-2',
  apagada: '--noche-rule',
  sol: '--sol',
  cielo: '--noche-ink',
  suelo: '--noche',
  noche2: '--noche-2',
};

function leerColores(): Colores {
  const css = getComputedStyle(document.documentElement);
  const c: Record<string, THREE.Color> = {};
  for (const [k, token] of Object.entries(TOKENS)) {
    c[k] = new THREE.Color(css.getPropertyValue(token).trim() || 'gray');
  }
  return {
    afirmativo: c.afirmativo,
    negativo: c.negativo,
    abstencion: c.abstencion,
    enDuda: c.enDuda,
    apagada: c.apagada,
    sol: c.sol,
    cielo: c.cielo,
    suelo: c.suelo,
    // Pupitre: madera oscura del recinto, en la gama noche para no competir con los votos.
    pupitre: c.noche2.clone().lerp(c.enDuda, 0.2),
  };
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

/** Pupitre con la tapa inclinada hacia el orador; la base queda en y = 0. */
function crearGeometriaPupitre(): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(PUPITRE.ancho, PUPITRE.alto, PUPITRE.fondo, 1, 1, 1);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const y = pos.getY(i);
    const z = pos.getZ(i);
    // Tapa: el borde de atrás (z > 0) más alto que el de adelante.
    if (y > 0) pos.setY(i, y + (z > 0 ? 0.025 : -0.01));
  }
  g.translate(0, PUPITRE.alto / 2, 0);
  g.computeVertexNormals();
  return g;
}

const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
};
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

// Cámara: toma baja (a la altura de las bancas) → vista cenital del tablero.
const CAM_DESDE = { pos: new THREE.Vector3(0, 2.3, 8.4), mira: new THREE.Vector3(0, 0.3, -1.4) };
const CAM_HASTA = { pos: new THREE.Vector3(0, 9.5, 7.6), mira: new THREE.Vector3(0, 0, -0.5) };

// Temporales reutilizados en cada cuadro (sin basura en el loop). Hay una sola escena.
const TMP = {
  obj: new THREE.Object3D(),
  color: new THREE.Color(),
  mira: new THREE.Vector3(),
};

function Tablero({ progreso, reducido, activo }: TableroEscenaProps) {
  const bancas = useMemo<Banca3D[]>(() => crearBancas(), []);
  const geoPupitre = useMemo(() => crearGeometriaPupitre(), []);
  const pupitres = useRef<THREE.InstancedMesh>(null);
  const luces = useRef<THREE.InstancedMesh>(null);
  const grupo = useRef<THREE.Group>(null);
  const invalidate = useThree((s) => s.invalidate);
  const colores = useColores(invalidate);
  const inicio = useRef<number | null>(null);
  const puntero = useRef({ x: 0, y: 0 });

  // Colores iniciales: crea instanceColor antes del primer cuadro.
  useLayoutEffect(() => {
    const p = pupitres.current;
    const l = luces.current;
    if (!p || !l) return;
    for (let i = 0; i < bancas.length; i += 1) {
      p.setColorAt(i, colores.current.pupitre);
      l.setColorAt(i, colores.current.apagada);
    }
  }, [bancas, colores]);

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

  useFrame((state) => {
    const p = pupitres.current;
    const l = luces.current;
    const g = grupo.current;
    if (!p || !l || !g) return;
    inicio.current ??= performance.now();
    const t = reducido ? Infinity : (performance.now() - inicio.current) / 1000;
    const prog = progreso.valor;
    const votacion = avanceVotacion(prog);
    const c = colores.current;
    const { obj, color, mira } = TMP;
    let animando = false;

    for (let i = 0; i < bancas.length; i += 1) {
      const b = bancas[i];

      // 1. El pupitre se levanta al cargar (de adentro hacia afuera).
      const ts = clamp01((t - b.retrasoSubida) / DUR_SUBIDA);
      if (ts < 1) animando = true;
      const alto = Math.max(0.001, easeOutBack(ts));

      obj.position.set(b.x, 0, b.z);
      obj.rotation.set(0, b.giro, 0, 'YXZ');
      obj.scale.set(1, alto, 1);
      obj.updateMatrix();
      p.setMatrixAt(i, obj.matrix);

      // 2. La luz del voto: se enciende con un pulso cuando le toca.
      const k = votacion > 0 ? clamp01((votacion - b.orden) / 0.02) : 0;
      const pulso = k > 0 && k < 1 ? Math.sin(Math.PI * k) : 0;
      obj.position.y = (PUPITRE.alto + 0.008) * alto + pulso * 0.06;
      obj.rotation.set(INCLINACION_TAPA, b.giro, 0, 'YXZ');
      obj.scale.set(1 + pulso * 0.25, alto, 1 + pulso * 0.25);
      obj.updateMatrix();
      l.setMatrixAt(i, obj.matrix);

      const encendida = b.voto === 'pendiente' ? c.enDuda : c[b.voto];
      color.copy(c.apagada).lerp(encendida, k);
      l.setColorAt(i, color);
    }
    p.instanceMatrix.needsUpdate = true;
    l.instanceMatrix.needsUpdate = true;
    if (l.instanceColor) l.instanceColor.needsUpdate = true;
    if (p.instanceColor) p.instanceColor.needsUpdate = true;

    // 3. Cámara: sube con el scroll.
    const cam = easeInOutCubic(avanceCamara(prog));
    state.camera.position.lerpVectors(CAM_DESDE.pos, CAM_HASTA.pos, cam);
    mira.lerpVectors(CAM_DESDE.mira, CAM_HASTA.mira, cam);
    state.camera.lookAt(mira);

    // Inclinación leve siguiendo al puntero.
    const objetivoY = reducido ? 0 : puntero.current.x * 0.1;
    const objetivoX = reducido ? 0 : puntero.current.y * 0.03;
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
        ref={pupitres}
        args={[geoPupitre, undefined, bancas.length]}
        castShadow
        receiveShadow
        frustumCulled={false}
      >
        <meshStandardMaterial roughness={0.55} metalness={0.05} />
      </instancedMesh>
      <instancedMesh ref={luces} args={[undefined, undefined, bancas.length]} frustumCulled={false}>
        <boxGeometry args={[LUZ.ancho, LUZ.alto, LUZ.fondo]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <Gradas color={colores.current.enDuda} />
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <shadowMaterial transparent opacity={0.45} />
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
          <ringGeometry args={[r + 0.11, r + 0.122, 128, 1, 0, Math.PI]} />
          <meshBasicMaterial color={color} transparent opacity={0.18} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function Luces({ colores }: { colores: Colores }) {
  return (
    <>
      <hemisphereLight args={[colores.cielo, colores.suelo, 1.2]} />
      <directionalLight
        position={[5, 9, 3]}
        intensity={2.2}
        color={colores.sol.clone().lerp(colores.cielo, 0.6)}
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

function Contenido(props: TableroEscenaProps) {
  const colores = useMemo(() => leerColores(), []);
  return (
    <>
      <Encuadre />
      <Luces colores={colores} />
      <Tablero {...props} />
    </>
  );
}

export default function TableroEscena(props: TableroEscenaProps) {
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 2]}
      flat
      shadows="percentage"
      camera={{ position: CAM_HASTA.pos.toArray(), fov: 32 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      aria-hidden
    >
      <Contenido {...props} />
    </Canvas>
  );
}
