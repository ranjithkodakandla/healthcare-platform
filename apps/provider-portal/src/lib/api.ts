// Typed API client for the Sahayak Provider Portal.
// All provider endpoints live under /v1/providers/:hospitalId/.
// Auth token is sent as Bearer in the Authorization header.
// hospitalId and token are read from localStorage (set by the login flow).
// Token is a Firebase ID token set by src/lib/auth.ts after email/password sign-in.

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

// ── Auth helpers ───────────────────────────────────────────────────────────────

export function getSession(): { hospitalId: string; token: string } | null {
  if (typeof window === 'undefined') return null;
  const hospitalId = localStorage.getItem('provider_hospital_id');
  const token = localStorage.getItem('provider_token');
  if (!hospitalId || !token) return null;
  return { hospitalId, token };
}

export function saveSession(hospitalId: string, token: string): void {
  localStorage.setItem('provider_hospital_id', hospitalId);
  localStorage.setItem('provider_token', token);
}

export function clearSession(): void {
  localStorage.removeItem('provider_hospital_id');
  localStorage.removeItem('provider_token');
}

// ── Request helpers ────────────────────────────────────────────────────────────

async function request<T>(
  method: 'GET' | 'PUT' | 'POST' | 'PATCH',
  path: string,
  body?: unknown,
  token?: string,
): Promise<T> {
  const session = getSession();
  const authToken = token ?? session?.token;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: body != null ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new ApiError(res.status, `${method} ${path}: ${res.status} ${errBody}`);
  }
  return res.json();
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
  get isUnauthorized() { return this.status === 401; }
  get isForbidden() { return this.status === 403; }
}

// ── Response shapes ────────────────────────────────────────────────────────────

export interface BedInventoryRow {
  id: string;
  hospitalId: string;
  category: string;
  totalCount: number;
  availableCount: number;
  occupiedCount: number;
  stalenessStatus: 'FRESH' | 'STALE';
  lastUpdatedAt: string;
  lastUpdatedBy: string | null;
}

export interface IncomingQueueItem {
  holdId: string;
  caseId: string | null;
  caseNumber?: string | null;
  caseSeverity?: string | null;
  category: string;
  requiresSecondaryAck: boolean;
  /** Backend field name is `status` — normalised to holdStatus in the client */
  holdStatus: string;
  ttlExpiresAt: string;
  heldAt?: string;
}

export interface DashboardData {
  hospitalId: string;
  bedOccupancy: { total: number; occupied: number; available: number; occupancyPercent: number };
  stalenessStatus: 'FRESH' | 'STALE';
  pendingActionsCount: number;
  pendingClinicalAckCount: number;
  activeLinkedCasesCount: number;
}

export interface BedUpdateRow {
  category: string;
  availableCount?: number;
  occupiedCount?: number;
  totalCount?: number;
  overrideReason?: string;
}

// ── Provider API ───────────────────────────────────────────────────────────────

export interface FleetVehicle {
  id: string;
  vehicleReg: string;
  driverName: string;
  vehicleType: string;
  fleetStatus: 'AVAILABLE' | 'EN_ROUTE' | 'MAINTENANCE' | 'OFF_DUTY' | string;
  isOnDuty: boolean;
  lastLat: number | null;
  lastLng: number | null;
  lastPingAt: string | null;
}

export interface PharmacyStockRow {
  id: string;
  medicineName: string;
  category: string;
  stockCount: number;
  flag: 'OK' | 'Low' | 'Critical';
  lastUpdatedAt?: string;
}

export interface BloodAlertRow {
  id: string;
  bloodGroup: string;
  units: number;
  urgency: string;
  reason: string;
  caseId: string | null;
}

