/** Web Locks serializa rotación, login y logout entre pestañas del mismo origen. */
export class SessionLockError extends Error {}
export function withSessionLock<T>(operation: () => Promise<T>): Promise<T> {
  if (navigator.locks?.request) return navigator.locks.request('poroteo-auth', operation);
  return Promise.reject(
    new SessionLockError(
      'Para iniciar o renovar la sesión usá un navegador actualizado y una conexión HTTPS (o localhost en desarrollo).',
    ),
  );
}
