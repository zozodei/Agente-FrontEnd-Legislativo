import { lazy, Suspense, useMemo, useRef, useState } from 'react';
import { ButtonLink } from '@/components/ui/Button';
import { conteoEn, crearBancas } from '../tablero/escenario';
import {
  soportaWebGL,
  tramo,
  useEnPantalla,
  useProgresoEscalonado,
  useProgresoRiel,
  TRAMOS_CONGRESO,
  type PortadaProps,
} from './comun';
import styles from './Portadas.module.css';

const Escena = lazy(() => import('./EscenaCongreso'));

/**
 * Portada 2 · Del edificio al recinto. El texto acompaña las tres etapas del recorrido:
 * el edificio, la entrada por la cúpula y la votación en el recinto.
 */
export function PortadaCongreso({
  principal = false,
  accionPrincipal = '/registro',
}: PortadaProps = {}) {
  const Titulo = principal ? 'h1' : 'h2';
  const riel = useRef<HTMLDivElement>(null);
  const escenario = useRef<HTMLDivElement>(null);
  const { progreso, reducido } = useProgresoRiel(riel);
  const p = useProgresoEscalonado(progreso, 300);
  const activo = useEnPantalla(escenario);
  const [webgl] = useState(soportaWebGL);
  const bancas = useMemo(() => crearBancas(), []);
  const [v0, v1] = TRAMOS_CONGRESO.voto;
  const conteo = conteoEn(bancas, 0.15 + tramo(p, v0, v1) * 0.8);
  const etapa = p < 0.36 ? 0 : p < 0.6 ? 1 : 2;

  return (
    <div ref={riel} className={styles.riel} data-reducido={reducido || undefined}>
      <div ref={escenario} className={styles.escenario}>
        <div className={styles.lienzo} aria-hidden>
          {webgl && (
            <Suspense fallback={null}>
              <Escena progreso={progreso} activo={activo} />
            </Suspense>
          )}
        </div>
        <div className={styles.veloIzq} aria-hidden />
        <div className={styles.capa}>
          <div className={styles.texto}>
            <p className={styles.kicker}>
              <span className={styles.dot} aria-hidden /> Congreso de la Nación Argentina
            </p>
            <Titulo id={principal ? 'hero-titulo' : undefined} className={styles.titulo}>
              Sabé si una ley sale <em>antes de que se vote.</em>
            </Titulo>
            <p className={styles.lead}>
              Entrá al recinto: demoIA estima, banca por banca, cómo votaría cada uno de los 257
              diputados un proyecto de ley.
            </p>
            <div className={styles.acciones}>
              <ButtonLink to={accionPrincipal} variant="inverse" size="lg">
                Empezar a porotear
              </ButtonLink>
              <ButtonLink to="/camara" variant="outlineInverse" size="lg">
                Explorar la Cámara
              </ButtonLink>
            </div>
          </div>
          <div className={styles.lectura} aria-live="off">
            <p className={styles.etapa} data-oculta={etapa !== 0 || undefined} hidden={etapa !== 0}>
              Av. Entre Ríos y Rivadavia · Buenos Aires
              <strong>El Palacio del Congreso</strong>
              Bajá para entrar por la cúpula.
            </p>
            <p className={styles.etapa} data-oculta={etapa !== 1 || undefined} hidden={etapa !== 1}>
              Cámara de Diputados
              <strong>257 bancas, quórum 129</strong>
              Cada pupitre tiene su pantalla de voto.
            </p>
            <p className={styles.etapa} data-oculta={etapa !== 2 || undefined} hidden={etapa !== 2}>
              Escenario de ejemplo · mayoría simple
              <strong>
                {conteo.afirmativo} a favor · {conteo.negativo} en contra
              </strong>
              {conteo.abstencion} abstenciones · {conteo.pendiente} en duda
            </p>
          </div>
        </div>
        {!reducido && (
          <p className={styles.pista} data-oculta={p > 0.02 || undefined}>
            Bajá para entrar
          </p>
        )}
      </div>
    </div>
  );
}
