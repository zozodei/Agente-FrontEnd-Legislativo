import { useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Hemiciclo } from '@/components/hemiciclo';
import { ButtonLink } from '@/components/ui/Button';
import { ErrorState, Skeleton } from '@/components/ui/States';
import { Kicker } from '@/components/ui/Typography';
import { useAuth } from '@/features/auth/useAuth';
import { useResumen } from '@/features/dashboard/queries';
import { diputadoToBanca, useDiputados } from '@/features/diputados/queries';
import { PortadaVotacionReal } from '@/features/landing/portadas/PortadaVotacionReal';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { formatNumber } from '@/utils/format';
import { gsap, ScrollTrigger, useGSAP } from '@/utils/gsap';
import styles from './LandingPage.module.css';

const PASOS = [
  {
    n: '01',
    titulo: 'Cargá el proyecto',
    texto:
      'Con el título alcanza. Si querés, sumá la descripción, el articulado o el PDF y elegí qué mayoría necesita: simple, absoluta o dos tercios.',
  },
  {
    n: '02',
    titulo: 'Poroteá banca por banca',
    texto:
      'Pintá el hemiciclo con el mouse, asigná votos a un bloque entero de una vez o recorré la lista de los 257 diputados. Deshacé lo que quieras.',
  },
  {
    n: '03',
    titulo: 'Leé el resultado en vivo',
    texto:
      'El contador te dice si hay quórum, si el proyecto se aprueba y cuál es el mejor y el peor escenario con los votos que todavía están en duda.',
  },
];

const PUBLICO = [
  {
    titulo: 'Organizaciones de la sociedad civil',
    texto: 'Para saber a quién convencer antes de que el proyecto llegue al recinto.',
  },
  {
    titulo: 'Periodistas',
    texto: 'Para contar con datos cómo viene una votación y qué bloques la definen.',
  },
  {
    titulo: 'Equipos legislativos',
    texto: 'Para ordenar el conteo de apoyos y compartir un escenario claro.',
  },
  {
    titulo: 'Ciudadanía',
    texto: 'Para entender cómo se toman las decisiones que nos afectan a todos.',
  },
];

const HOJA_DE_RUTA = [
  {
    etapa: 'Hoy',
    titulo: 'Poroteo manual',
    texto: 'Vos estimás cada voto; demoIA hace las cuentas de quórum y mayorías.',
    estado: 'activo',
  },
  {
    etapa: 'Próximo',
    titulo: 'Estimación con IA',
    texto:
      'Un modelo propone el voto de cada banca con su nivel de confianza, la justificación y las fuentes. Vos corregís.',
    estado: 'pronto',
  },
  {
    etapa: 'Después',
    titulo: 'Historial y Senado',
    texto:
      'Sugerencias a partir de cómo votó cada legislador en leyes parecidas, y las 72 bancas del Senado.',
    estado: 'futuro',
  },
] as const;

