// Typed API client for the Sahayak Admin Console.
// All admin endpoints live under /v1/admin/.
// Token is a Firebase ID token set by src/lib/auth.ts after email/password sign-in.

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

// ── Auth helpers ───────────────────────────────────────────────────────────────

export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('admin_token');
}

export function saveAdminToken(token: string): void {
  localStorage.setItem('admin_token', token);
}

export interface AdminProfile {
  uid: string;
  email: string;
  displayName: string;
  roleLabel: string;
}

export function saveAdminProfile(profile: AdminProfile): void {
  localStorage.setItem('admin_profile', JSON.stringify(profile));
}

export function getAdminProfile(): AdminProfile | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('admin_profile');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminProfile;
  } catch {
    return null;
  }
}

export function clearAdminSession(): void {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_profile');
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
  get isNotFound() { return this.status === 404; }
}

function messageFromErrorBody(status: number, errBody: string): string {
  // Never surface raw Nest/stack payloads for server errors.
  if (status >= 500) return 'Something went wrong. Please try again.';
  if (!errBody) {
    if (status === 404) return 'Not found';
    if (status === 400) return 'Invalid request';
    return `Request failed (${status})`;
  }
  try {
    const parsed = JSON.parse(errBody) as { message?: string | string[] };
    if (typeof parsed.message === 'string' && parsed.message.trim()) return parsed.message;
    if (Array.isArray(parsed.message) && parsed.message.length) return parsed.message.join(', ');
  } catch {
    /* plain text body */
  }
  if (status === 404) return 'Not found';
  return errBody.length > 180 ? `${errBody.slice(0, 180)}…` : errBody;
}

function redirectToLogin(): void {
  if (typeof window === 'undefined') return;
  clearAdminSession();
  if (!window.location.pathname.startsWith('/login')) {
    window.location.assign('/login');
  }
}

// ── Request helper ─────────────────────────────────────────────────────────────

async function request<T>(method: 'GET' | 'POST' | 'PUT' | 'PATCH', path: string, body?: unknown): Promise<T> {
  const token = getAdminToken();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body != null ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  if (!res.ok) {
    if (res.status === 401) {
      redirectToLogin();
    }
    const errBody = await res.text().catch(() => '');
    throw new ApiError(res.status, messageFromErrorBody(res.status, errBody));
  }
  return res.json();
}

// ── Response shapes ────────────────────────────────────────────────────────────

export interface PlatformStats {
  beds: {
    totalBeds: number;
    occupiedBeds: number;
    availableBeds: number;
    platformOccupancyPercent: number;
    staleProviderCount: number;
    registeredHospitals: number;
  };
  cases: { totalCases: number; activeCases: number; activeCriticalCases: number };
  onboarding: { pendingApplications: number; approvedProviders: number };
  ambulances: { driversOnDuty: number; requestsSearching: number; requestsMatched: number };
  generatedAt: string;
}

