/* eslint-disable react-refresh/only-export-components -- archivo de rutas, no de componentes */
import { lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { RouteError } from '@/pages/RouteError';

// Cada página se carga bajo demanda (code splitting).
const HomePage = lazy(() => import('@/pages/HomePage'));
const DiputadosPage = lazy(() => import('@/pages/DiputadosPage'));
const DiputadoPage = lazy(() => import('@/pages/DiputadoPage'));
const VotacionesPage = lazy(() => import('@/pages/VotacionesPage'));
const VotacionPage = lazy(() => import('@/pages/VotacionPage'));
const PoroteosPage = lazy(() => import('@/pages/PoroteosPage'));
const NuevoPoroteoPage = lazy(() => import('@/pages/NuevoPoroteoPage'));
const PoroteoPage = lazy(() => import('@/pages/PoroteoPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'diputados', element: <DiputadosPage /> },
      { path: 'diputados/:id', element: <DiputadoPage /> },
      { path: 'votaciones', element: <VotacionesPage /> },
      { path: 'votaciones/:id', element: <VotacionPage /> },
      { path: 'poroteos', element: <PoroteosPage /> },
      { path: 'poroteos/nuevo', element: <NuevoPoroteoPage /> },
      { path: 'poroteos/:id', element: <PoroteoPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