export const providerApi = {
  dashboard: {
    get(hospitalId: string): Promise<{ data: DashboardData }> {
      return request('GET', `/v1/providers/${hospitalId}/dashboard`);
    },
  },

  beds: {
    get(hospitalId: string): Promise<{ data: BedInventoryRow[]; meta: { hospitalId: string } }> {
      return request('GET', `/v1/providers/${hospitalId}/beds`);
    },
    update(hospitalId: string, updates: BedUpdateRow[], overrideReason?: string): Promise<{ data: BedInventoryRow[]; meta: Record<string, unknown> }> {
      return request('PUT', `/v1/providers/${hospitalId}/beds`, { updates, overrideReason });
    },
  },

  fleet: {
    list(providerId: string): Promise<{ data: FleetVehicle[]; meta: { count: number } }> {
      return request('GET', `/v1/providers/${providerId}/fleet`);
    },
    updateStatus(providerId: string, driverId: string, fleetStatus: string): Promise<{ data: unknown }> {
      return request('PATCH', `/v1/providers/${providerId}/fleet/${driverId}`, { fleetStatus });
    },
  },

  pharmacy: {
    stock(providerId: string, q?: string): Promise<{ data: PharmacyStockRow[] }> {
      const path = q
        ? `/v1/providers/${providerId}/pharmacy/stock?q=${encodeURIComponent(q)}`
        : `/v1/providers/${providerId}/pharmacy/stock`;
      return request('GET', path);
    },
    updateStock(
      providerId: string,
      updates: Array<{ medicineName: string; stockCount: number }>,
    ): Promise<{ data: PharmacyStockRow[] }> {
      return request('PUT', `/v1/providers/${providerId}/pharmacy/stock`, { updates });
    },
  },

  blood: {
    preAlerts(providerId: string): Promise<{
      data: { aiPreAlerts: BloodAlertRow[]; explicitRequests: BloodAlertRow[] };
    }> {
      return request('GET', `/v1/providers/${providerId}/blood/pre-alerts`);
    },
    acknowledge(providerId: string, alertId: string): Promise<{ data: unknown }> {
      return request('POST', `/v1/providers/${providerId}/blood/pre-alerts/${alertId}/acknowledge`);
    },
  },

  queue: {
    async getIncoming(hospitalId: string): Promise<{ data: IncomingQueueItem[]; meta: { hospitalId: string; count: number } }> {
      // Backend QueueEntry uses status/expiresAt/heldAt — normalise for UI
      type Raw = {
        holdId: string;
        caseId: string | null;
        caseNumber?: string | null;
        caseSeverity?: string | null;
        category: string;
        requiresSecondaryAck: boolean;
        status: string;
        expiresAt: string;
        heldAt: string;
      };
      const res = await request<{ data: Raw[]; meta: { hospitalId: string; count: number } }>(
        'GET',
        `/v1/providers/${hospitalId}/incoming-queue`,
      );
      return {
        data: res.data.map((r) => ({
          holdId: r.holdId,
          caseId: r.caseId,
          caseNumber: r.caseNumber,
          caseSeverity: r.caseSeverity,
          category: r.category,
          requiresSecondaryAck: r.requiresSecondaryAck,
          holdStatus: r.status,
          ttlExpiresAt: r.expiresAt,
          heldAt: r.heldAt,
        })),
        meta: res.meta,
      };
    },
    confirmHold(hospitalId: string, holdId: string): Promise<{ data: { holdId: string; status: string } }> {
      return request('POST', `/v1/providers/${hospitalId}/holds/${holdId}/confirm`);
    },
    declineHold(hospitalId: string, holdId: string, reason: string): Promise<{ data: { holdId: string; status: string } }> {
      return request('POST', `/v1/providers/${hospitalId}/holds/${holdId}/decline`, { reason });
    },
    clinicalAck(hospitalId: string, holdId: string, actorRole: string): Promise<{ data: { holdId: string; status: string; clinicalAckLogged: boolean } }> {
      return request('POST', `/v1/providers/${hospitalId}/holds/${holdId}/clinical-ack`, { actorRole });
    },
  },
};