export default function LandingPage() {
  useDocumentTitle(null);
  const { estado } = useAuth();
  const logueado = estado === 'autenticado';
  const resumen = useResumen();
  const votaciones = resumen.data?.votaciones.total;

  return (
    <div className={styles.page}>
      {/* ── Portada: la IVE de 2018 votada banca por banca (ver features/landing/portadas) ── */}
      <div>
        <PortadaVotacionReal
          principal
          accionPrincipal={logueado ? '/poroteos/nuevo' : '/registro'}
        />
        <div className={styles.fichaBanda}>
          <dl className={`${styles.wrap} ${styles.ficha}`}>
            <div>
              <dt>Bancas</dt>
              <dd className="num">257</dd>
            </div>
            <div>
              <dt>Quórum</dt>
              <dd className="num">129</dd>
            </div>
            <div>
              <dt>Votaciones nominales</dt>
              <dd className="num">{votaciones ? formatNumber(votaciones) : '—'}</dd>
            </div>
            <div>
              <dt>Datos</dt>
              <dd>Abiertos</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* ── Qué es ──────────────────────────────────────────────── */}
      <section className={`${styles.wrap} ${styles.definicion}`} aria-labelledby="que-es">
        <div className={styles.entrada}>
          <Kicker tono="accent">Qué es</Kicker>
          <h2 id="que-es" className={styles.palabra}>
            po·ro·te·o
          </h2>
          <p className={styles.gramatica}>
            <abbr title="sustantivo masculino">s. m.</abbr> Arg., coloquial.
          </p>
          <p className={styles.acepcion}>
            Conteo, uno por uno, de los votos con los que cuenta un proyecto antes de llegar al
            recinto.
          </p>
        </div>
        <div className={styles.definicionTexto}>
          <p>
            En el Congreso, nadie llega a una votación sin haber poroteado. Los equipos legislativos
            cuentan apoyos durante semanas: quién está a favor, quién en contra, quién todavía duda.
            Esa información decide estrategias, pero casi nunca es pública.
          </p>
          <p>
            <strong>demoIA abre esa herramienta a todos.</strong> Combina el registro histórico de
            cada diputado con un editor visual del hemiciclo para que cualquier organización,
            periodista o ciudadano pueda construir su escenario, compartirlo y discutirlo con datos.
          </p>
        </div>
      </section>

      {/* ── Cómo funciona ───────────────────────────────────────── */}
      <section className={styles.wrap} aria-labelledby="como-funciona">
        <header className={styles.seccionHeader}>
          <Kicker>Cómo funciona</Kicker>
          <h2 id="como-funciona" className={styles.seccionTitulo}>
            Tres pasos, cinco minutos.
          </h2>
        </header>
        <ol className={styles.pasos}>
          {PASOS.map((p) => (
            <li key={p.n} className={styles.paso}>
              <span className={`${styles.pasoNum} num`} aria-hidden>
                {p.n}
              </span>
              <h3 className={styles.pasoTitulo}>{p.titulo}</h3>
              <p className={styles.pasoTexto}>{p.texto}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── La Cámara hoy (datos en vivo) ───────────────────────── */}
      <CamaraEnVivo />

      {/* ── Hoja de ruta / IA ───────────────────────────────────── */}
      <HojaDeRuta />

      {/* ── Para quién ──────────────────────────────────────────── */}
      <section className={styles.wrap} aria-labelledby="para-quien">
        <header className={styles.seccionHeader}>
          <Kicker>Para quién</Kicker>
          <h2 id="para-quien" className={styles.seccionTitulo}>
            Para todos los que quieren entender cómo se decide.
          </h2>
        </header>
        <ul className={styles.publico}>
          {PUBLICO.map((p) => (
            <li key={p.titulo}>
              <h3 className={styles.publicoTitulo}>{p.titulo}</h3>
              <p className={styles.publicoTexto}>{p.texto}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Llamado final ───────────────────────────────────────── */}
      <section className={styles.cierre} aria-labelledby="cierre-titulo">
        <div className={`${styles.wrap} ${styles.cierreInner}`}>
          <h2 id="cierre-titulo" className={styles.cierreTitulo}>
            Tu primer poroteo, <em>hoy.</em>
          </h2>
          <p className={styles.cierreTexto}>
            Creá una cuenta gratuita: tus poroteos quedan guardados y solo los ves vos.
          </p>
          <div className={styles.acciones}>
            {logueado ? (
              <ButtonLink to="/poroteos" variant="inverse" size="lg">
                Ir a mis poroteos
              </ButtonLink>
            ) : (
              <>
                <ButtonLink to="/registro" variant="inverse" size="lg">
                  Crear cuenta
                </ButtonLink>
                <ButtonLink to="/login" variant="outlineInverse" size="lg">
                  Ya tengo cuenta
                </ButtonLink>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

/**
 * Hoja de ruta: la línea de tiempo se traza con el scroll y cada etapa se enciende cuando
 * la línea llega a su nodo. Con movimiento reducido queda dibujada desde el inicio.
 */
function HojaDeRuta() {
  const seccion = useRef<HTMLElement>(null);
  const reducido = useReducedMotion();

  useGSAP(
    () => {
      if (reducido) return;
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: `.${styles.ruta}`,
          start: 'top 80%',
          end: 'bottom 55%',
          scrub: 0.5,
        },
      });
      // La línea es el ::after de la lista y los nodos el ::before de cada etapa (CSS),
      // así que se animan variables CSS en vez de elementos extra.
      tl.fromTo(`.${styles.ruta}`, { '--avance': 0 }, { '--avance': 1, ease: 'none', duration: 1 });
      gsap.utils.toArray<HTMLElement>(`.${styles.rutaItem}`).forEach((item, i, todos) => {
        const en = todos.length > 1 ? i / (todos.length - 1) : 0;
        tl.fromTo(
          item,
          { '--encendido': 0 },
          { '--encendido': 1, ease: 'none', duration: 0.12 },
          Math.max(0, en - 0.06),
        );
      });
    },
    { scope: seccion, dependencies: [reducido], revertOnUpdate: true },
  );

  return (
    <section ref={seccion} className={styles.ia} aria-labelledby="ia-titulo">
      <div className={styles.wrap}>
        <header className={styles.seccionHeader}>
          <span className={styles.iaKicker}>Hoja de ruta</span>
          <h2 id="ia-titulo" className={styles.seccionTitulo}>
            Lo humano primero. <em>La IA, para acelerar.</em>
          </h2>
          <p className={styles.iaLead}>
            Cada estimación automática va a mostrar por qué la propone y en qué se basa. Ninguna
            banca se decide sin que vos puedas revisarla.
          </p>
        </header>
        <ol className={styles.ruta}>
          {HOJA_DE_RUTA.map((r) => (
            <li key={r.titulo} className={styles.rutaItem} data-estado={r.estado}>
              <span className={styles.rutaEtapa}>{r.etapa}</span>
              <h3 className={styles.rutaTitulo}>{r.titulo}</h3>
              <p className={styles.rutaTexto}>{r.texto}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function CamaraEnVivo() {
  const diputados = useDiputados();
  const bancas = useMemo(() => (diputados.data ?? []).map(diputadoToBanca), [diputados.data]);
  const seccion = useRef<HTMLElement>(null);
  const reducido = useReducedMotion();

  // Las bancas se ocupan de izquierda a derecha la primera vez que el hemiciclo entra en pantalla.
  useGSAP(
    () => {
      if (reducido || bancas.length === 0) return;
      const asientos = seccion.current?.querySelectorAll('svg circle');
      if (!asientos?.length) return;
      gsap.from(asientos, {
        attr: { r: 0 },
        duration: 0.5,
        ease: 'back.out(2)',
        stagger: { each: 0.004 },
        scrollTrigger: { trigger: asientos[0].closest('svg'), start: 'top 75%', once: true },
      });
    },
    { scope: seccion, dependencies: [reducido, bancas.length], revertOnUpdate: true },
  );

  // Cuando el hemiciclo reemplaza al skeleton (o aparece el error) cambia la altura de la
  // página: hay que recalcular dónde empiezan y terminan los ScrollTrigger de más abajo.
  useEffect(() => {
    ScrollTrigger.refresh();
  }, [diputados.status]);

  return (
    <section
      ref={seccion}
      className={`${styles.wrap} ${styles.camara}`}
      aria-labelledby="camara-hoy"
    >
      <header className={styles.seccionHeader}>
        <Kicker>Datos reales</Kicker>
        <h2 id="camara-hoy" className={styles.seccionTitulo}>
          La Cámara, hoy.
        </h2>
        <p className={styles.seccionLead}>
          Cada punto es una banca, agrupada por bloque. Pasá el mouse para ver quién la ocupa; hacé
          click para conocer cómo votó.
        </p>
      </header>
      <figure className={styles.camaraFigura}>
        {diputados.isError ? (
          <ErrorState error={diputados.error} onRetry={() => diputados.refetch()} />
        ) : diputados.isPending ? (
          <Skeleton height={0} className={styles.hemiSkeleton} />
        ) : (
          <Hemiciclo
            bancas={bancas}
            modo="bloques"
            ariaLabel={`Hemiciclo con ${bancas.length} bancas agrupadas por bloque.`}
            centro={
              <div className={styles.centro}>
                <span className={`${styles.centroNum} num`}>{bancas.length}</span>
                <span className={styles.centroLabel}>bancas</span>
              </div>
            }
          />
        )}
        <figcaption className={styles.camaraPie}>
          <Link to="/camara">Ver composición, bloques y últimas votaciones →</Link>
        </figcaption>
      </figure>
    </section>
  );
}