export interface ProviderApplication {
  id: string;
  providerType: string;
  legalName: string;
  currentStage: string;
  orgId?: string | null;
  portalEmail?: string | null;
  isPortalLive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderApplicationDetail extends ProviderApplication {
  stages: Array<{
    id: string;
    stage: string;
    status: string;
    reviewerId?: string | null;
    notes?: string | null;
    completedAt?: string | null;
  }>;
  nextStage?: string | null;
  portalLive?: boolean;
  documents?: Array<{ key: string; name: string; contentType: string }>;
  checklist?: Array<{ key: string; label: string }>;
}

// ── Admin API ──────────────────────────────────────────────────────────────────

export interface ConsoleUserRow {
  id: string;
  email: string;
  role: string;
  status?: string;
  firebaseUid: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  requester: string;
  requesterType: string;
  entityRef: string | null;
  subject: string;
  priority: string;
  status: string;
  assignedAgent: string | null;
  body: string | null;
  internalNotes: string | null;
  accessJustification?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformIssue {
  id: string;
  issueNumber: string;
  title: string;
  category: string;
  status: string;
  severity: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeatureFlag {
  id: string;
  key: string;
  description: string;
  enabled: boolean;
  rolloutPercent: number;
  geography: string;
}

export interface ConfigGroup {
  groupKey: string;
  title: string;
  rows: Array<{ id: string; label: string; value: string }>;
}

export interface AuditRow {
  id: string;
  actor: string;
  /** Human-readable actor (email + console role) when resolvable, else falls back to `actor` (Firebase UID). */
  actorLabel?: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
}

export interface MonitoringSnapshot {
  healthCards: Array<{ name: string; value: string; note: string; variant: string }>;
  incidents: Array<{ text: string; status: string; variant: string }>;
  generatedAt: string;
}

export const adminApi = {
  platform: {
    stats(): Promise<{ data: PlatformStats }> {
      return request('GET', '/v1/admin/platform/stats');
    },
    onboardingQueue(): Promise<{ data: ProviderApplication[]; meta: { count: number } }> {
      return request('GET', '/v1/admin/platform/onboarding-queue');
    },
  },
  providers: {
    create(body: {
      providerType: string;
      legalName: string;
      orgId?: string;
      portalEmail?: string;
      portalPassword?: string;
      city?: string;
    }): Promise<{ data: ProviderApplication }> {
      return request('POST', '/v1/admin/provider-applications', body);
    },
    get(id: string): Promise<{ data: ProviderApplicationDetail }> {
      return request('GET', `/v1/admin/provider-applications/${id}`);
    },
    approveStage(
      id: string,
      stage: string,
      reviewerId: string,
      notes?: string,
      checklistComplete?: boolean,
    ): Promise<unknown> {
      return request('POST', `/v1/admin/provider-applications/${id}/stages/${stage}/approve`, {
        reviewerId,
        notes,
        checklistComplete,
      });
    },
    reject(id: string, notes?: string): Promise<{ data: ProviderApplication }> {
      return request('POST', `/v1/admin/provider-applications/${id}/reject`, { notes });
    },
    documentUrl(id: string, docKey: string): string {
      const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
      return `${base}/v1/admin/provider-applications/${encodeURIComponent(id)}/documents/${encodeURIComponent(docKey)}`;
    },
    search(q?: string): Promise<{ data: ProviderDirectoryRow[]; meta: { count: number } }> {
      const qs = q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : '';
      return request('GET', `/v1/admin/providers/search${qs}`);
    },
    getOrg(orgId: string): Promise<{ data: ProviderOrgDetail }> {
      return request('GET', `/v1/admin/providers/${encodeURIComponent(orgId)}`);
    },
    /** Hospital-admin ops via provider APIs (Role.ADMIN allowed). */
    hospitalDashboard(orgId: string): Promise<{ data: unknown }> {
      return request('GET', `/v1/providers/${encodeURIComponent(orgId)}/dashboard`);
    },
    hospitalBeds(orgId: string): Promise<{ data: Array<{
      category: string;
      totalCount: number;
      availableCount: number;
      occupiedCount: number;
      stalenessStatus: string;
    }> }> {
      return request('GET', `/v1/providers/${encodeURIComponent(orgId)}/beds`);
    },
    updateHospitalBeds(
      orgId: string,
      updates: Array<{ category: string; totalCount: number; availableCount: number }>,
    ): Promise<unknown> {
      return request('PUT', `/v1/providers/${encodeURIComponent(orgId)}/beds`, { updates });
    },
    hospitalIncomingQueue(orgId: string): Promise<{ data: unknown[] }> {
      return request('GET', `/v1/providers/${encodeURIComponent(orgId)}/incoming-queue`);
    },
  },
  users: {
    list(): Promise<{ data: ConsoleUserRow[]; meta: { count: number } }> {
      return request('GET', '/v1/admin/console-users');
    },
    create(email: string, role: string, password?: string): Promise<{ data: ConsoleUserRow }> {
      return request('POST', '/v1/admin/console-users', { email, role, password });
    },
    update(id: string, body: { role?: string; status?: string }): Promise<{ data: ConsoleUserRow }> {
      return request('PATCH', `/v1/admin/console-users/${id}`, body);
    },
    resyncClaims(id: string): Promise<{ data: { email: string; firebaseUid: string } }> {
      return request('POST', `/v1/admin/console-users/${id}/resync-claims`);
    },
    setPassword(id: string, password: string): Promise<{ data: { email: string; firebaseUid: string } }> {
      return request('POST', `/v1/admin/console-users/${id}/password`, { password });
    },
  },
  support: {
    listTickets(filters?: { requesterType?: string; q?: string }): Promise<{ data: SupportTicket[]; meta: { count: number } }> {
      const params = new URLSearchParams();
      if (filters?.requesterType) params.set('requesterType', filters.requesterType);
      if (filters?.q) params.set('q', filters.q);
      const qs = params.toString();
      return request('GET', `/v1/admin/support/tickets${qs ? `?${qs}` : ''}`);
    },
    getTicket(id: string): Promise<{ data: SupportTicket }> {
      return request('GET', `/v1/admin/support/tickets/${id}`);
    },
    createTicket(body: {
      requester: string;
      requesterType: 'CITIZEN' | 'PROVIDER';
      entityRef?: string;
      subject: string;
      priority?: string;
      body?: string;
    }): Promise<{ data: SupportTicket }> {
      return request('POST', '/v1/admin/support/tickets', body);
    },
    updateTicket(id: string, body: Partial<{ status: string; priority: string; assignedAgent: string; internalNotes: string }>): Promise<{ data: SupportTicket }> {
      return request('PATCH', `/v1/admin/support/tickets/${id}`, body);
    },
    caseAccess(
      id: string,
      justification: string,
    ): Promise<{
      data: {
        ticket: SupportTicket;
        case: { id: string; caseNumber: string; status: string; caseType: string } | null;
        timeline: Array<{ id: string; type: string; createdAt: string; payload?: unknown }>;
        note: string | null;
      };
    }> {
      return request('POST', `/v1/admin/support/tickets/${id}/case-access`, { justification });
    },
  },
  issues: {
    list(): Promise<{ data: PlatformIssue[]; meta: { count: number } }> {
      return request('GET', '/v1/admin/issues');
    },
    updateStatus(id: string, status: string): Promise<{ data: PlatformIssue }> {
      return request('PATCH', `/v1/admin/issues/${id}`, { status });
    },
  },
  monitoring: {
    snapshot(): Promise<{ data: MonitoringSnapshot }> {
      return request('GET', '/v1/admin/monitoring');
    },
  },
  governance: {
    flags(): Promise<{ data: FeatureFlag[] }> {
      return request('GET', '/v1/admin/feature-flags');
    },
    toggleFlag(key: string, enabled: boolean): Promise<{ data: FeatureFlag }> {
      return request('PATCH', `/v1/admin/feature-flags/${encodeURIComponent(key)}`, { enabled });
    },
    config(): Promise<{ data: ConfigGroup[] }> {
      return request('GET', '/v1/admin/config');
    },
    audit(q?: string): Promise<{ data: AuditRow[]; meta: { count: number } }> {
      const path = q ? `/v1/admin/audit?q=${encodeURIComponent(q)}` : '/v1/admin/audit';
      return request('GET', path);
    },
  },
  citizenOnboarding: {
    list(): Promise<{ data: CitizenOnboardingFlag[]; meta: { count: number } }> {
      return request('GET', '/v1/admin/citizen-onboarding/queue');
    },
    update(
      id: string,
      status: string,
      notes?: string,
      resolution?: string,
    ): Promise<{ data: CitizenOnboardingFlag }> {
      return request('PATCH', `/v1/admin/citizen-onboarding/queue/${id}`, {
        status,
        notes,
        resolution,
      });
    },
  },
  sla: {
    snapshot(): Promise<{ data: SlaSnapshot }> {
      return request('GET', '/v1/admin/sla/snapshot');
    },
  },
  analytics: {
    summary(): Promise<{ data: AnalyticsSummary }> {
      return request('GET', '/v1/admin/analytics/summary');
    },
  },
  knowledgeBase: {
    list(): Promise<{ data: KnowledgeArticle[]; meta: { count: number; categories: string[] } }> {
      return request('GET', '/v1/admin/knowledge-base/articles');
    },
    create(body: { title: string; category: string; body?: string; note?: string }): Promise<{ data: KnowledgeArticle }> {
      return request('POST', '/v1/admin/knowledge-base/articles', body);
    },
  },
  workflows: {
    list(): Promise<{ data: WorkflowDef[]; meta: { count: number } }> {
      return request('GET', '/v1/admin/workflows');
    },
  },
  communications: {
    list(): Promise<{ data: Broadcast[]; meta: { count: number } }> {
      return request('GET', '/v1/admin/communications/broadcasts');
    },
    create(body: {
      title: string;
      body: string;
      audience: string;
      channels: string[];
      status?: string;
    }): Promise<{ data: Broadcast }> {
      return request('POST', '/v1/admin/communications/broadcasts', body);
    },
  },
  ai: {
    opsAssistant(): Promise<{ data: AiOpsAssistant }> {
      return request('GET', '/v1/admin/ai/ops-assistant');
    },
    approveSuggestion(id: string): Promise<{ data: AiOpsSuggestion }> {
      return request('POST', `/v1/admin/ai/suggestions/${id}/approve`);
    },
    dismissSuggestion(id: string): Promise<{ data: AiOpsSuggestion }> {
      return request('POST', `/v1/admin/ai/suggestions/${id}/dismiss`);
    },
  },
};

export interface ProviderDirectoryRow {
  id: string;
  hospitalId: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  providerType: string;
  isActive: boolean;
}

export interface ProviderOrgDetail {
  registry: ProviderDirectoryRow;
  application: ProviderApplication | null;
  beds: Array<{
    category: string;
    totalCount: number;
    availableCount: number;
    occupiedCount: number;
    stalenessStatus: string;
  }>;
}

export interface CitizenOnboardingFlag {
  id: string;
  accountRef: string;
  displayName: string;
  issue: string;
  issueLabel: string;
  status: string;
  resolution?: string | null;
  notes: string | null;
  flaggedAt: string;
}

export interface SlaRow {
  key?: string;
  name?: string;
  definition?: string;
  target?: string;
  currentP95?: string;
  category?: string;
  volume?: number;
  volumeLabel?: string;
  compliancePercent?: number | null;
  status: string;
  variant: 'success' | 'warning' | 'danger' | 'neutral';
}

export interface SlaSnapshot {
  definitions: SlaRow[];
  compliance30d: SlaRow[];
  generatedAt: string;
}

export interface AnalyticsSummary {
  rollup: {
    casesResolved30d: number;
    goldenHourCompliancePercent: number | null;
    providerNetworkGrowth30d: number;
    bloodDonorRegistryGrowth30d: number | null;
    searchingAmbulancesNow: number;
  };
  breakdown: SlaRow[];
  generatedAt: string;
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  category: string;
  body: string;
  note: string | null;
  updatedAt: string;
}

export interface WorkflowDef {
  id: string;
  name: string;
  stageCount: number;
  usage: string;
  active: boolean;
  immutable: boolean;
  stages: Array<{ num: number; name: string; gate: string; key?: string }>;
}

export interface Broadcast {
  id: string;
  title: string;
  body: string;
  audience: string;
  channels: string[];
  status: string;
  createdAt: string;
}

export interface AiOpsSuggestion {
  id: string;
  action: string;
  confidence: number;
  source: string;
  status: string;
}

export interface AiOpsAssistant {
  anomalies: Array<{ id: string; text: string; variant: string; createdAt: string }>;
  status: Array<{ label: string; value: string; variant: string }>;
  suggestions: AiOpsSuggestion[];
}

/** Human-readable labels for OnboardingStage enum values. */
export const STAGE_LABEL: Record<string, string> = {
  APPLICATION_INTAKE: 'Application received',
  CREDENTIAL_VERIFICATION: 'Verifying',
  INTEGRATION_TEST: 'Integration testing',
  GO_LIVE_APPROVAL: 'Go-live approval',
  PORTAL_ACCESS_ACTIVATED: 'Access activated',
};

export const ROLE_LABEL: Record<string, string> = {
  SUPPORT_AGENT: 'Support Agent',
  CUSTOMER_SUCCESS_MANAGER: 'Customer Success Manager',
  PROVIDER_ONBOARDING_SPECIALIST: 'Provider Onboarding Specialist',
  TRUST_SAFETY_ANALYST: 'Trust & Safety Analyst',
  COMPLIANCE_OFFICER: 'Compliance Officer',
  PLATFORM_OPERATIONS_ENGINEER: 'Platform Operations Engineer',
  CONSOLE_ADMINISTRATOR: 'Console Administrator',
};
