import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bloom, DepthOfField, EffectComposer, Noise, Vignette } from '@react-three/postprocessing';
import type { DepthOfFieldEffect } from 'postprocessing';
import * as THREE from 'three';
import type { Progreso } from '../tablero/progreso';
import { radiosFilas, CENTRO_Z } from '../tablero/escenario';
import {
  clamp01,
  easeInOutCubic,
  TOKENS_VOTO,
  tramo,
  useTokens,
  type EstadoPupitre,
} from './comun';
import { EncuadreLateral, Pupitres } from './piezas';
import { avanceVoto, type BancaVotada } from './votacionReal';

/**
 * Portada 1 · Votación real. Plano cerrado y desenfocado de una banca; con el scroll la
 * cámara se aleja y sube mientras las 257 pantallas se encienden en el orden en que votan.
 * Postprocesado: profundidad de campo (se abre al alejarse), bloom solo en las pantallas
 * (son HDR: color × brillo > 1), grano y viñeta.
 */

export interface EscenaVotacionRealProps {
  bancas: BancaVotada[];
  progreso: Progreso;
  activo: boolean;
}

const BRILLO = 2.6;

function Escena({ bancas, progreso }: EscenaVotacionRealProps) {
  const invalidate = useThree((s) => s.invalidate);
  const c = useTokens(TOKENS_VOTO, invalidate);
  const dof = useRef<DepthOfFieldEffect>(null);
  const radios = useMemo(() => radiosFilas(), []);

  // Recorrido de cámara: banca del frente (plano cerrado) → toma baja → cenital.
  const foco = useMemo(() => {
    let mejor = bancas[0];
    for (const b of bancas) if (Math.abs(b.x) < 0.6 && b.z > (mejor?.z ?? -99)) mejor = b;
    return new THREE.Vector3(mejor?.x ?? 0, 0.13, mejor?.z ?? CENTRO_Z);
  }, [bancas]);
  const recorrido = useMemo(() => {
    const pos = new THREE.CatmullRomCurve3([
      foco.clone().add(new THREE.Vector3(0.55, 0.32, 0.75)),
      new THREE.Vector3(1.8, 1.4, 5.2),
      new THREE.Vector3(0, 3.6, 8.6),
      new THREE.Vector3(0, 9.8, 7.4),
    ]);
    const mira = new THREE.CatmullRomCurve3([
      foco.clone(),
      new THREE.Vector3(0, 0.2, 0),
      new THREE.Vector3(0, 0.2, -1.2),
      new THREE.Vector3(0, 0, -0.6),
    ]);
    return { pos, mira };
  }, [foco]);

  useEffect(() => progreso.suscribir(() => invalidate()), [progreso, invalidate]);

  const tmp = useMemo(() => ({ mira: new THREE.Vector3() }), []);

  // Se llama por cuadro desde Pupitres (sin memo: lee el progreso y los colores vivos).
  const estado = (i: number, out: EstadoPupitre) => {
    const b = bancas[i];
    const t = c.current;
    const v = avanceVoto(progreso.valor);
    out.alto = 1;
    out.luz = v > 0 ? clamp01((v - b.orden) / 0.03) : 0;
    out.color.copy(b.voto === 'presidente' ? t.enDuda : t[b.voto]);
    // Ausentes: pantalla apenas encendida (no votaron).
    if (b.voto === 'ausente') out.luz *= 0.35;
  };

  useFrame((state) => {
    const p = progreso.valor;
    const t = easeInOutCubic(tramo(p, 0, 0.9));
    recorrido.pos.getPoint(t, state.camera.position);
    recorrido.mira.getPoint(t, tmp.mira);
    state.camera.lookAt(tmp.mira);
    if (dof.current) {
      dof.current.target = foco;
      // Desenfoque fuerte en el plano cerrado; se abre a medida que la cámara se aleja.
      dof.current.bokehScale = 7 * (1 - tramo(p, 0.05, 0.55));
    }
  });

  return (
    <>
      <color attach="background" args={[c.current.suelo]} />
      <fog attach="fog" args={[c.current.suelo, 9, 26]} />
      <hemisphereLight args={[c.current.cielo, c.current.suelo, 0.9]} />
      <directionalLight
        position={[4, 8, 3]}
        intensity={1.6}
        color={c.current.sol.clone().lerp(c.current.cielo, 0.55)}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-bias={-0.0005}
      />
      <EncuadreLateral />
      <Pupitres
        asientos={bancas}
        estado={estado}
        madera={c.current.noche2.clone().lerp(c.current.enDuda, 0.18)}
        apagada={c.current.apagada}
        brillo={BRILLO}
      />
      <group position={[0, 0.002, CENTRO_Z]} rotation-x={-Math.PI / 2}>
        {radios.map((r) => (
          <mesh key={r}>
            <ringGeometry args={[r + 0.11, r + 0.122, 128, 1, 0, Math.PI]} />
            <meshBasicMaterial color={c.current.celeste} transparent opacity={0.16} />
          </mesh>
        ))}
      </group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color={c.current.suelo} roughness={0.95} />
      </mesh>
      <EffectComposer multisampling={0}>
        <DepthOfField ref={dof} focalLength={0.02} bokehScale={7} height={540} />
        <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.2} intensity={0.85} />
        <Noise opacity={0.05} />
        <Vignette offset={0.25} darkness={0.7} />
      </EffectComposer>
    </>
  );
}

export default function EscenaVotacionReal(props: EscenaVotacionRealProps) {
  return (
    <Canvas
      frameloop={props.activo ? 'demand' : 'never'}
      dpr={[1, 1.75]}
      flat
      shadows="percentage"
      camera={{ position: [0, 9.8, 7.4], fov: 38, near: 0.05, far: 80 }}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      aria-hidden
    >
      <Escena {...props} />
    </Canvas>
  );
}
