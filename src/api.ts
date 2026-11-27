import { config } from './config.js';

// Thin client for the skystats public API. The bot uses the same /v1 API as everyone else.
// TODO: replace with the generated client from the api-spec repo.

export interface BazaarProduct {
  id: string;
  name: string;
  buyPrice: number;
  sellPrice: number;
  margin: number;
  buyVolume: number;
  sellVolume: number;
  buyMovingWeek: number;
  sellMovingWeek: number;
  buyOrders: number;
  sellOrders: number;
  updatedAt: string;
}

export interface BazaarSnapshot {
  takenAt: string;
  buyPrice: number;
  sellPrice: number;
}

export interface HypixelStatus {
  indicator: 'none' | 'minor' | 'major' | 'critical' | 'unknown' | string;
  description: string;
  components: { name: string; status: string }[];
  incidents: { name: string; status: string; impact: string | null; url: string | null }[];
  checkedAt: string | null;
}

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

const base = config.SKYSTATS_API_URL.replace(/\/$/, '');

async function get<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(5000) });
  } catch {
    throw new ApiError(0, 'SkyStats API unreachable');
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new ApiError(res.status, body.message ?? `API returned ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => get<{ ok: boolean }>('/healthz'),
  bazaarList: (q?: string) =>
    get<{ products: BazaarProduct[] }>(`/v1/bazaar${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  bazaarProduct: (id: string) => get<BazaarProduct>(`/v1/bazaar/${encodeURIComponent(id)}`),
  bazaarHistory: (id: string, days: number) =>
    get<{ snapshots: BazaarSnapshot[] }>(`/v1/bazaar/${encodeURIComponent(id)}/history?days=${days}`),
  status: () => get<HypixelStatus>('/v1/status'),
};
