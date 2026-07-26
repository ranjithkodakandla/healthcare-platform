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

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
  get isUnauthorized() { return this.status === 401; }
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
    const errBody = await res.text().catch(() => '');
    throw new ApiError(res.status, `${method} ${path}: ${res.status} ${errBody}`);
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
  isPortalLive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Admin API ──────────────────────────────────────────────────────────────────

export interface ConsoleUserRow {
  id: string;
  email: string;
  role: string;
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
    approveStage(id: string, stage: string, reviewerId: string, notes?: string): Promise<unknown> {
      return request('POST', `/v1/admin/provider-applications/${id}/stages/${stage}/approve`, { reviewerId, notes });
    },
  },
  users: {
    list(): Promise<{ data: ConsoleUserRow[]; meta: { count: number } }> {
      return request('GET', '/v1/admin/console-users');
    },
    create(email: string, role: string): Promise<{ data: ConsoleUserRow }> {
      return request('POST', '/v1/admin/console-users', { email, role });
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
    update(id: string, status: string, notes?: string): Promise<{ data: CitizenOnboardingFlag }> {
      return request('PATCH', `/v1/admin/citizen-onboarding/queue/${id}`, { status, notes });
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

export interface CitizenOnboardingFlag {
  id: string;
  accountRef: string;
  displayName: string;
  issue: string;
  issueLabel: string;
  status: string;
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
  compliancePercent?: number;
  status: string;
  variant: 'success' | 'warning' | 'danger';
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
