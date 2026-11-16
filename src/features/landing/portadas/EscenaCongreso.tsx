import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer, Noise, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import type { Progreso } from '../tablero/progreso';
import { avanceVotacion, crearBancas, estaEncendida } from '../tablero/escenario';
import {
  clamp01,
  easeInOutCubic,
  easeOutBack,
  leerTokens,
  TOKENS_VOTO,
  tramo,
  useTokens,
  type EstadoPupitre,
  TRAMOS_CONGRESO,
} from './comun';
import { EncuadreLateral, Pupitres } from './piezas';

/**
 * Portada 2 · Del edificio al recinto. Un Congreso low-poly de noche (hecho con geometría,
 * sin modelos externos): la cámara sube hasta la cúpula, la atraviesa, el edificio se
 * desvanece y abajo aparece el recinto, donde se vota el escenario de ejemplo.
 */

export interface EscenaCongresoProps {
  progreso: Progreso;
  activo: boolean;
}

/** Eje de la cúpula: sobre el centro de las bancas. */
const DZ = -0.9;
const TOKENS_EDIFICIO = { piedra: '--paper', piedraSombra: '--paper-sunken' } as const;

function Edificio({ opacidad }: { opacidad: React.RefObject<number> }) {
  const tokens = useMemo(
    () => ({ ...leerTokens(TOKENS_EDIFICIO), ...leerTokens(TOKENS_VOTO) }),
    [],
  );
  const materiales = useMemo(() => {
    const piedra = new THREE.MeshStandardMaterial({
      color: tokens.piedra.clone().lerp(tokens.piedraSombra, 0.4),
      roughness: 0.85,
      transparent: true,
    });
    const cupula = new THREE.MeshStandardMaterial({
      color: tokens.piedraSombra.clone().lerp(tokens.celeste, 0.35).multiplyScalar(0.8),
      roughness: 0.5,
      metalness: 0.2,
      transparent: true,
      side: THREE.FrontSide,
    });
    const ventana = new THREE.MeshBasicMaterial({
      color: tokens.sol.clone().lerp(tokens.cielo, 0.3).multiplyScalar(2.2),
      toneMapped: false,
      transparent: true,
    });
    return { piedra, cupula, ventana };
  }, [tokens]);

  // Columnas: pórtico (8) + tambor (28) en un solo InstancedMesh.
  const columnas = useRef<THREE.InstancedMesh>(null);
  const ventanas = useRef<THREE.InstancedMesh>(null);
  const datos = useMemo(() => {
    const cols: THREE.Matrix4[] = [];
    const o = new THREE.Object3D();
    for (let i = 0; i < 8; i += 1) {
      o.position.set(-5.6 + i * 1.6, 3, DZ + 9.4);
      o.scale.set(1, 1, 1);
      o.updateMatrix();
      cols.push(o.matrix.clone());
    }
    for (let i = 0; i < 28; i += 1) {
      const a = (i / 28) * Math.PI * 2;
      o.position.set(Math.cos(a) * 5.55, 7.6, DZ + Math.sin(a) * 5.55);
      o.scale.set(0.45, 0.48, 0.45);
      o.updateMatrix();
      cols.push(o.matrix.clone());
    }
    const vents: THREE.Matrix4[] = [];
    // Ventanas en el frente del bloque y de las alas.
    const filas = [1.6, 3.6];
    for (const y of filas) {
      for (let x = -10; x <= 10; x += 1.25) {
        if (Math.abs(x) < 6.6) continue;
        o.position.set(x, y, DZ + 9.01);
        o.scale.set(1, 1, 1);
        o.updateMatrix();
        vents.push(o.matrix.clone());
      }
      for (const lado of [-1, 1]) {
        for (let x = 12; x <= 20; x += 1.2) {
          o.position.set(lado * x, y * 0.85, DZ + 6.01);
          o.updateMatrix();
          vents.push(o.matrix.clone());
        }
      }
    }
    // Ventanas del tambor de la cúpula.
    for (let i = 0; i < 28; i += 1) {
      const a = ((i + 0.5) / 28) * Math.PI * 2;
      o.position.set(Math.cos(a) * 5.21, 7.6, DZ + Math.sin(a) * 5.21);
      o.rotation.set(0, -a + Math.PI / 2, 0);
      o.updateMatrix();
      vents.push(o.matrix.clone());
    }
    return { cols, vents };
  }, []);

  useEffect(() => {
    datos.cols.forEach((m, i) => columnas.current?.setMatrixAt(i, m));
    datos.vents.forEach((m, i) => ventanas.current?.setMatrixAt(i, m));
    if (columnas.current) columnas.current.instanceMatrix.needsUpdate = true;
    if (ventanas.current) ventanas.current.instanceMatrix.needsUpdate = true;
  }, [datos]);

  const frontonForma = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-7, 0);
    s.lineTo(7, 0);
    s.lineTo(0, 2.1);
    s.closePath();
    return s;
  }, []);

  const grupo = useRef<THREE.Group>(null);
  useFrame(() => {
    const o = opacidad.current ?? 1;
    const g = grupo.current;
    if (!g) return;
    g.visible = o > 0.01;
    // Los materiales se toman de los objetos (no del memo): se comparten, así que basta
    // con fijar la opacidad de cada uno.
    g.traverse((obj) => {
      const m = (obj as THREE.Mesh).material as THREE.Material | undefined;
      if (m) m.opacity = o;
    });
  });

  const { piedra, cupula, ventana } = materiales;
  return (
    <group ref={grupo}>
      {/* Bloque principal, alas y escalinata */}
      <mesh material={piedra} position={[0, 3, DZ]} castShadow receiveShadow>
        <boxGeometry args={[22, 6, 18]} />
      </mesh>
      {[-1, 1].map((lado) => (
        <mesh key={lado} material={piedra} position={[lado * 16, 2.5, DZ - 1]} castShadow>
          <boxGeometry args={[10, 5, 14]} />
        </mesh>
      ))}
      {[0, 1, 2].map((i) => (
        <mesh key={i} material={piedra} position={[0, 0.2 + i * 0.4, DZ + 11.6 - i * 0.7]}>
          <boxGeometry args={[14 - i * 0.6, 0.4, 2.2]} />
        </mesh>
      ))}
      {/* Pórtico: columnas, entablamento y frontón */}
      <instancedMesh
        ref={columnas}
        args={[undefined, piedra, datos.cols.length]}
        castShadow
        frustumCulled={false}
      >
        <cylinderGeometry args={[0.38, 0.42, 6, 14]} />
      </instancedMesh>
      <mesh material={piedra} position={[0, 6.4, DZ + 9.4]} castShadow>
        <boxGeometry args={[14.4, 0.8, 1.6]} />
      </mesh>
      <mesh material={piedra} position={[0, 6.8, DZ + 8.7]} castShadow>
        <extrudeGeometry args={[frontonForma, { depth: 1.4, bevelEnabled: false }]} />
      </mesh>
      {/* Tambor, cúpula y linterna */}
      <mesh material={piedra} position={[0, 6.3, DZ]} castShadow>
        <cylinderGeometry args={[6.2, 6.4, 0.6, 48]} />
      </mesh>
      <mesh material={piedra} position={[0, 7.6, DZ]} castShadow>
        <cylinderGeometry args={[5.2, 5.2, 2.6, 48, 1, true]} />
      </mesh>
      <mesh material={piedra} position={[0, 9.05, DZ]}>
        <cylinderGeometry args={[5.9, 5.9, 0.3, 48]} />
      </mesh>
      <mesh material={cupula} position={[0, 9.2, DZ]} scale={[1, 1.32, 1]} castShadow>
        <sphereGeometry args={[5.3, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh material={piedra} position={[0, 16.6, DZ]}>
        <cylinderGeometry args={[0.85, 0.95, 1.5, 16]} />
      </mesh>
      <mesh material={cupula} position={[0, 17.35, DZ]}>
        <sphereGeometry args={[0.9, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh material={piedra} position={[0, 18.6, DZ]}>
        <coneGeometry args={[0.18, 1.6, 8]} />
      </mesh>
      <instancedMesh
        ref={ventanas}
        args={[undefined, ventana, datos.vents.length]}
        frustumCulled={false}
      >
        <planeGeometry args={[0.45, 0.9]} />
      </instancedMesh>
    </group>
  );
}

/** Siluetas de la ciudad alrededor, para dar escala. */
function Ciudad({ color }: { color: THREE.Color }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const n = 140;
  useEffect(() => {
    const o = new THREE.Object3D();
    let s = 7;
    const rand = () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
    for (let i = 0; i < n; i += 1) {
      // Solo detrás y a los costados: del lado de la cámara (z > 0) taparían el edificio.
      const a = Math.PI * 1.5 + (rand() - 0.5) * Math.PI * 1.3;
      const r = 34 + rand() * 30;
      const h = 4 + rand() * 18;
      o.position.set(Math.cos(a) * r, h / 2, DZ + Math.sin(a) * r);
      o.scale.set(3 + rand() * 4, h, 3 + rand() * 4);
      o.rotation.set(0, rand() * Math.PI, 0);
      o.updateMatrix();
      ref.current?.setMatrixAt(i, o.matrix);
    }
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, n]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={color} roughness={1} />
    </instancedMesh>
  );
}

function Escena({ progreso }: EscenaCongresoProps) {
  const invalidate = useThree((s) => s.invalidate);
  const c = useTokens(TOKENS_VOTO, invalidate);
  const bancas = useMemo(() => crearBancas(), []);
  const opacidad = useRef(1);

  const recorrido = useMemo(
    () => ({
      pos: new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 2.4, 48),
        new THREE.Vector3(9, 8, 32),
        new THREE.Vector3(4, 19, 14),
        new THREE.Vector3(0.4, 25, DZ + 3),
        new THREE.Vector3(0, 13, DZ + 4),
        new THREE.Vector3(0, 9.8, 7.4),
      ]),
      mira: new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 8, DZ),
        new THREE.Vector3(0, 10, DZ),
        new THREE.Vector3(0, 13, DZ),
        new THREE.Vector3(0, 2, DZ),
        new THREE.Vector3(0, 0, DZ),
        new THREE.Vector3(0, 0, -0.6),
      ]),
    }),
    [],
  );
  const mira = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => progreso.suscribir(() => invalidate()), [progreso, invalidate]);

  const estado = (i: number, out: EstadoPupitre) => {
    const b = bancas[i];
    const p = progreso.valor;
    const r = b.retrasoSubida / 0.9;
    const [d0, d1] = TRAMOS_CONGRESO.pupitres;
    out.alto = easeOutBack(tramo(p, d0 + r * 0.07, d1 - 0.07 + r * 0.07));
    const [v0, v1] = TRAMOS_CONGRESO.voto;
    // El escenario de ejemplo usa el progreso 0..1 propio del tablero.
    const pv = 0.15 + tramo(p, v0, v1) * 0.8;
    const v = avanceVotacion(pv);
    out.luz = estaEncendida(b.orden, pv) ? clamp01((v - b.orden) / 0.02) : 0;
    const t = c.current;
    out.color.copy(b.voto === 'pendiente' ? t.enDuda : t[b.voto]);
  };

  useFrame((state) => {
    const p = progreso.valor;
    const t = easeInOutCubic(tramo(p, ...TRAMOS_CONGRESO.camara));
    recorrido.pos.getPoint(t, state.camera.position);
    recorrido.mira.getPoint(t, mira);
    state.camera.lookAt(mira);
    opacidad.current = 1 - tramo(p, ...TRAMOS_CONGRESO.desvanece);
  });

  const t = c.current;
  return (
    <>
      <color attach="background" args={[t.suelo]} />
      <fog attach="fog" args={[t.suelo, 30, 95]} />
      <hemisphereLight args={[t.cielo, t.suelo, 0.55]} />
      <directionalLight
        position={[-14, 10, 22]}
        intensity={2.2}
        color={t.sol.clone().lerp(t.cielo, 0.35)}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-26}
        shadow-camera-right={26}
        shadow-camera-top={26}
        shadow-camera-bottom={-26}
        shadow-bias={-0.0004}
      />
      {/* Sol de mayo en el horizonte: HDR, el bloom lo vuelve halo. */}
      <mesh position={[-38, 6, -70]}>
        <sphereGeometry args={[3.2, 32, 16]} />
        <meshBasicMaterial color={t.sol.clone().multiplyScalar(3)} toneMapped={false} fog={false} />
      </mesh>
      <EncuadreLateral />
      <Edificio opacidad={opacidad} />
      <Ciudad color={t.noche2} />
      <Pupitres
        asientos={bancas}
        estado={estado}
        madera={t.noche2.clone().lerp(t.enDuda, 0.2)}
        apagada={t.apagada}
        brillo={2.4}
      />
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color={t.noche2} roughness={0.95} />
      </mesh>
      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.2} intensity={0.9} />
        <Noise opacity={0.045} />
        <Vignette offset={0.25} darkness={0.65} />
      </EffectComposer>
    </>
  );
}

export default function EscenaCongreso(props: EscenaCongresoProps) {
  return (
    <Canvas
      frameloop={props.activo ? 'demand' : 'never'}
      dpr={[1, 1.75]}
      flat
      shadows="percentage"
      camera={{ position: [0, 2.4, 48], fov: 40, near: 0.1, far: 220 }}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      aria-hidden
    >
      <Escena {...props} />
    </Canvas>
  );
}
