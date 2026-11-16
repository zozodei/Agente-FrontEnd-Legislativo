import { lazy, Suspense, useMemo, useRef, useState } from 'react';
import { ButtonLink } from '@/components/ui/Button';
import { useVotacion } from '@/features/votaciones/queries';
import { formatDate } from '@/utils/format';
import {
  soportaWebGL,
  useEnPantalla,
  useProgresoEscalonado,
  useProgresoRiel,
  type PortadaProps,
} from './comun';
import { avanceVoto, conteoReal, repartirVotos, VOTACION_DESTACADA } from './votacionReal';
import styles from './Portadas.module.css';

const Escena = lazy(() => import('./EscenaVotacionReal'));

/**
 * Portada 1 · Votación real: la media sanción de la IVE (14/06/2018, 129 a 125) reproducida
 * banca por banca con los votos reales de la base. El conteo es texto real y sigue al scroll.
 */
export type PortadaVotacionRealProps = PortadaProps;

export function PortadaVotacionReal({
  principal = false,
  accionPrincipal = '/registro',
}: PortadaVotacionRealProps = {}) {
  const Titulo = principal ? 'h1' : 'h2';
  const riel = useRef<HTMLDivElement>(null);
  const escenario = useRef<HTMLDivElement>(null);
  const { progreso, reducido } = useProgresoRiel(riel);
  const p = useProgresoEscalonado(progreso, 400);
  const activo = useEnPantalla(escenario);
  const [webgl] = useState(soportaWebGL);
  const votacion = useVotacion(VOTACION_DESTACADA);
  const bancas = useMemo(
    () => (votacion.data ? repartirVotos(votacion.data.votos) : []),
    [votacion.data],
  );
  const conteo = conteoReal(bancas, p);
  const terminado = avanceVoto(p) >= 1;
  const diferencia = conteo.afirmativo - conteo.negativo;

  return (
    <div ref={riel} className={styles.riel} data-reducido={reducido || undefined}>
      <div ref={escenario} className={styles.escenario}>
        <div className={styles.lienzo} aria-hidden>
          {webgl && bancas.length > 0 && (
            <Suspense fallback={null}>
              <Escena bancas={bancas} progreso={progreso} activo={activo} />
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
              Así se votó la interrupción voluntaria del embarazo en Diputados
              {votacion.data ? `, el ${formatDate(votacion.data.fecha)}` : ''}: banca por banca, con
              los votos reales. demoIA te deja armar ese escenario antes de que llegue al recinto.
            </p>
            <div className={styles.acciones}>
              <ButtonLink to={accionPrincipal} variant="inverse" size="lg">
                Empezar a porotear
              </ButtonLink>
              <ButtonLink
                to={`/votaciones/${VOTACION_DESTACADA}`}
                variant="outlineInverse"
                size="lg"
              >
                Ver esta votación
              </ButtonLink>
            </div>
          </div>

          <figure
            className={styles.marcador}
            aria-label="Resultado: 129 afirmativos, 125 negativos"
          >
            <figcaption className={styles.marcadorCabeza}>
              IVE · votación en general · Diputados
            </figcaption>
            <div className={styles.marcadorCifras}>
              <div data-voto="afirmativo">
                <span className={`${styles.cifra} num`}>{conteo.afirmativo}</span>
                <span className={styles.cifraEtiqueta}>afirmativos</span>
              </div>
              <span className={styles.contra} aria-hidden>
                a
              </span>
              <div data-voto="negativo">
                <span className={`${styles.cifra} num`}>{conteo.negativo}</span>
                <span className={styles.cifraEtiqueta}>negativos</span>
              </div>
            </div>
            <p className={styles.marcadorPie}>
              {votacion.isError
                ? 'No se pudo cargar la votación.'
                : !terminado
                  ? `Votando… ${conteo.abstencion} abstención · ${conteo.ausente} ausentes`
                  : `Media sanción por ${diferencia} votos. ${conteo.abstencion} abstención, ${conteo.ausente} ausente.`}
            </p>
          </figure>
        </div>
        {!reducido && (
          <p className={styles.pista} data-oculta={p > 0.02 || undefined}>
            Bajá para votar
          </p>
        )}
      </div>
    </div>
  );
}
