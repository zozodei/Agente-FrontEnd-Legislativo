import styles from './Leyenda.module.css';

export interface LeyendaItem {
  key: string;
  label: string;
  color: string;
  value?: number | string;
  /** Muestra el punto con borde punteado (votos sin definir). */
  vacio?: boolean;
}

interface LeyendaProps {
  items: LeyendaItem[];
  onItemHover?: (key: string | null) => void;
  activo?: string | null;
  compacta?: boolean;
}

export function Leyenda({ items, onItemHover, activo, compacta }: LeyendaProps) {
  return (
    <ul className={styles.list} data-compacta={compacta || undefined}>
      {items.map((item) => (
        <li
          key={item.key}
          className={styles.item}
          data-dim={activo && activo !== item.key ? true : undefined}
          onMouseEnter={onItemHover ? () => onItemHover(item.key) : undefined}
          onMouseLeave={onItemHover ? () => onItemHover(null) : undefined}
        >
          <span
            className={styles.dot}
            data-vacio={item.vacio || undefined}
            style={{ background: item.color }}
            aria-hidden
          />
          <span className={styles.label}>{item.label}</span>
          {item.value !== undefined && <span className={`${styles.value} num`}>{item.value}</span>}
        </li>
      ))}
    </ul>
  );
}
