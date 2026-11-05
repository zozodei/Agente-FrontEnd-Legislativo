import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/States';
import { PageHeader } from '@/components/ui/Typography';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function NotFoundPage() {
  useDocumentTitle('Página no encontrada');
  return (
    <>
      <PageHeader titulo="Esta banca está vacía." />
      <EmptyState
        titulo="No encontramos la página que buscabas"
        accion={
          <ButtonLink to="/" variant="primary">
            Volver al inicio
          </ButtonLink>
        }
      >
        Puede que el link esté mal escrito o que el contenido ya no exista.
      </EmptyState>
    </>
  );
}
