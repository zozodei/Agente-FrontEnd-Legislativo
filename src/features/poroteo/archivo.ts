/**
 * ¿Es un PDF? Algunos navegadores (Windows sin lector de PDF instalado, ciertos
 * Android) mandan el archivo sin tipo o como octet-stream: ahí decide la extensión.
 * El backend vuelve a validar el contenido por la firma %PDF-.
 */
export function esPdf(file: Pick<File, 'type' | 'name'>): boolean {
  if (file.type === 'application/pdf' || file.type === 'application/x-pdf') return true;
  return (
    (file.type === '' || file.type === 'application/octet-stream') && /\.pdf$/i.test(file.name)
  );
}
