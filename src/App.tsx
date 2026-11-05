import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { router } from './router';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      // Reintentar solo fallas pasajeras (red, 502). Los 4xx y el 503 (falta una
      // migración) no se arreglan reintentando: mejor mostrar el error enseguida.
      retry: (failureCount, error) =>
        failureCount < 2 &&
        !(
          error instanceof ApiError &&
          ((error.status >= 400 && error.status < 500) || error.status === 503)
        ),
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
