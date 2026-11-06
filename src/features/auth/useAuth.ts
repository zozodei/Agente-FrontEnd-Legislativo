import { useContext } from 'react';
import { AuthContext, type AuthValue } from './context';

/** Sesión actual. Tiene que usarse dentro de <AuthProvider/>. */
export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth() necesita estar dentro de <AuthProvider/>');
  return value;
}
