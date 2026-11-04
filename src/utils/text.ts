/** Minúsculas y sin tildes, para comparar y buscar. */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

const SIGLAS = new Set(['pro', 'ucr', 'mid', 'pts', 'fit', 'cc', 'caba', 'lla', 'ari', 'uxp']);
const MENORES = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e', 'en', 'el', 'por', 'para']);

/** "UNIÓN POR LA PATRIA" → "Unión por la Patria"; respeta siglas (PRO, UCR, MID). */
export function titleCase(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .split(/(\s+|-)/)
    .map((word, i) => {
      if (SIGLAS.has(normalize(word))) return word.toUpperCase();
      if (i > 0 && MENORES.has(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join('');
}

/** "AGUERO, Guillermo Cesar" → "Guillermo Cesar Aguero". */
export function nombreLegible(nombre: string): string {
  const [apellido, resto] = nombre.split(',').map((s) => s.trim());
  if (!resto) return titleCase(nombre);
  return `${titleCase(resto)} ${titleCase(apellido)}`;
}

/** Iniciales para el placeholder de foto. */
export function iniciales(nombre: string, apellido?: string): string {
  const a = (nombre.trim()[0] ?? '').toUpperCase();
  const b = (apellido?.trim()[0] ?? '').toUpperCase();
  return a + b;
}

/** true si el texto está casi todo en MAYÚSCULAS (títulos de actas de la HCDN). */
export function isAllCaps(text: string | null | undefined): boolean {
  const letters = (text ?? '').replace(/[^\p{L}]/gu, '');
  if (letters.length < 8) return false;
  const upper = letters.replace(/[^\p{Lu}]/gu, '').length;
  return upper / letters.length > 0.85;
}
