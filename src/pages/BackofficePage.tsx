import { PageHeader, Stat } from '@/components/ui/Typography';
import { ErrorState, Skeleton } from '@/components/ui/States';
import { useAdminResumen } from '@/features/backoffice/queries';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatNumber } from '@/utils/format';
import styles from '@/features/backoffice/Backoffice.module.css';

export default function BackofficePage() {
  useDocumentTitle('Backoffice');
  const { data, isPending, isError, error, refetch } = useAdminResumen();
  return (
    <>
      <PageHeader
        kicker="Panorama"
        titulo="La plataforma, en números."
        bajada="Conteos consultados en la base. Este espacio permite revisar información sin modificarla."
      />
      {isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : isPending ? (
        <Skeleton height={200} />
      ) : (
        <div className={styles.metrics}>
          <Stat valor={formatNumber(data.poroteos.total)} label="Poroteos" />
          <Stat valor={formatNumber(data.poroteos.borradores)} label="Borradores" />
          <Stat valor={formatNumber(data.poroteos.finalizados)} label="Finalizados" />
          <Stat valor={formatNumber(data.diputados)} label="Diputados actuales" />
          <Stat valor={formatNumber(data.bloques)} label="Bloques actuales" />
          <Stat valor={formatNumber(data.votaciones)} label="Votaciones históricas" />
        </div>
      )}
    </>
  );
}
