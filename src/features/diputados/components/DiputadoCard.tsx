import { Link } from 'react-router-dom';
import { Avatar } from '@/components/ui/Avatar';
import { BloqueChip } from '@/components/ui/Badges';
import { bloqueStyle } from '@/styles/palette';
import type { Diputado } from '@/types';
import { titleCase } from '@/utils/text';
import styles from './DiputadoCard.module.css';

export function DiputadoCard({ diputado }: { diputado: Diputado }) {
  return (
    <li
      className={styles.card}
      style={{ '--bloque': bloqueStyle(diputado.bloque).color } as React.CSSProperties}
    >
      <Link to={`/diputados/${diputado.id}`} className={styles.link}>
        <Avatar
          src={diputado.fotoUrl}
          nombre={`${diputado.nombre} ${diputado.apellido}`}
          shape="portrait"
        />
        <span className={styles.body}>
          <span className={styles.name}>
            <span className={styles.apellido}>{diputado.apellido}</span>
            <span className={styles.nombre}>{diputado.nombre}</span>
          </span>
          <BloqueChip bloque={diputado.bloque} />
          <span className={styles.distrito}>{titleCase(diputado.distrito)}</span>
        </span>
      </Link>
    </li>
  );
}

export function DiputadoListRow({ diputado }: { diputado: Diputado }) {
  return (
    <li className={styles.row}>
      <Link to={`/diputados/${diputado.id}`} className={styles.rowLink}>
        <Avatar
          src={diputado.fotoUrl}
          nombre={`${diputado.nombre} ${diputado.apellido}`}
          size={44}
        />
        <span className={styles.rowName}>
          <strong>{diputado.apellido}</strong>, {diputado.nombre}
        </span>
        <BloqueChip bloque={diputado.bloque} />
        <span className={styles.distrito}>{titleCase(diputado.distrito)}</span>
        <span className={`${styles.rowStat} num`}>
          {diputado.presentismo !== null ? `${diputado.presentismo.toLocaleString('es-AR')}%` : '—'}
        </span>
      </Link>
    </li>
  );
}
