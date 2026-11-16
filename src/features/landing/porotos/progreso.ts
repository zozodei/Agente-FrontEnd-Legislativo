/**
 * Progreso compartido entre el scroll (GSAP, en el DOM) y la escena 3D (fuera de React).
 * Es un valor mutable con suscriptores: el scroll no re-renderiza React en cada cuadro.
 */
export interface Progreso {
  valor: number;
  set(v: number): void;
  suscribir(fn: (v: number) => void): () => void;
}

export function crearProgreso(inicial = 0): Progreso {
  const subs = new Set<(v: number) => void>();
  const progreso: Progreso = {
    valor: inicial,
    set(v) {
      if (v === progreso.valor) return;
      progreso.valor = v;
      subs.forEach((fn) => fn(v));
    },
    suscribir(fn) {
      subs.add(fn);
      return () => {
        subs.delete(fn);
      };
    },
  };
  return progreso;
}
