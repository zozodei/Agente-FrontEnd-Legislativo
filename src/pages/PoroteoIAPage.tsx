import { useCallback, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError, errorMessage } from '@/api/client';
import { Hemiciclo, type Banca } from '@/components/hemiciclo';
import { Leyenda } from '@/components/hemiciclo/Leyenda';
import { Button } from '@/components/ui/Button';
import { SelectField } from '@/components/ui/Fields';
import { ErrorState, Skeleton, Spinner } from '@/components/ui/States';
import { Kicker, SectionHeader } from '@/components/ui/Typography';
import { diputadoToBanca, useDiputados } from '@/features/diputados/queries';
import { usePoroteo } from '@/features/poroteo/queries';
import { ResultadoPanel } from '@/features/poroteo/components/ResultadoPanel';
import { calcularResultado, TIPO_MAYORIA_LABEL } from '@/features/poroteo/resultado';
import { FichaDiputado } from '@/features/poroteoIA/components/FichaDiputado';
import { AvisoEstimacion } from '@/features/poroteoIA/components/Piezas';
import { ResumenIA } from '@/features/poroteoIA/components/ResumenIA';
import { SupuestosForm } from '@/features/poroteoIA/components/SupuestosForm';
import { TablaPredicciones } from '@/features/poroteoIA/components/TablaPredicciones';
import {
  editados as calcularEditados,
  historialDe,
  votosFinales,
} from '@/features/poroteoIA/estado';
import { useAjustarVotos, useGenerarPrediccion, usePrediccion } from '@/features/poroteoIA/queries';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { VOTO_COLOR, VOTO_LABEL } from '@/styles/palette';
import type {
  Diputado,
  PoroteoDetalle,
  PrediccionPoroteo,
  SupuestosEscenario,
  TipoMayoria,
  VotoPoroteo,
} from '@/types';
import styles from './PoroteoIAPage.module.css';

export default function PoroteoIAPage() {
  const id = useParams().id ?? '';
  const poroteo = usePoroteo(id);
  const prediccion = usePrediccion(id);
  const diputados = useDiputados();
  useDocumentTitle(poroteo.data ? `IA · ${poroteo.data.titulo}` : 'Poroteo con IA');

  const error = poroteo.error ?? prediccion.error ?? diputados.error;
  if (error) {
    return (
      <div className={styles.state}>
        <ErrorState
          error={error}
          onRetry={() => {
            void poroteo.refetch();
            void prediccion.refetch();
            void diputados.refetch();
          }}
          titulo="No pudimos abrir el poroteo con IA"
          mensaje={
            error instanceof ApiError && error.status === 404
              ? 'No existe o ya no sos miembro de este poroteo.'
              : error instanceof ApiError && error.status === 503
                ? 'La función de IA todavía no está disponible en el servidor.'
                : undefined
          }
        />
        <Link to={`/poroteos/${id}`}>← Volver al poroteo</Link>
      </div>
    );
  }
  if (!poroteo.data || !prediccion.data || !diputados.data) {
    return (
      <div className={styles.state} aria-busy="true">
        <Skeleton width="25%" height={14} />
        <Skeleton width="70%" height={56} />
        <Skeleton height={420} />
      </div>
    );
  }
  return <Vista poroteo={poroteo.data} prediccion={prediccion.data} diputados={diputados.data} />;
}

