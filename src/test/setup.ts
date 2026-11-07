import '@testing-library/jest-dom/vitest';
// Simula coordinación del navegador; no se usan cookies ni sesiones reales.
let sessionQueue: Promise<unknown> = Promise.resolve();
Object.defineProperty(navigator, 'locks', {
  configurable: true,
  value: {
    request: <T>(_name: string, run: () => Promise<T>): Promise<T> => {
      const result = sessionQueue.then(run, run);
      sessionQueue = result.catch(() => undefined);
      return result;
    },
  },
});
