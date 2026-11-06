import { request } from './client';
import type { CuentaAdmin, Paginated, Poroteo, PoroteoDetalle, ResumenAdmin } from '@/types';

export const adminApi = {
  resumen: (signal?: AbortSignal) => request<{ data: ResumenAdmin }>('/admin/resumen', { signal }),
  cuentas: (page: number, signal?: AbortSignal) =>
    request<Paginated<CuentaAdmin>>('/admin/cuentas', { query: { page, pageSize: 20 }, signal }),
  poroteos: (params: { q?: string; page: number }, signal?: AbortSignal) =>
    request<Paginated<Poroteo>>('/admin/poroteos', { query: { ...params, pageSize: 20 }, signal }),
  poroteo: (id: string, signal?: AbortSignal) =>
    request<{ data: PoroteoDetalle }>(`/admin/poroteos/${encodeURIComponent(id)}`, { signal }),
};
