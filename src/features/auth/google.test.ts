import { beforeEach, describe, expect, it } from 'vitest';
import {
  leerDestinoGoogle,
  guardarDestinoGoogle,
  mensajeErrorGoogle,
  parseCallbackGoogle,
  urlCallbackGoogle,
} from './google';

const AHORA = 1_700_000_000_000; // ms fijos para expiresAt

describe('parseCallbackGoogle', () => {
  it('extrae la sesión del hash y calcula expiresAt en segundos', () => {
    const r = parseCallbackGoogle(
      '#access_token=tok-a&refresh_token=tok-r&expires_in=3600&token_type=bearer',
      '',
      AHORA,
    );
    expect(r).toEqual({
      tipo: 'sesion',
      sesion: {
        accessToken: 'tok-a',
        refreshToken: 'tok-r',
        expiresIn: 3600,
        expiresAt: AHORA / 1000 + 3600,
        tokenType: 'bearer',
      },
    });
  });

  it('sin expires_in usa 3600 por defecto', () => {
    const r = parseCallbackGoogle('#access_token=a&refresh_token=r', '', AHORA);
    expect(r.tipo).toBe('sesion');
    if (r.tipo === 'sesion') expect(r.sesion.expiresIn).toBe(3600);
  });

  it('error de Google en el hash (access_denied)', () => {
    expect(parseCallbackGoogle('#error=access_denied')).toEqual({
      tipo: 'error',
      error: 'access_denied',
      descripcion: null,
    });
  });

  it('error_description se decodifica (+ = espacio)', () => {
    const r = parseCallbackGoogle('#error=server_error&error_description=Algo+salio+mal');
    expect(r.tipo).toBe('error');
    if (r.tipo === 'error') expect(r.descripcion).toBe('Algo salio mal');
  });

  it('también acepta el error en la query', () => {
    expect(parseCallbackGoogle('', '?error=access_denied').tipo).toBe('error');
  });

  it('sin tokens ni error → vacio', () => {
    expect(parseCallbackGoogle('')).toEqual({ tipo: 'vacio' });
    expect(parseCallbackGoogle('#access_token=solo')).toEqual({ tipo: 'vacio' });
  });
});

describe('mensajeErrorGoogle', () => {
  it('access_denied se explica en español', () => {
    expect(mensajeErrorGoogle({ tipo: 'error', error: 'access_denied', descripcion: null })).toBe(
      'Cancelaste el inicio de sesión con Google.',
    );
  });

  it('usa la descripción si viene', () => {
    expect(
      mensajeErrorGoogle({ tipo: 'error', error: 'server_error', descripcion: 'Cayó Google' }),
    ).toBe('Cayó Google');
  });

  it('sin datos pide reintentar', () => {
    expect(mensajeErrorGoogle({ tipo: 'vacio' })).toMatch(/Probá de nuevo/);
  });
});

describe('urlCallbackGoogle / destino', () => {
  beforeEach(() => sessionStorage.clear());

  it('apunta al /auth/callback del mismo origen', () => {
    expect(urlCallbackGoogle()).toMatch(/\/auth\/callback$/);
    expect(urlCallbackGoogle()).toContain(window.location.origin);
  });

  it('el destino se guarda y se lee una sola vez', () => {
    guardarDestinoGoogle('/poroteos/abc');
    expect(leerDestinoGoogle()).toBe('/poroteos/abc');
    expect(leerDestinoGoogle()).toBeNull();
  });
});
