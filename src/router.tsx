/* eslint-disable react-refresh/only-export-components -- archivo de rutas, no de componentes */
import { lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { CuentaMenu } from '@/features/auth/components/CuentaMenu';
import { RutaProtegida } from '@/features/auth/RutaProtegida';
import { RouteError } from '@/pages/RouteError';

// Cada página se carga bajo demanda (code splitting).
const LandingPage = lazy(() => import('@/pages/LandingPage'));
const CamaraPage = lazy(() => import('@/pages/CamaraPage'));
const DiputadosPage = lazy(() => import('@/pages/DiputadosPage'));
const DiputadoPage = lazy(() => import('@/pages/DiputadoPage'));
const VotacionesPage = lazy(() => import('@/pages/VotacionesPage'));
const VotacionPage = lazy(() => import('@/pages/VotacionPage'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const RegistroPage = lazy(() => import('@/pages/RegistroPage'));
const AuthCallbackPage = lazy(() => import('@/pages/AuthCallbackPage'));
const PoroteosPage = lazy(() => import('@/pages/PoroteosPage'));
const NuevoPoroteoPage = lazy(() => import('@/pages/NuevoPoroteoPage'));
const PoroteoPage = lazy(() => import('@/pages/PoroteoPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

/** `handle.bleed`: la página ocupa todo el ancho (sin el contenedor centrado del layout). */
export interface RouteHandle {
  bleed?: boolean;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout cuenta={(cerrar) => <CuentaMenu onNavigate={cerrar} />} />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <LandingPage />, handle: { bleed: true } satisfies RouteHandle },
      { path: 'camara', element: <CamaraPage /> },
      { path: 'diputados', element: <DiputadosPage /> },
      { path: 'diputados/:id', element: <DiputadoPage /> },
      { path: 'votaciones', element: <VotacionesPage /> },
      { path: 'votaciones/:id', element: <VotacionPage /> },
      { path: 'login', element: <LoginPage />, handle: { bleed: true } satisfies RouteHandle },
      {
        path: 'auth/callback',
        element: <AuthCallbackPage />,
        handle: { bleed: true } satisfies RouteHandle,
      },
      {
        path: 'registro',
        element: <RegistroPage />,
        handle: { bleed: true } satisfies RouteHandle,
      },
      {
        // Los poroteos son personales: todo lo de acá exige sesión.
        element: <RutaProtegida />,
        children: [
          { path: 'poroteos', element: <PoroteosPage /> },
          { path: 'poroteos/nuevo', element: <NuevoPoroteoPage /> },
          { path: 'poroteos/:id', element: <PoroteoPage /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
