import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { Asiento, EstadoPupitre } from './comun';

/** Componentes 3D compartidos por las portadas candidatas. */

/* ── Pupitres con pantalla de voto ───────────────────────────────── */

const PUPITRE = { ancho: 0.25, alto: 0.11, fondo: 0.16 } as const;
const PANTALLA = { ancho: 0.2, alto: 0.014, fondo: 0.11 } as const;
const INCLINACION = -Math.atan(0.035 / PUPITRE.fondo);

function crearGeometriaPupitre(): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(PUPITRE.ancho, PUPITRE.alto, PUPITRE.fondo);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const y = pos.getY(i);
    if (y > 0) pos.setY(i, y + (pos.getZ(i) > 0 ? 0.025 : -0.01));
  }
  g.translate(0, PUPITRE.alto / 2, 0);
  g.computeVertexNormals();
  return g;
}

const TMP_OBJ = new THREE.Object3D();
const TMP_COLOR = new THREE.Color();

/**
 * 257 pupitres (dos InstancedMesh: madera y pantalla). `estado(i, out)` se llama por cuadro y
 * completa `out` sin crear objetos. `brillo` > 1 lleva las pantallas a HDR para el bloom.
 * Devuelve true en `animando` si algo sigue en movimiento.
 */
export function Pupitres({
  asientos,
  estado,
  madera,
  apagada,
  brillo = 1,
}: {
  asientos: Asiento[];
  estado: (i: number, out: EstadoPupitre) => void;
  madera: THREE.Color;
  apagada: THREE.Color;
  brillo?: number;
}) {
  const geo = useMemo(() => crearGeometriaPupitre(), []);
  const pupitres = useRef<THREE.InstancedMesh>(null);
  const pantallas = useRef<THREE.InstancedMesh>(null);
  const out = useMemo<EstadoPupitre>(() => ({ alto: 1, luz: 0, color: new THREE.Color() }), []);

  useFrame(() => {
    const p = pupitres.current;
    const s = pantallas.current;
    if (!p || !s) return;
    for (let i = 0; i < asientos.length; i += 1) {
      const a = asientos[i];
      estado(i, out);
      const alto = Math.max(0.001, out.alto);
      TMP_OBJ.position.set(a.x, 0, a.z);
      TMP_OBJ.rotation.set(0, a.giro, 0, 'YXZ');
      TMP_OBJ.scale.set(1, alto, 1);
      TMP_OBJ.updateMatrix();
      p.setMatrixAt(i, TMP_OBJ.matrix);
      p.setColorAt(i, madera);

      const pulso = out.luz > 0 && out.luz < 1 ? Math.sin(Math.PI * out.luz) : 0;
      TMP_OBJ.position.y = (PUPITRE.alto + 0.008) * alto + pulso * 0.05;
      TMP_OBJ.rotation.set(INCLINACION, a.giro, 0, 'YXZ');
      TMP_OBJ.scale.set(1 + pulso * 0.25, alto, 1 + pulso * 0.25);
      TMP_OBJ.updateMatrix();
      s.setMatrixAt(i, TMP_OBJ.matrix);
      TMP_COLOR.copy(apagada).lerp(out.color, out.luz);
      if (out.luz > 0) TMP_COLOR.multiplyScalar(1 + (brillo - 1) * out.luz);
      s.setColorAt(i, TMP_COLOR);
    }
    p.instanceMatrix.needsUpdate = true;
    s.instanceMatrix.needsUpdate = true;
    if (p.instanceColor) p.instanceColor.needsUpdate = true;
    if (s.instanceColor) s.instanceColor.needsUpdate = true;
  });

  return (
    <>
      <instancedMesh
        ref={pupitres}
        args={[geo, undefined, asientos.length]}
        castShadow
        receiveShadow
        frustumCulled={false}
      >
        <meshStandardMaterial roughness={0.55} metalness={0.05} />
      </instancedMesh>
      <instancedMesh
        ref={pantallas}
        args={[undefined, undefined, asientos.length]}
        frustumCulled={false}
      >
        <boxGeometry args={[PANTALLA.ancho, PANTALLA.alto, PANTALLA.fondo]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </>
  );
}

/**
 * Corre lo que ve la cámara hacia la derecha en pantallas anchas, para que la escena no quede
 * debajo del título (que va a la izquierda). En pantallas angostas no corre nada.
 */
export function EncuadreLateral({ corrimiento = 0.2 }: { corrimiento?: number }) {
  const size = useThree((s) => s.size);
  const get = useThree((s) => s.get);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const { camera } = get();
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    const { width: w, height: h } = size;
    const aspecto = w / h;
    // fov de diseño (pantalla ancha); en pantallas angostas se abre para mantener el ancho
    // visible del hemiciclo y que no se corte a los costados.
    const base = (camera.userData.fovBase as number | undefined) ?? camera.fov;
    camera.userData.fovBase = base;
    const medioAncho = Math.tan(THREE.MathUtils.degToRad(base / 2)) * 1.5;
    camera.fov =
      aspecto < 1.5
        ? Math.min(110, THREE.MathUtils.radToDeg(2 * Math.atan(medioAncho / aspecto)))
        : base;
    // Ancha: la escena va a la derecha (el título está a la izquierda).
    // Angosta (celular): baja a la franja libre entre el texto y el marcador.
    if (aspecto > 1.2) camera.setViewOffset(w, h, -w * corrimiento, 0, w, h);
    else if (aspecto < 0.8) camera.setViewOffset(w, h, 0, -h * 0.16, w, h);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    invalidate();
  }, [get, size, corrimiento, invalidate]);
  return null;
}
