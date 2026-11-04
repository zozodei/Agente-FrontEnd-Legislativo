import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { errorMessage } from '@/api/client';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Fields';
import { PageHeader } from '@/components/ui/Typography';
import { useCrearPoroteo } from '@/features/poroteo/queries';
import { TIPO_MAYORIA_LABEL } from '@/features/poroteo/resultado';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { TipoMayoria } from '@/types';
import styles from './NuevoPoroteoPage.module.css';

const MAX_PDF_MB = 10;

export default function NuevoPoroteoPage() {
  useDocumentTitle('Nuevo poroteo');
  const navigate = useNavigate();
  const location = useLocation();
  const sugerido = (location.state as { titulo?: string } | null)?.titulo ?? '';

  const [titulo, setTitulo] = useState(sugerido);
  const [descripcion, setDescripcion] = useState('');
  const [texto, setTexto] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [tipoMayoria, setTipoMayoria] = useState<TipoMayoria>('simple');
  const [fileError, setFileError] = useState<string | null>(null);
  const crear = useCrearPoroteo();

  const tituloError =
    titulo.trim().length > 0 && titulo.trim().length < 3 ? 'Mínimo 3 caracteres' : null;

  const onFile = (file: File | null) => {
    setFileError(null);
    if (!file) return setArchivo(null);
    if (file.type !== 'application/pdf') return setFileError('Solo se aceptan archivos PDF.');
    if (file.size > MAX_PDF_MB * 1024 * 1024)
      return setFileError(`El PDF supera los ${MAX_PDF_MB} MB.`);
    setArchivo(file);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (titulo.trim().length < 3) return;
    crear.mutate(
      {
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || undefined,
        textoProyecto: texto.trim() || undefined,
        tipoMayoria,
        archivo,
      },
      { onSuccess: (p) => navigate(`/poroteos/${p.id}`, { replace: true }) },
    );
  };

  return (
    <>
      <PageHeader
        kicker="Nuevo poroteo"
        titulo="Cargá el proyecto de ley"
        bajada="Con el título alcanza para empezar. El texto o el PDF quedan guardados para la futura estimación con IA."
      />

      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <div className={styles.field}>
          <label htmlFor="titulo" className={styles.label}>
            Título del proyecto <span aria-hidden>*</span>
          </label>
          <input
            id="titulo"
            className={styles.titleInput}
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ej.: Ley de financiamiento universitario"
            maxLength={300}
            required
            aria-invalid={Boolean(tituloError) || undefined}
            aria-describedby={tituloError ? 'titulo-error' : undefined}
            autoFocus
          />
          {tituloError && (
            <span id="titulo-error" className={styles.error}>
              {tituloError}
            </span>
          )}
        </div>

        <div className={styles.field}>
          <label htmlFor="descripcion" className={styles.label}>
            Descripción
          </label>
          <textarea
            id="descripcion"
            className={styles.textarea}
            rows={3}
            maxLength={5000}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="De qué se trata, quién lo impulsa, en qué etapa está…"
          />
        </div>

        <div className={styles.field}>
          <span className={styles.label} id="mayoria-label">
            Mayoría necesaria
          </span>
          <Segmented
            label="Mayoría necesaria"
            value={tipoMayoria}
            onChange={setTipoMayoria}
            options={(Object.keys(TIPO_MAYORIA_LABEL) as TipoMayoria[]).map((k) => ({
              value: k,
              label: TIPO_MAYORIA_LABEL[k],
            }))}
          />
          <span className={styles.hint}>
            La mayoría simple es la regla general. Algunas leyes (ej. reformas de ciertos regímenes)
            requieren mayorías especiales.
          </span>
        </div>

        <fieldset className={styles.fieldset}>
          <legend className={styles.label}>Texto del proyecto (opcional)</legend>
          <div className={styles.two}>
            <div className={styles.field}>
              <label htmlFor="texto" className="visually-hidden">
                Pegar el texto
              </label>
              <textarea
                id="texto"
                className={styles.textarea}
                rows={7}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Pegá acá el articulado o los fundamentos…"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.drop} data-has-file={archivo ? true : undefined}>
                <input
                  type="file"
                  accept="application/pdf"
                  className="visually-hidden"
                  onChange={(e) => onFile(e.target.files?.[0] ?? null)}
                />
                {archivo ? (
                  <>
                    <strong>{archivo.name}</strong>
                    <span>{(archivo.size / 1024 / 1024).toFixed(1)} MB · se extraerá el texto</span>
                  </>
                ) : (
                  <>
                    <strong>Subir PDF</strong>
                    <span>Hasta {MAX_PDF_MB} MB</span>
                  </>
                )}
              </label>
              {archivo && (
                <Button type="button" size="sm" variant="ghost" onClick={() => setArchivo(null)}>
                  Quitar archivo
                </Button>
              )}
              {fileError && <span className={styles.error}>{fileError}</span>}
            </div>
          </div>
        </fieldset>

        {crear.isError && (
          <p className={styles.submitError} role="alert">
            {errorMessage(crear.error)}
          </p>
        )}

        <div className={styles.actions}>
          <Button
            type="submit"
            variant="primary"
            loading={crear.isPending}
            disabled={titulo.trim().length < 3}
          >
            Crear y empezar a porotear
          </Button>
          <ButtonLink to="/poroteos" variant="ghost">
            Cancelar
          </ButtonLink>
        </div>
      </form>
    </>
  );
}
