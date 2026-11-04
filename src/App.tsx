import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { router } from './router';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      // No reintentar errores del cliente (400/404): solo fallas de red o 5xx.
      retry: (failureCount, error) =>
        failureCount < 2 &&
        !(error instanceof ApiError && error.status >= 400 && error.status < 500),
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
