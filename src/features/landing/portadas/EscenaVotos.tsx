import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { CENTRO_Z } from '../tablero/escenario';
import type { Progreso } from '../tablero/progreso';
import {
  easeInOutCubic,
  TOKENS_VOTO,
  tramo,
  useTokens,
  type Asiento,
  PUNTOS_POR_BANCA,
} from './comun';
import { EncuadreLateral } from './piezas';

/**
 * Portada 3 · Miles de votos. Decenas de miles de puntos de luz (cada uno resume varios votos
 * nominales de la base) giran en un remolino; con el scroll se ordenan en las 257 bancas y
 * toman el color del bloque que hoy ocupa cada una. Todo el movimiento corre en la GPU
 * (ShaderMaterial): el CPU solo actualiza dos uniforms por cuadro.
 */

export interface EscenaVotosProps {
  /** Bancas en orden izquierda → derecha, con el color de su bloque actual. */
  bancas: (Asiento & { color: string })[];
  progreso: Progreso;
  activo: boolean;
  reducido: boolean;
}

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uOrden;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform vec3 uColorInicio;
  uniform vec3 uColorAcento;

  attribute vec3 aBanca;
  attribute vec4 aRand;
  attribute vec3 aColor;

  varying vec3 vColor;
  varying float vAlpha;

  float easeInOut(float t) {
    return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;
  }

  void main() {
    // Remolino: órbitas más rápidas cerca del centro, con respiración vertical.
    float r = 0.6 + pow(aRand.x, 1.6) * 10.0;
    float a = aRand.y * 6.2831853 + uTime * 0.9 / r;
    // Disco inclinado tipo galaxia, más denso hacia el centro.
    float y = 2.6 + (aRand.z - 0.5) * (0.4 + r * 0.12) + sin(a * 2.0 + uTime * 0.4) * 0.35;
    vec3 remolino = vec3(cos(a) * r, y, ${CENTRO_Z.toFixed(2)} - 1.6 + sin(a) * r * 0.62);

    // Cada punto llega a su banca en su propio momento (orden aleatorio, no en bloque).
    float inicio = aRand.w * 0.55;
    float t = easeInOut(clamp((uOrden - inicio) / 0.45, 0.0, 1.0));

    // Ondulación que se apaga al llegar.
    vec3 deriva = vec3(
      sin(uTime * 0.7 + aRand.x * 20.0),
      cos(uTime * 0.5 + aRand.y * 20.0),
      sin(uTime * 0.6 + aRand.z * 20.0)
    ) * 0.35 * (1.0 - t);

    vec3 pos = mix(remolino, aBanca, t) + deriva;
    // Arco de vuelo: suben un poco antes de posarse.
    pos.y += sin(t * 3.14159) * 1.2;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * uPixelRatio * mix(1.0, 0.75, t) / -mv.z;

    vec3 inicioColor = mix(uColorInicio, uColorAcento, step(0.93, aRand.z));
    vColor = mix(inicioColor, aColor, smoothstep(0.55, 1.0, t));
    vAlpha = mix(0.75, 1.0, t);
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float halo = smoothstep(0.5, 0.0, d);
    float nucleo = smoothstep(0.18, 0.0, d);
    float alpha = (halo * 0.55 + nucleo) * vAlpha;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(vColor * (1.0 + nucleo * 1.4), alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function prng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

function Puntos({ bancas, progreso, activo, reducido }: EscenaVotosProps) {
  const invalidate = useThree((s) => s.invalidate);
  const c = useTokens(TOKENS_VOTO, invalidate);
  const material = useRef<THREE.ShaderMaterial>(null);

  const geometria = useMemo(() => {
    const n = bancas.length * PUNTOS_POR_BANCA;
    const banca = new Float32Array(n * 3);
    const rand = new Float32Array(n * 4);
    const color = new Float32Array(n * 3);
    const col = new THREE.Color();
    const r = prng(1983);
    for (let i = 0; i < n; i += 1) {
      const b = bancas[Math.floor(i / PUNTOS_POR_BANCA)];
      // Columna de luz sobre la banca: más alta en el centro de la pila.
      const ang = r() * Math.PI * 2;
      const rad = Math.sqrt(r()) * 0.09;
      banca[i * 3] = b.x + Math.cos(ang) * rad;
      banca[i * 3 + 1] = 0.04 + r() * r() * 0.55;
      banca[i * 3 + 2] = b.z + Math.sin(ang) * rad;
      for (let k = 0; k < 4; k += 1) rand[i * 4 + k] = r();
      col.set(b.color).multiplyScalar(2.1);
      color.set([col.r, col.g, col.b], i * 3);
    }
    const g = new THREE.BufferGeometry();
    // La posición real la calcula el shader; position solo da el conteo de vértices.
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('aBanca', new THREE.BufferAttribute(banca, 3));
    g.setAttribute('aRand', new THREE.BufferAttribute(rand, 4));
    g.setAttribute('aColor', new THREE.BufferAttribute(color, 3));
    return g;
  }, [bancas]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uOrden: { value: 0 },
      uSize: { value: 78 },
      uPixelRatio: { value: 1 },
      uColorInicio: { value: new THREE.Color() },
      uColorAcento: { value: new THREE.Color() },
    }),
    [],
  );

  useEffect(() => progreso.suscribir(() => invalidate()), [progreso, invalidate]);

  useFrame((state, delta) => {
    const m = material.current;
    if (!m) return;
    const p = progreso.valor;
    const u = m.uniforms;
    if (!reducido && activo) u.uTime.value += Math.min(delta, 0.05);
    u.uOrden.value = tramo(p, 0.06, 0.8);
    u.uPixelRatio.value = state.gl.getPixelRatio();
    u.uColorInicio.value.copy(c.current.celeste).multiplyScalar(1.7);
    u.uColorAcento.value.copy(c.current.sol).multiplyScalar(2.4);

    // Cámara: frente al remolino → arriba del hemiciclo, con un paneo lento.
    const t = easeInOutCubic(tramo(p, 0, 0.85));
    const giro = reducido ? 0 : Math.sin(u.uTime.value * 0.08) * 0.12 * (1 - t);
    const dist = 15 - t * 6.5;
    state.camera.position.set(
      Math.sin(giro) * dist,
      4.5 + t * 5,
      CENTRO_Z - 1.2 + Math.cos(giro) * dist,
    );
    state.camera.lookAt(0, 2.2 - t * 2.2, CENTRO_Z - 1.6 + t * 0.4);
  });

  return (
    <points geometry={geometria} frustumCulled={false}>
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export default function EscenaVotos(props: EscenaVotosProps) {
  const fondo = useTokens(TOKENS_VOTO);
  return (
    <Canvas
      frameloop={props.activo ? (props.reducido ? 'demand' : 'always') : 'never'}
      dpr={[1, 1.75]}
      flat
      camera={{ position: [0, 4.5, 14], fov: 42, near: 0.1, far: 100 }}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      aria-hidden
    >
      <color attach="background" args={[fondo.current.suelo]} />
      <EncuadreLateral />
      <Puntos {...props} />
      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur luminanceThreshold={0.6} luminanceSmoothing={0.3} intensity={1.5} />
        <Vignette offset={0.25} darkness={0.75} />
      </EffectComposer>
    </Canvas>
  );
}
