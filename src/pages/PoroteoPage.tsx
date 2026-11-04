import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useBlocker, useNavigate, useParams } from 'react-router-dom';
import { errorMessage } from '@/api/client';
import { Hemiciclo, type Banca } from '@/components/hemiciclo';
import { Button } from '@/components/ui/Button';
import { Segmented, SelectField } from '@/components/ui/Fields';
import { ErrorState, Skeleton } from '@/components/ui/States';
import { Kicker, SectionHeader } from '@/components/ui/Typography';
import { diputadoToBanca, useDiputados } from '@/features/diputados/queries';
import { BloqueAcciones } from '@/features/poroteo/components/BloqueAcciones';
import { ListaVotos } from '@/features/poroteo/components/ListaVotos';
import { ResultadoPanel } from '@/features/poroteo/components/ResultadoPanel';
import {
  useActualizarPoroteo,
  useEliminarPoroteo,
  useGuardarVotos,
  usePoroteo,
} from '@/features/poroteo/queries';
import { TIPO_MAYORIA_LABEL } from '@/features/poroteo/resultado';
import { usePoroteoEditor } from '@/features/poroteo/usePoroteoEditor';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { VOTO_COLOR, VOTO_LABEL } from '@/styles/palette';
import type { Diputado, PoroteoDetalle, TipoMayoria, VotoPoroteo } from '@/types';
import { formatRelative } from '@/utils/format';
import styles from './PoroteoPage.module.css';

export default function PoroteoPage() {
  const id = useParams().id ?? '';
  const poroteo = usePoroteo(id);
  const diputados = useDiputados();
  useDocumentTitle(poroteo.data?.titulo ?? 'Poroteo');

  if (poroteo.isError || diputados.isError) {
    return (
      <div className={styles.state}>
        <ErrorState
          error={poroteo.error ?? diputados.error}
          onRetry={() => {
            poroteo.refetch();
            diputados.refetch();
          }}
          titulo="No pudimos abrir el poroteo"
        />
        <Link to="/poroteos">← Volver a los poroteos</Link>
      </div>
    );
  }
  if (poroteo.isPending || diputados.isPending) {
    return (
      <div className={styles.state} aria-busy="true">
        <Skeleton width="25%" height={14} />
        <Skeleton width="70%" height={56} />
        <Skeleton height={420} />
      </div>
    );
  }
  // key: si cambia el id, el editor se reinicia con los votos del nuevo poroteo.
  return <Editor key={poroteo.data.id} poroteo={poroteo.data} diputados={diputados.data} />;
}

type Pincel = VotoPoroteo | 'BORRAR';
const PINCELES: Pincel[] = ['AFIRMATIVO', 'NEGATIVO', 'ABSTENCION', 'AUSENTE', 'BORRAR'];
type Vista = 'hemiciclo' | 'lista';

