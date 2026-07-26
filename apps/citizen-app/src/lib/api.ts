// Typed API client for the Sahayak backend.
// All citizen-facing endpoints are under /v1/citizen/.
// Base URL is configured via NEXT_PUBLIC_API_URL (default: localhost:3000).
// Authenticated calls attach Firebase ID token from localStorage (citizen_token).

import { getCitizenToken } from './token';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

function authHeaders(): Record<string, string> {
  const token = getCitizenToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export type BedCategory = 'GENERAL' | 'ICU' | 'VENTILATOR' | 'NICU' | 'ISOLATION' | 'MATERNITY';
export type CaseSeverity = 'CRITICAL' | 'URGENT' | 'MODERATE' | 'ROUTINE';

// ── Response shapes ───────────────────────────────────────────────────────────

export interface BedSearchResult {
  hospitalId: string;
  hospitalName: string | null;
  city: string | null;
  address: string | null;
  category: BedCategory;
  availableCount: number;
  occupiedCount: number;
  totalCount: number;
  occupancyPercent: number;
  stalenessStatus: 'FRESH' | 'STALE';
  lastUpdatedAt: string;
  distanceKm: number | null;
}

export interface ApiCase {
  id: string;
  caseNumber: string;
  status: string;
  caseType: string;
  severity?: string;
  location?: Record<string, unknown>;
  initiatorId: string;
  createdAt: string;
}

export interface CaseTimelineEvent {
  id: string;
  caseId: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface AmbulanceRequest {
  id: string;
  caseId: string;
  status: string;
  severity: string;
  pickupLat: number | null;
  pickupLng: number | null;
  driver: {
    id: string;
    driverUid: string;
    vehicleReg: string;
    vehicleType: string;
  } | null;
  createdAt: string;
}

export interface NearbyHospital {
  hospitalId: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  lat: number;
  lng: number;
  distanceKm: number | null;
  availableCount: number;
  occupiedCount: number;
  totalCount: number;
  occupancyPercent: number;
  categories: string[];
  specialtyLabel: string;
}

export interface HospitalProfile extends Omit<NearbyHospital, 'categories'> {
  services: string[];
  beds: BedSearchResult[];
}

// ── API helpers ───────────────────────────────────────────────────────────────

async function get<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) url.searchParams.set(k, String(v));
    });
  }
  const res = await fetch(url.toString(), {
    cache: 'no-store',
    headers: { ...authHeaders() },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${path}: ${res.status} ${body}`);
  }
  return res.json();
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`API POST ${path}: ${res.status} ${errBody}`);
  }
  return res.json();
}

async function del<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
    cache: 'no-store',
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`API DELETE ${path}: ${res.status} ${errBody}`);
  }
  return res.json();
}

export const privacyApi = {
  notices(): Promise<{
    data: {
      privacyPolicyVersion: string;
      termsVersion: string;
      summary: string;
      emergencyNote: string;
      contact: string;
    };
  }> {
    return get('/v1/privacy/notices');
  },
  me(): Promise<{ data: Record<string, unknown> }> {
    return get('/v1/privacy/me');
  },
  export(): Promise<{ data: Record<string, unknown> }> {
    return get('/v1/privacy/export');
  },
  consents(): Promise<{ data: Array<Record<string, unknown>> }> {
    return get('/v1/privacy/consents');
  },
  accept(body: {
    privacyPolicy?: boolean;
    terms?: boolean;
    emergencyProcessing?: boolean;
  }): Promise<{ data: Record<string, unknown> }> {
    return post('/v1/privacy/consents/accept', body);
  },
  revoke(id: string): Promise<{ data: Record<string, unknown> }> {
    return del(`/v1/privacy/consents/${encodeURIComponent(id)}`);
  },
  erasure(confirm: boolean, reason?: string): Promise<{ data: Record<string, unknown> }> {
    return post('/v1/privacy/erasure', { confirm, reason });
  },
};

// ── Citizen endpoints ─────────────────────────────────────────────────────────

export const citizenApi = {
  // FR-BED-002: bed search with optional geo-sort (TD-003 now live)
  beds: {
    search(params: {
      lat?: number;
      lng?: number;
      radiusKm?: number;
      category?: BedCategory;
      freshOnly?: boolean;
    }): Promise<{ data: BedSearchResult[]; meta: Record<string, unknown> }> {
      return get('/v1/citizen/beds/search', params as Record<string, string | number | boolean | undefined>);
    },
    hospitalSummary(hospitalId: string): Promise<{ data: BedSearchResult[] }> {
      return get(`/v1/citizen/beds/hospitals/${hospitalId}`);
    },
  },

  // C-18 / C-19 — Nearby hospitals directory + profile (HospitalRegistry)
  hospitals: {
    nearby(params?: {
      lat?: number;
      lng?: number;
      radiusKm?: number;
    }): Promise<{ data: NearbyHospital[]; meta: { count: number; geoSort: boolean } }> {
      return get('/v1/citizen/hospitals/nearby', params as Record<string, string | number | boolean | undefined>);
    },
    profile(
      hospitalId: string,
      params?: { lat?: number; lng?: number },
    ): Promise<{ data: HospitalProfile }> {
      return get(
        `/v1/citizen/hospitals/${encodeURIComponent(hospitalId)}`,
        params as Record<string, string | number | boolean | undefined>,
      );
    },
  },

  // GT-10/BR-06: guest emergency case creation (no auth)
  cases: {
    createGuest(payload: {
      deviceId: string;
      location: { lat?: number; lng?: number; address?: string; patientIsChild?: boolean };
      triage: { isConscious: boolean; isBreathing: boolean; hasVisibleBleeding: boolean };
    }): Promise<{ data: ApiCase; meta: { guestFlow: boolean; severity: CaseSeverity } }> {
      return post('/v1/citizen/cases/guest', payload);
    },
    getTimeline(caseId: string): Promise<{ data: CaseTimelineEvent[]; meta: { count: number } }> {
      return get(`/v1/citizen/cases/${caseId}/timeline`);
    },
  },

  // FR-AMB-001–003: ambulance search + request lifecycle
  ambulances: {
    search(params: { lat: number; lng: number; radiusKm?: number }): Promise<{ data: unknown[] }> {
      return get('/v1/citizen/ambulances/search', params as Record<string, number | undefined>);
    },
    getRequestByCaseId(caseId: string): Promise<{ data: AmbulanceRequest }> {
      return get(`/v1/citizen/ambulances/by-case/${caseId}`);
    },
    createRequest(payload: {
      caseId: string;
      pickupLat: number;
      pickupLng: number;
      severity?: CaseSeverity;
    }): Promise<{ data: AmbulanceRequest }> {
      return post('/v1/citizen/ambulances/requests', payload);
    },
  },

  // Modules 3–9 directory search
  doctors: {
    search(params: { specialty?: string; q?: string; lat?: number; lng?: number }): Promise<{ data: DoctorResult[] }> {
      return get('/v1/citizen/doctors/search', params as Record<string, string | number | undefined>);
    },
  },
  pharmacies: {
    search(params: { medicine?: string; lat?: number; lng?: number }): Promise<{ data: PharmacyResult[] }> {
      return get('/v1/citizen/pharmacies/search', params as Record<string, string | number | undefined>);
    },
  },
  bloodBanks: {
    search(params: { bloodGroup?: string; lat?: number; lng?: number }): Promise<{ data: BloodBankResult[] }> {
      return get('/v1/citizen/blood-banks/search', params as Record<string, string | number | undefined>);
    },
  },
  diagnostics: {
    search(params: { q?: string; lat?: number; lng?: number }): Promise<{ data: DiagnosticResult[] }> {
      return get('/v1/citizen/diagnostics/search', params as Record<string, string | number | undefined>);
    },
  },
  cancerCenters: {
    search(params: { modality?: string; lat?: number; lng?: number }): Promise<{ data: CancerCenterResult[] }> {
      return get('/v1/citizen/cancer-centers/search', params as Record<string, string | number | undefined>);
    },
  },
  insurance: {
    getPreAuth(caseId?: string): Promise<{ data: InsurancePreAuth | null }> {
      return get('/v1/citizen/insurance/pre-auth', caseId ? { caseId } : undefined);
    },
  },
};

export interface DoctorResult {
  id: string;
  name: string;
  specialty: string;
  hospitalName: string | null;
  nextSlotAt: string | null;
  isTeleconsult: boolean;
  city: string | null;
  distanceKm: number | null;
}

export interface PharmacyResult {
  pharmacyId: string;
  name: string;
  address: string | null;
  distanceKm: number | null;
  medicineName: string;
  stockCount: number;
  status: string;
  variant: 'available' | 'low' | 'full';
}

export interface BloodBankResult {
  bloodBankId: string;
  name: string;
  bloodGroup: string;
  unitsAvailable: number;
  distanceKm: number | null;
  status: string;
  variant: 'available' | 'full';
}

export interface DiagnosticResult {
  id: string;
  centerName: string;
  testName: string;
  priceInr: number;
  nextSlotAt: string | null;
  distanceKm: number | null;
}

export interface CancerCenterResult {
  id: string;
  name: string;
  modalities: string[];
  city: string | null;
  distanceKm: number | null;
}

export interface InsurancePreAuth {
  id: string;
  insurerName: string;
  policyLast4: string | null;
  hospitalName: string | null;
  status: string;
  rejectionReason: string | null;
}

// ── Geo helpers (browser-side) ────────────────────────────────────────────────

export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000,
    });
  });
}

// Generates a stable device ID stored in localStorage (GT-10/BR-06).
export function getOrCreateDeviceId(): string {
  const key = 'sahayak_device_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = `dev-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem(key, id);
  }
  return id;
}