function Vista({
  poroteo,
  prediccion,
  diputados,
}: {
  poroteo: PoroteoDetalle;
  prediccion: PrediccionPoroteo;
  diputados: Diputado[];
}) {
  const generar = useGenerarPrediccion(poroteo.id);
  const ajustar = useAjustarVotos(poroteo.id);
  const [supuestos, setSupuestos] = useState<SupuestosEscenario>(prediccion.supuestos ?? {});
  const [pendientes, setPendientes] = useState<Map<number, VotoPoroteo | null>>(new Map());
  const [tipoMayoria, setTipoMayoria] = useState<TipoMayoria>(poroteo.tipoMayoria);
  const [seleccionado, setSeleccionado] = useState<number | null>(null);
  const [filtradas, setFiltradas] = useState<Set<number> | null>(null);
  const [reestimar, setReestimar] = useState(false);

  const predicciones = useMemo(
    () => new Map(prediccion.predicciones.map((p) => [p.diputadoId, p])),
    [prediccion.predicciones],
  );
  const votos = useMemo(
    () => votosFinales(poroteo, pendientes, predicciones),
    [poroteo, pendientes, predicciones],
  );
  const editados = useMemo(() => calcularEditados(poroteo, pendientes), [poroteo, pendientes]);
  const resumen = useMemo(
    () => calcularResultado(votos.values(), tipoMayoria),
    [votos, tipoMayoria],
  );
  const hayPrediccion = prediccion.predicciones.length > 0;
  const puedeEditar = poroteo.permisos.editar;
  const conflicto = [generar.error, ajustar.error].some(
    (e) => e instanceof ApiError && e.status === 409,
  );

  const bancas: Banca[] = useMemo(
    () =>
      diputados.map((d) => ({
        ...diputadoToBanca(d),
        href: null,
        voto: votos.get(d.id) ?? null,
        confianza: editados.has(d.id) ? null : (predicciones.get(d.id)?.nivelConfianza ?? null),
        editado: editados.has(d.id),
      })),
    [diputados, votos, predicciones, editados],
  );

  const onAjustar = useCallback(
    (diputadoId: number, voto: VotoPoroteo | null, motivo: string) => {
      setPendientes((prev) => new Map(prev).set(diputadoId, voto));
      ajustar.mutate(
        { version: poroteo.version, ajustes: [{ diputadoId, voto, motivo: motivo || null }] },
        {
          onSettled: () =>
            setPendientes((prev) => {
              const next = new Map(prev);
              next.delete(diputadoId);
              return next;
            }),
        },
      );
    },
    [ajustar, poroteo.version],
  );

  const onEstimar = () => {
    generar.mutate(
      { version: poroteo.version, supuestos },
      {
        onSuccess: () => {
          setReestimar(false);
          setPendientes(new Map());
        },
      },
    );
  };

  const diputadoSel =
    seleccionado !== null ? diputados.find((d) => d.id === seleccionado) : undefined;
  const formulario = (
    <div className={styles.estimar}>
      <SupuestosForm
        diputados={diputados}
        valor={supuestos}
        onChange={setSupuestos}
        temaDetectado={prediccion.resumen?.proyecto.tema ?? null}
        disabled={generar.isPending}
      />
      <div className={styles.estimarAcciones}>
        <Button
          variant="primary"
          onClick={onEstimar}
          loading={generar.isPending}
          disabled={!puedeEditar || generar.isPending || conflicto}
        >
          {hayPrediccion ? 'Volver a estimar con estos supuestos' : 'Estimar los 257 votos con IA'}
        </Button>
        {hayPrediccion && (
          <Button variant="ghost" onClick={() => setReestimar(false)} disabled={generar.isPending}>
            Cancelar
          </Button>
        )}
        {hayPrediccion && (
          <span className={styles.nota}>Los votos que corregiste a mano se mantienen.</span>
        )}
      </div>
      {generar.isPending && (
        <Spinner label="La IA está analizando votaciones parecidas y estimando cada voto…" />
      )}
      {generar.isError && !conflicto && <p role="alert">{errorMessage(generar.error)}</p>}
      {!puedeEditar && (
        <p className={styles.nota}>Tu rol en este poroteo no permite estimar ni editar.</p>
      )}
    </div>
  );

  return (
    <div className={styles.page}>
      <nav className={styles.crumbs} aria-label="Ruta">
        <Link to="/poroteos">Mis poroteos</Link> <span aria-hidden>/</span>{' '}
        <Link to={`/poroteos/${poroteo.id}`}>Editor manual</Link> <span aria-hidden>/</span> Con IA
      </nav>
      <header className={styles.header}>
        <Kicker tono="accent">Poroteo con IA · Cámara de Diputados</Kicker>
        <h1 className={styles.title}>{poroteo.titulo}</h1>
        {poroteo.descripcion && <p className={styles.desc}>{poroteo.descripcion}</p>}
        <AvisoEstimacion />
      </header>

      {conflicto && (
        <p role="alert" className={styles.alerta}>
          Otra persona modificó este poroteo mientras lo editabas.{' '}
          <a href={`/poroteos/${poroteo.id}/ia`}>Recargá la página</a> para ver la última versión.
        </p>
      )}
      {ajustar.isError && !conflicto && (
        <p role="alert" className={styles.alerta}>
          No se pudo guardar el cambio: {errorMessage(ajustar.error)}
        </p>
      )}

      {!hayPrediccion ? (
        <section className={styles.section}>
          <SectionHeader titulo="Estimar cómo votaría cada diputado">
            La IA busca votaciones parecidas desde 1993, mira cómo votó cada diputado y su bloque,
            su presentismo y su relación con el oficialismo, y estima una probabilidad para cada
            opción.
          </SectionHeader>
          {formulario}
        </section>
      ) : (
        <>
          <div className={styles.layout}>
            <div className={styles.main}>
              <div className={styles.hemi}>
                <Hemiciclo
                  bancas={bancas}
                  modo="poroteo"
                  resaltadas={filtradas}
                  ariaLabel={`Hemiciclo del poroteo con IA. ${resumen.conteo.AFIRMATIVO} afirmativos, ${resumen.conteo.NEGATIVO} negativos, ${resumen.conteo.ABSTENCION} abstenciones y ${resumen.conteo.AUSENTE} ausentes. La tabla de abajo tiene el detalle navegable con teclado.`}
                  onBancaClick={(b) => setSeleccionado(Number(b.id))}
                  centro={
                    <div className={styles.centro}>
                      <span className="num">
                        <b style={{ color: 'var(--voto-afirmativo)' }}>
                          {resumen.conteo.AFIRMATIVO}
                        </b>
                        <span className={styles.sep}>–</span>
                        <b style={{ color: 'var(--voto-negativo)' }}>{resumen.conteo.NEGATIVO}</b>
                      </span>
                    </div>
                  }
                />
                <Leyenda
                  compacta
                  items={(['AFIRMATIVO', 'NEGATIVO', 'ABSTENCION', 'AUSENTE'] as const).map(
                    (v) => ({
                      key: v,
                      label: VOTO_LABEL[v],
                      color: VOTO_COLOR[v],
                      value: resumen.conteo[v],
                    }),
                  )}
                />
                <p className={styles.hint}>
                  Bancas tenues y punteadas = predicción dudosa. Con anillo oscuro = corregida a
                  mano. Hacé click en una banca para ver por qué y cambiar el voto.
                </p>
              </div>
              <section className={styles.section}>
                <SectionHeader as="h2" kicker="Detalle" titulo="Todos los diputados">
                  Filtrá por bloque, provincia, voto o confianza. Hacé click en un nombre para abrir
                  su ficha.
                </SectionHeader>
                <TablaPredicciones
                  diputados={diputados}
                  predicciones={predicciones}
                  votos={votos}
                  editados={editados}
                  seleccionado={seleccionado}
                  onSeleccionar={setSeleccionado}
                  onFiltrar={setFiltradas}
                />
              </section>
            </div>
            <aside className={styles.aside}>
              <div className={styles.sticky}>
                <ResultadoPanel resumen={resumen} />
                <SelectField
                  label="Evaluar con mayoría"
                  value={tipoMayoria}
                  onChange={(e) => setTipoMayoria(e.target.value as TipoMayoria)}
                >
                  {(Object.keys(TIPO_MAYORIA_LABEL) as TipoMayoria[]).map((k) => (
                    <option key={k} value={k}>
                      {TIPO_MAYORIA_LABEL[k]}
                    </option>
                  ))}
                </SelectField>
                <p className={styles.guardado} role="status">
                  {ajustar.isPending
                    ? 'Guardando cambio…'
                    : editados.size
                      ? `${editados.size} votos corregidos a mano · guardado`
                      : 'Sin correcciones manuales'}
                </p>
                {diputadoSel ? (
                  <FichaDiputado
                    key={diputadoSel.id}
                    diputado={diputadoSel}
                    prediccion={predicciones.get(diputadoSel.id)}
                    votoFinal={votos.get(diputadoSel.id) ?? null}
                    editado={editados.has(diputadoSel.id)}
                    historial={historialDe(prediccion.historialAjustes, diputadoSel.id)}
                    puedeEditar={puedeEditar && !conflicto}
                    ocupado={ajustar.isPending}
                    onAjustar={(voto, motivo) => onAjustar(diputadoSel.id, voto, motivo)}
                    onCerrar={() => setSeleccionado(null)}
                  />
                ) : (
                  <p className={styles.nota}>
                    Elegí un diputado en el hemiciclo o en la tabla para ver su ficha.
                  </p>
                )}
              </div>
            </aside>
          </div>
          <ResumenIA prediccion={prediccion} editados={editados.size} />
          <section className={styles.section}>
            {reestimar ? (
              formulario
            ) : (
              <Button variant="ghost" onClick={() => setReestimar(true)} disabled={!puedeEditar}>
                Cambiar supuestos y volver a estimar
              </Button>
            )}
          </section>
        </>
      )}
    </div>
  );
}