function Editor({ poroteo, diputados }: { poroteo: PoroteoDetalle; diputados: Diputado[] }) {
  const navigate = useNavigate();
  const [tipoMayoria, setTipoMayoria] = useState<TipoMayoria>(poroteo.tipoMayoria);
  const editor = usePoroteoEditor(poroteo, tipoMayoria);
  const { votos, asignar, deshacer, puedeDeshacer, limpiar, resumen, dirty, marcarGuardado } =
    editor;
  const [pincel, setPincel] = useState<Pincel>('AFIRMATIVO');
  const [vista, setVista] = useState<Vista>('hemiciclo');

  const guardar = useGuardarVotos(poroteo.id);
  const actualizar = useActualizarPoroteo(poroteo.id);
  const eliminar = useEliminarPoroteo();

  const bancas: Banca[] = useMemo(
    () =>
      diputados.map((d) => ({ ...diputadoToBanca(d), href: null, voto: votos.get(d.id) ?? null })),
    [diputados, votos],
  );

  const pintar = useCallback(
    (banca: Banca, toggle: boolean) => {
      const id = Number(banca.id);
      const actual = votos.get(id) ?? null;
      const nuevo = pincel === 'BORRAR' ? null : pincel;
      // Click sobre una banca que ya tiene el voto del pincel → la limpia.
      asignar([id], toggle && actual === nuevo ? null : nuevo);
    },
    [asignar, pincel, votos],
  );

  const onGuardar = () => {
    const payload = [...votos.entries()].map(([diputadoId, voto]) => ({ diputadoId, voto }));
    const snapshot = new Map(votos);
    guardar.mutate(payload, { onSuccess: () => marcarGuardado(snapshot) });
  };

  const onTipoMayoria = (tipo: TipoMayoria) => {
    setTipoMayoria(tipo);
    actualizar.mutate({ tipoMayoria: tipo });
  };

  const onEliminar = () => {
    if (!window.confirm(`¿Borrar el poroteo "${poroteo.titulo}"? No se puede deshacer.`)) return;
    eliminar.mutate(poroteo.id, { onSuccess: () => navigate('/poroteos', { replace: true }) });
  };

  const completarAusentes = () => {
    const ids = diputados.filter((d) => !votos.has(d.id)).map((d) => d.id);
    asignar(ids, 'AUSENTE');
  };

  // Atajos de teclado: 1–5 eligen pincel, Ctrl/Cmd+Z deshace, Ctrl/Cmd+S guarda.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        deshacer();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (dirty && !guardar.isPending) onGuardar();
      } else if (!e.ctrlKey && !e.metaKey && /^[1-5]$/.test(e.key)) {
        setPincel(PINCELES[Number(e.key) - 1]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Avisar si se intenta salir con cambios sin guardar.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && currentLocation.pathname !== nextLocation.pathname,
  );
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    if (window.confirm('Tenés cambios sin guardar. ¿Salir igual?')) blocker.proceed();
    else blocker.reset();
  }, [blocker]);

  return (
    <div className={styles.page}>
      <nav className={styles.crumbs} aria-label="Ruta">
        <Link to="/poroteos">Poroteos</Link> <span aria-hidden>/</span>{' '}
        {poroteo.estado === 'final' ? 'final' : 'borrador'}
      </nav>

      <header className={styles.header}>
        <div className={styles.headerText}>
          <Kicker tono="accent">
            Poroteo manual · editado {formatRelative(poroteo.updatedAt)}
            {poroteo.archivoNombre ? ` · ${poroteo.archivoNombre}` : ''}
          </Kicker>
          <h1 className={styles.title}>{poroteo.titulo}</h1>
          {poroteo.descripcion && <p className={styles.desc}>{poroteo.descripcion}</p>}
        </div>
        <div className={styles.headerActions}>
          <SelectField
            label="Mayoría"
            value={tipoMayoria}
            onChange={(e) => onTipoMayoria(e.target.value as TipoMayoria)}
          >
            {(Object.keys(TIPO_MAYORIA_LABEL) as TipoMayoria[]).map((k) => (
              <option key={k} value={k}>
                {TIPO_MAYORIA_LABEL[k]}
              </option>
            ))}
          </SelectField>
          <Button variant="danger" size="sm" onClick={onEliminar} loading={eliminar.isPending}>
            Borrar
          </Button>
        </div>
      </header>

      <div className={styles.layout}>
        <div className={styles.main}>
          <div className={styles.toolbar}>
            <div className={styles.pincel}>
              <span className={styles.toolLabel}>Pincel</span>
              <Segmented
                label="Voto a asignar al hacer click"
                value={pincel}
                onChange={setPincel}
                options={PINCELES.map((p, i) => ({
                  value: p,
                  label: (
                    <>
                      {p === 'BORRAR' ? 'Borrar' : VOTO_LABEL[p]}
                      <kbd className={styles.kbd}>{i + 1}</kbd>
                    </>
                  ),
                  color: p === 'BORRAR' ? undefined : VOTO_COLOR[p],
                }))}
              />
            </div>
            <Segmented
              size="sm"
              label="Vista"
              value={vista}
              onChange={setVista}
              options={[
                { value: 'hemiciclo', label: 'Hemiciclo' },
                { value: 'lista', label: 'Lista' },
              ]}
            />
          </div>

          {vista === 'hemiciclo' ? (
            <div className={styles.hemi}>
              <Hemiciclo
                bancas={bancas}
                modo="poroteo"
                ariaLabel={`Hemiciclo del poroteo. ${resumen.conteo.AFIRMATIVO} afirmativos, ${resumen.conteo.NEGATIVO} negativos, ${resumen.enDisputa} sin definir. Usá la vista de lista para asignar votos con el teclado.`}
                onBancaClick={(b) => pintar(b, true)}
                onBancaPaint={(b) => pintar(b, false)}
                centro={
                  <div className={styles.centro}>
                    <span className="num">
                      <b style={{ color: 'var(--voto-afirmativo)' }}>{resumen.conteo.AFIRMATIVO}</b>
                      <span className={styles.sep}>–</span>
                      <b style={{ color: 'var(--voto-negativo)' }}>{resumen.conteo.NEGATIVO}</b>
                    </span>
                  </div>
                }
              />
              <p className={styles.hint}>
                Elegí un pincel y hacé click en las bancas (con el mouse podés arrastrar para pintar
                varias). Click de nuevo sobre una banca con el mismo voto la limpia.
              </p>
            </div>
          ) : (
            <ListaVotos diputados={diputados} votos={votos} onAsignar={asignar} />
          )}

          <section className={styles.section}>
            <SectionHeader as="h2" kicker="Acción rápida" titulo="Por bloque">
              Asigná un voto a todo un bloque y después ajustá a los diputados que se aparten.
            </SectionHeader>
            <BloqueAcciones diputados={diputados} votos={votos} onAsignar={asignar} />
          </section>
        </div>

        <aside className={styles.aside}>
          <div className={styles.sticky}>
            <ResultadoPanel resumen={resumen} />

            <div className={styles.saveBox}>
              <Button
                variant="primary"
                onClick={onGuardar}
                disabled={!dirty}
                loading={guardar.isPending}
              >
                {dirty ? 'Guardar cambios' : 'Guardado'}
              </Button>
              <span className={styles.saveState} role="status">
                {guardar.isError
                  ? errorMessage(guardar.error)
                  : dirty
                    ? 'Hay cambios sin guardar'
                    : guardar.isSuccess
                      ? 'Cambios guardados'
                      : 'Sin cambios'}
              </span>
            </div>
            <div className={styles.quick}>
              <Button size="sm" variant="ghost" onClick={deshacer} disabled={!puedeDeshacer}>
                ↶ Deshacer
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={completarAusentes}
                disabled={resumen.conteo.sinAsignar === 0}
              >
                Sin asignar → Ausente
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => window.confirm('¿Limpiar todos los votos asignados?') && limpiar()}
                disabled={votos.size === 0}
              >
                Limpiar todo
              </Button>
            </div>
            {actualizar.isError && <p className={styles.error}>{errorMessage(actualizar.error)}</p>}
          </div>
        </aside>
      </div>
    </div>
  );
}
