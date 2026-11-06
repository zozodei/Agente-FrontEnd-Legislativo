import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Hemiciclo } from '@/components/hemiciclo';
import { ButtonLink } from '@/components/ui/Button';
import { ErrorState, Skeleton } from '@/components/ui/States';
import { Kicker } from '@/components/ui/Typography';
import { useAuth } from '@/features/auth/useAuth';
import { useResumen } from '@/features/dashboard/queries';
import { diputadoToBanca, useDiputados } from '@/features/diputados/queries';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatNumber } from '@/utils/format';
import styles from './LandingPage.module.css';

/**
 * Foto de portada: "Atardecer en el Congreso de la Nación Argentina", de Miguel César,
 * Wikimedia Commons, CC BY-SA 3.0. Si se quiere servir local, bajarla a public/img/
 * y cambiar estas URLs (el crédito tiene que seguir visible).
 */
const FOTO_BASE =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Atardecer_en_el_Congreso_de_la_Naci%C3%B3n_Argentina.jpg';
const FOTO_ARCHIVO = 'Atardecer_en_el_Congreso_de_la_Naci%C3%B3n_Argentina.jpg';
const FOTO = {
  src: `${FOTO_BASE}/1920px-${FOTO_ARCHIVO}`,
  srcSet: `${FOTO_BASE}/1280px-${FOTO_ARCHIVO} 1280w, ${FOTO_BASE}/1920px-${FOTO_ARCHIVO} 1920w, ${FOTO_BASE}/2560px-${FOTO_ARCHIVO} 2560w`,
  pagina:
    'https://commons.wikimedia.org/wiki/File:Atardecer_en_el_Congreso_de_la_Naci%C3%B3n_Argentina.jpg',
  autor: 'Miguel César',
  licencia: 'CC BY-SA 3.0',
  licenciaUrl: 'https://creativecommons.org/licenses/by-sa/3.0/deed.es',
};

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
      {/* ── Portada ─────────────────────────────────────────────── */}
      <section className={styles.hero} aria-labelledby="hero-titulo">
        <Portada />
        <div className={`${styles.wrap} ${styles.heroInner}`}>
          <div className={styles.heroText}>
            <span className={styles.heroKicker}>
              <span className={styles.dot} aria-hidden /> Congreso de la Nación Argentina · Cámara
              de Diputados
            </span>
            <h1 id="hero-titulo" className={styles.heroTitle}>
              Sabé si una ley sale <em>antes de que se vote.</em>
            </h1>
            <p className={styles.heroLead}>
              demoIA estima, banca por banca, cómo votaría cada uno de los 257 diputados un proyecto
              de ley. Hoy, con tu criterio y datos abiertos; muy pronto, con inteligencia artificial
              entrenada en décadas de votaciones nominales.
            </p>
            <div className={styles.heroActions}>
              <ButtonLink
                to={logueado ? '/poroteos/nuevo' : '/registro'}
                variant="inverse"
                size="lg"
              >
                Empezar a porotear
              </ButtonLink>
              <ButtonLink to="/camara" variant="outlineInverse" size="lg">
                Explorar la Cámara
              </ButtonLink>
            </div>
          </div>

          <EscenarioEjemplo />
        </div>

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
      </section>

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
      <section className={styles.ia} aria-labelledby="ia-titulo">
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
          <div className={styles.heroActions}>
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

      <p className={`${styles.wrap} ${styles.credito}`}>
        Foto de portada:{' '}
        <a href={FOTO.pagina} target="_blank" rel="noreferrer">
          “Atardecer en el Congreso de la Nación Argentina”
        </a>
        , {FOTO.autor}, Wikimedia Commons,{' '}
        <a href={FOTO.licenciaUrl} target="_blank" rel="noreferrer">
          {FOTO.licencia}
        </a>
        .
      </p>
    </div>
  );
}

/** Foto del Congreso con duotono, retícula y un zoom muy lento ("plano de cámara"). */
function Portada() {
  const [cargada, setCargada] = useState(false);
  const [fallo, setFallo] = useState(false);
  return (
    <div className={styles.portada} aria-hidden>
      {!fallo && (
        <img
          src={FOTO.src}
          srcSet={FOTO.srcSet}
          sizes="100vw"
          alt=""
          className={styles.foto}
          data-cargada={cargada || undefined}
          onLoad={() => setCargada(true)}
          onError={() => setFallo(true)}
          fetchPriority="high"
          decoding="async"
        />
      )}
      <span className={styles.velo} />
      <span className={styles.reticula} />
      <span className={styles.sol} />
    </div>
  );
}

/** Tarjeta "en pantalla" con un escenario inventado, rotulada como ejemplo. */
function EscenarioEjemplo() {
  const conteo = { afirmativo: 131, negativo: 98, abstencion: 6, pendiente: 22 };
  const total = 257;
  return (
    <figure className={styles.escenario} aria-label="Escenario de ejemplo de un poroteo">
      <figcaption className={styles.escenarioHead}>
        <span>Escenario de ejemplo</span>
        <span className={styles.escenarioVivo}>
          <span className={styles.dot} aria-hidden /> en vivo
        </span>
      </figcaption>
      <p className={styles.escenarioTitulo}>Proyecto de ley · mayoría simple</p>
      <div
        className={styles.barra}
        role="img"
        aria-label="131 a favor, 98 en contra, 6 abstenciones, 22 sin definir"
      >
        <span
          style={{ '--w': `${(conteo.afirmativo / total) * 100}%` } as React.CSSProperties}
          data-voto="afirmativo"
        />
        <span
          style={{ '--w': `${(conteo.negativo / total) * 100}%` } as React.CSSProperties}
          data-voto="negativo"
        />
        <span
          style={{ '--w': `${(conteo.abstencion / total) * 100}%` } as React.CSSProperties}
          data-voto="abstencion"
        />
        <i className={styles.quorum} style={{ left: `${(129 / total) * 100}%` }} />
      </div>
      <dl className={styles.escenarioConteo}>
        <div data-voto="afirmativo">
          <dt>A favor</dt>
          <dd className="num">{conteo.afirmativo}</dd>
        </div>
        <div data-voto="negativo">
          <dt>En contra</dt>
          <dd className="num">{conteo.negativo}</dd>
        </div>
        <div data-voto="abstencion">
          <dt>Abst.</dt>
          <dd className="num">{conteo.abstencion}</dd>
        </div>
        <div>
          <dt>En duda</dt>
          <dd className="num">{conteo.pendiente}</dd>
        </div>
      </dl>
      <p className={styles.escenarioResultado}>
        <span>Quórum ✓</span>
        <strong>Se aprueba</strong>
      </p>
      <p className={styles.prompt}>
        <span aria-hidden>&gt;</span> estimar con IA
        <span className={styles.cursor} aria-hidden />
        <span className={styles.pronto}>próximamente</span>
      </p>
    </figure>
  );
}

function CamaraEnVivo() {
  const diputados = useDiputados();
  const bancas = useMemo(() => (diputados.data ?? []).map(diputadoToBanca), [diputados.data]);

  return (
    <section className={`${styles.wrap} ${styles.camara}`} aria-labelledby="camara-hoy">
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
