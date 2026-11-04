import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import styles from './Fields.module.css';

export function SearchInput({
  label,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const id = useId();
  return (
    <div className={styles.search}>
      <label htmlFor={id} className="visually-hidden">
        {label}
      </label>
      <svg viewBox="0 0 20 20" aria-hidden className={styles.searchIcon}>
        <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M13 13l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <input id={id} type="search" autoComplete="off" className={styles.input} {...rest} />
    </div>
  );
}

export function SelectField({
  label,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode }) {
  const id = useId();
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <select id={id} className={styles.select} {...rest}>
        {children}
      </select>
    </div>
  );
}

export function Checkbox({
  label,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className={styles.checkbox}>
      <input type="checkbox" {...rest} />
      <span>{label}</span>
    </label>
  );
}

interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  color?: string;
}

/** Grupo de botones exclusivos (radio accesible). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  size = 'md',
}: {
  options: SegmentedOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  label: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div className={styles.segmented} role="radiogroup" aria-label={label} data-size={size}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          className={styles.segment}
          onClick={() => onChange(opt.value)}
          style={opt.color ? ({ '--seg-color': opt.color } as React.CSSProperties) : undefined}
        >
          {opt.color && <i aria-hidden />}
          {opt.label}
        </button>
      ))}
    </div>
  );
}
