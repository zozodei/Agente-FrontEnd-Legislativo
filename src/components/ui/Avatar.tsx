import { useState } from 'react';
import { iniciales } from '@/utils/text';
import styles from './Avatar.module.css';

interface AvatarProps {
  src: string | null | undefined;
  nombre: string;
  size?: number;
  /** "circle" para listas y tooltips, "portrait" para el perfil (recorte 4:5). */
  shape?: 'circle' | 'square' | 'portrait';
  className?: string;
}

/** Foto del diputado con recorte cuidado y placeholder de iniciales si falla. */
export function Avatar({ src, nombre, size = 40, shape = 'circle', className }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const partes = nombre.replace(',', ' ').split(/\s+/).filter(Boolean);
  const label = iniciales(partes[0] ?? '', partes[1]);
  const style =
    shape === 'portrait' ? { width: '100%', aspectRatio: '4 / 5' } : { width: size, height: size };

  return (
    <span
      className={[styles.avatar, styles[shape], className].filter(Boolean).join(' ')}
      style={style}
    >
      {src && !failed ? (
        <img src={src} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />
      ) : (
        <span className={styles.fallback} aria-hidden>
          {label}
        </span>
      )}
    </span>
  );
}
