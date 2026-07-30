import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HealthService } from '../health/health.service';
import { AuditService } from '../shared-services/audit/audit.service';

const CITIZEN_RESOLUTIONS = ['CLEARED', 'MERGED', 'DISMISSED'] as const;

export interface CreateTicketInput {
  requester: string;
  requesterType: 'CITIZEN' | 'PROVIDER';
  entityRef?: string;
  subject: string;
  priority?: string;
  body?: string;
  actor: string;
}

export interface UpdateTicketInput {
  status?: string;
  priority?: string;
  assignedAgent?: string;
  internalNotes?: string;
  actor: string;
}

@Injectable()
export class AdminOpsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly health: HealthService,
    private readonly audit: AuditService,
  ) {}

  // ── A-06 / A-07 / A-19 Support Tickets ─────────────────────────────────────

  async listTickets(filters?: { requesterType?: string; q?: string }) {
    return this.prisma.supportTicket.findMany({
      where: {
        ...(filters?.requesterType ? { requesterType: filters.requesterType } : {}),
        ...(filters?.q
          ? {
              OR: [
                { subject: { contains: filters.q, mode: 'insensitive' } },
                { requester: { contains: filters.q, mode: 'insensitive' } },
                { entityRef: { contains: filters.q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
      take: 100,
    });
  }

  async getTicket(id: string) {
    const key = id?.trim();
    if (!key) throw new NotFoundException('SupportTicket not found');

    // Prisma UUID columns throw on non-UUID equality — only OR on id when valid.
    const looksLikeUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key);
    const ticket = await this.prisma.supportTicket.findFirst({
      where: looksLikeUuid ? { OR: [{ id: key }, { ticketNumber: key }] } : { ticketNumber: key },
    });
    if (!ticket) throw new NotFoundException(`SupportTicket ${key} not found`);
    return ticket;
  }

  async createTicket(input: CreateTicketInput) {
    const seq = await this.prisma.supportTicket.count();
    const ticketNumber = `TCK-${3400 + seq}`;
    const ticket = await this.prisma.supportTicket.create({
      data: {
        ticketNumber,
        requester: input.requester,
        requesterType: input.requesterType,
        entityRef: input.entityRef,
        subject: input.subject,
        priority: input.priority ?? 'MED',
        body: input.body,
        status: 'OPEN',
      },
    });
    await this.audit.record({
      actor: input.actor,
      action: 'SUPPORT_TICKET_CREATED',
      entityType: 'SupportTicket',
      entityId: ticket.id,
      metadata: { ticketNumber, subject: input.subject },
    });
    return ticket;
  }

  async updateTicket(id: string, input: UpdateTicketInput) {
    const existing = await this.getTicket(id);
    const isClosed = existing.status === 'RESOLVED' || existing.status === 'CLOSED';
    // A resolved/closed ticket is a terminal record — the only allowed mutation
    // once closed is an explicit reopen (status change away from RESOLVED/CLOSED).
    // Adding notes or re-resolving an already-closed ticket silently would let a
    // ticket be "commented on" or "re-resolved" forever with no visible reopen step.
    const isReopen = input.status != null && input.status !== 'RESOLVED' && input.status !== 'CLOSED';
    if (isClosed && !isReopen) {
      throw new BadRequestException(
        `Ticket ${existing.ticketNumber} is ${existing.status.toLowerCase()} — reopen it (change status) before adding notes or resolving again`,
      );
    }
    // internalNotes is an append-only note log, not a full-text replacement — each
    // call adds one timestamped, attributed entry rather than overwriting history.
    let internalNotes = existing.internalNotes ?? undefined;
    if (input.internalNotes != null && input.internalNotes.trim()) {
      const entry = `[${new Date().toISOString()}] ${input.actor}: ${input.internalNotes.trim()}`;
      internalNotes = existing.internalNotes ? `${existing.internalNotes}\n${entry}` : entry;
    }
    const ticket = await this.prisma.supportTicket.update({
      where: { id: existing.id },
      data: {
        ...(input.status != null ? { status: input.status } : {}),
        ...(input.priority != null ? { priority: input.priority } : {}),
        ...(input.assignedAgent != null ? { assignedAgent: input.assignedAgent } : {}),
        ...(internalNotes !== (existing.internalNotes ?? undefined) ? { internalNotes } : {}),
      },
    });
    await this.audit.record({
      actor: input.actor,
      action: 'SUPPORT_TICKET_UPDATED',
      entityType: 'SupportTicket',
      entityId: ticket.id,
      metadata: { status: ticket.status, priority: ticket.priority },
    });
    return ticket;
  }

  // ── A-09 Issue Board ───────────────────────────────────────────────────────

  async listIssues() {
    return this.prisma.platformIssue.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async updateIssueStatus(id: string, status: string, actor: string) {
    const existing = await this.prisma.platformIssue.findFirst({
      where: { OR: [{ id }, { issueNumber: id }] },
    });
    if (!existing) throw new NotFoundException(`PlatformIssue ${id} not found`);
    const issue = await this.prisma.platformIssue.update({
      where: { id: existing.id },
      data: { status },
    });
    await this.audit.record({
      actor,
      action: 'PLATFORM_ISSUE_STATUS_CHANGED',
      entityType: 'PlatformIssue',
      entityId: issue.id,
      metadata: { from: existing.status, to: status },
    });
    return issue;
  }

  // ── A-14 Monitoring ────────────────────────────────────────────────────────

  async getMonitoringSnapshot() {
    const [health, searching, staleBeds, openHighIssues, openHighTickets] = await Promise.all([
      this.health.check(),
      this.prisma.ambulanceRequest.count({ where: { status: 'SEARCHING' } }),
      this.prisma.hospitalBedInventory.count({ where: { stalenessStatus: 'STALE' } }),
      this.prisma.platformIssue.findMany({
        where: { status: { in: ['OPEN', 'IN_PROGRESS', 'BLOCKED'] }, severity: 'HIGH' },
        take: 10,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.supportTicket.count({
        where: { status: { in: ['OPEN', 'IN_PROGRESS'] }, priority: 'HIGH' },
      }),
    ]);

    const healthCards = [
      {
        name: 'API Gateway',
        value: health.status === 'ok' ? 'Healthy' : 'Degraded',
        note: health.status === 'ok' ? 'NestJS serving' : 'dependency check failed',
        variant: health.status === 'ok' ? 'success' : 'warning',
      },
      {
        name: 'Postgres',
        value: health.checks.postgres === 'up' ? 'Healthy' : 'Down',
        note: health.checks.postgres === 'up' ? 'reachability ok' : 'connection failed',
        variant: health.checks.postgres === 'up' ? 'success' : 'danger',
      },
      {
        name: 'Redis',
        value: health.checks.redis === 'up' ? 'Healthy' : 'Down',
        note: health.checks.redis === 'up' ? 'reachability ok' : 'connection failed',
        variant: health.checks.redis === 'up' ? 'success' : 'danger',
      },
      {
        name: 'AI Platform',
        value: health.checks.aiPlatform === 'up' ? 'Healthy' : health.checks.aiPlatform === 'not_configured' ? 'Not configured' : 'Degraded',
        note: health.checks.aiPlatform === 'up' ? 'endpoint set' : 'fallback active — ai_fallback_used',
        variant: health.checks.aiPlatform === 'up' ? 'success' : 'warning',
      },
      {
        name: 'Ambulance Matching',
        value: searching === 0 ? 'Clear' : `${searching} searching`,
        note: 'BR-01 target 90s P95',
        variant: searching > 5 ? 'warning' : 'success',
      },
      {
        name: 'Bed inventory freshness',
        value: staleBeds === 0 ? 'Fresh' : `${staleBeds} stale`,
        note: 'Section 13.1 staleness',
        variant: staleBeds > 0 ? 'warning' : 'success',
      },
    ];

    const incidents = [
      ...openHighIssues.map((i) => ({
        text: `${i.issueNumber}: ${i.title}`,
        status: i.status.replace(/_/g, ' '),
        variant: i.status === 'BLOCKED' ? 'neutral' : 'danger',
      })),
      ...(openHighTickets > 0
        ? [{
            text: `${openHighTickets} HIGH-priority support ticket(s) still open`,
            status: 'Investigating',
            variant: 'warning' as const,
          }]
        : []),
    ];

    return { healthCards, incidents, generatedAt: new Date().toISOString() };
  }

  // ── A-18 Governance ────────────────────────────────────────────────────────

  async listFeatureFlags() {
    return this.prisma.featureFlag.findMany({ orderBy: { key: 'asc' } });
  }

  async toggleFeatureFlag(key: string, enabled: boolean, actor: string) {
    const flag = await this.prisma.featureFlag.update({
      where: { key },
      data: { enabled },
    });
    await this.audit.record({
      actor,
      action: 'FEATURE_FLAG_TOGGLED',
      entityType: 'FeatureFlag',
      entityId: flag.id,
      metadata: { key, enabled },
    });
    return flag;
  }

  async listConfig() {
    const rows = await this.prisma.platformConfig.findMany({ orderBy: [{ groupKey: 'asc' }, { label: 'asc' }] });
    const groups = new Map<string, Array<{ id: string; label: string; value: string }>>();
    for (const r of rows) {
      const list = groups.get(r.groupKey) ?? [];
      list.push({ id: r.id, label: r.label, value: r.value });
      groups.set(r.groupKey, list);
    }
    const titles: Record<string, string> = {
      hold_expiry: 'Hold-expiry windows (BR-02)',
      staleness: 'Staleness thresholds (BR-03)',
      sla: 'Radius & SLA defaults',
    };
    return Array.from(groups.entries()).map(([groupKey, rows]) => ({
      groupKey,
      title: titles[groupKey] ?? groupKey,
      rows,
    }));
  }

  async searchAudit(q?: string, limit = 50) {
    const where = q
      ? {
          OR: [
            { actor: { contains: q, mode: 'insensitive' as const } },
            { action: { contains: q, mode: 'insensitive' as const } },
            { entityType: { contains: q, mode: 'insensitive' as const } },
            { entityId: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {};
    const rows = await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 200),
    });
    // `actor` is stored as whatever identifier the caller had at write time — almost
    // always a Firebase UID (an opaque hash-like string), never a human-readable
    // name (UAT #30). Resolve it against the known console-user directory here,
    // read-side only, so the audit_log write path/schema stays untouched.
    const uids = Array.from(new Set(rows.map((r) => r.actor).filter(Boolean)));
    const consoleUsers = uids.length
      ? await this.prisma.consoleUser.findMany({
          where: { firebaseUid: { in: uids } },
          select: { firebaseUid: true, email: true, role: true },
        })
      : [];
    const byUid = new Map(consoleUsers.map((u) => [u.firebaseUid as string, u]));
    return rows.map((r) => {
      const match = byUid.get(r.actor);
      return {
        ...r,
        actorLabel: match ? `${match.email} (${match.role.replace(/_/g, ' ')})` : r.actor,
      };
    });
  }

  // ── A-03 Citizen onboarding flags ──────────────────────────────────────────

  async listCitizenFlags() {
    return this.prisma.citizenOnboardingFlag.findMany({
      where: { status: { in: ['PENDING', 'IN_REVIEW'] } },
      orderBy: { flaggedAt: 'desc' },
      take: 100,
    });
  }

  async updateCitizenFlag(
    id: string,
    status: string,
    actor: string,
    notes?: string,
    resolution?: string,
  ) {
    const existing = await this.prisma.citizenOnboardingFlag.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`CitizenOnboardingFlag ${id} not found`);

    const allowedStatus = ['PENDING', 'IN_REVIEW', 'RESOLVED'];
    if (!allowedStatus.includes(status)) {
      throw new BadRequestException(`status must be one of ${allowedStatus.join(', ')}`);
    }

    let nextResolution: string | null | undefined = resolution;
    if (status === 'RESOLVED') {
      const res = resolution ?? existing.resolution;
      if (!res || !CITIZEN_RESOLUTIONS.includes(res as (typeof CITIZEN_RESOLUTIONS)[number])) {
        throw new BadRequestException(
          `resolution is required when resolving (one of ${CITIZEN_RESOLUTIONS.join(', ')})`,
        );
      }
      if (!notes?.trim() && !existing.notes?.trim()) {
        throw new BadRequestException('notes are required when resolving a citizen onboarding flag');
      }
      nextResolution = res;
    } else if (resolution != null) {
      nextResolution = resolution;
    }

    const row = await this.prisma.citizenOnboardingFlag.update({
      where: { id },
      data: {
        status,
        ...(notes != null ? { notes } : {}),
        ...(nextResolution !== undefined ? { resolution: nextResolution } : {}),
      },
    });
    await this.audit.record({
      actor,
      action: 'CITIZEN_ONBOARDING_FLAG_UPDATED',
      entityType: 'CitizenOnboardingFlag',
      entityId: row.id,
      metadata: {
        from: existing.status,
        to: status,
        resolution: row.resolution,
      },
    });
    return row;
  }

  /** G5: load linked case context after recording support access justification. */
  async getTicketCaseContext(ticketId: string, justification: string, actor: string) {
    const reason = justification?.trim();
    if (!reason || reason.length < 8) {
      throw new BadRequestException('access justification must be at least 8 characters');
    }

    const ticket = await this.getTicket(ticketId);
    const updated = await this.prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { accessJustification: reason },
    });

    await this.audit.record({
      actor,
      action: 'SUPPORT_CASE_ACCESS',
      entityType: 'SupportTicket',
      entityId: ticket.id,
      metadata: {
        entityRef: ticket.entityRef,
        justification: reason,
      },
    });

    const ref = ticket.entityRef?.trim();
    if (!ref) {
      return { ticket: updated, case: null, timeline: [], note: 'No entityRef on this ticket' };
    }

    // PROVIDER tickets carry a facility/org name or id in entityRef (e.g. "Apollo
    // Hospital, Whitefield"), not a Case id/number — there is no Case to look up for
    // them by design. Previously this unconditionally searched Case by entityRef for
    // every ticket type, producing a confusing "No case found for entityRef <facility
    // name>" message that read as an error rather than an expected no-op (UAT #18/#20).
    if (ticket.requesterType === 'PROVIDER') {
      return {
        ticket: updated,
        case: null,
        timeline: [],
        note: `This ticket is linked to provider "${ref}", not a citizen case — no case timeline applies.`,
      };
    }

    const kase = await this.prisma.case.findFirst({
      where: { OR: [{ id: ref }, { caseNumber: ref }] },
    });
    if (!kase) {
      return {
        ticket: updated,
        case: null,
        timeline: [],
        note: `No case found for entityRef ${ref}`,
      };
    }

    const timeline = await this.prisma.caseTimelineEvent.findMany({
      where: { caseId: kase.id },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });

    return { ticket: updated, case: kase, timeline, note: null };
  }

  // ── A-10 / A-15 SLA + Analytics (shared compliance computation) ────────────

  async getSlaAndAnalyticsSnapshot() {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [
      ambTotal,
      ambMatched,
      holdsTotal,
      holdsConfirmedOnTime,
      ticketsTotal,
      ticketsResolved,
      casesResolved,
      providersCreated,
      searchingNow,
      configRows,
      goldenCases,
    ] = await Promise.all([
      this.prisma.ambulanceRequest.count({ where: { createdAt: { gte: since } } }),
      this.prisma.ambulanceRequest.count({
        where: {
          createdAt: { gte: since },
          status: { in: ['MATCHED', 'EN_ROUTE_PICKUP', 'ARRIVED_PICKUP', 'EN_ROUTE_HOSPITAL', 'ARRIVED_HOSPITAL', 'COMPLETED'] },
        },
      }),
      this.prisma.resourceHold.count({ where: { heldAt: { gte: since } } }),
      this.prisma.resourceHold.count({
        where: {
          heldAt: { gte: since },
          status: 'CONFIRMED',
          confirmedAt: { not: null },
        },
      }),
      this.prisma.supportTicket.count({ where: { createdAt: { gte: since } } }),
      this.prisma.supportTicket.count({
        where: { createdAt: { gte: since }, status: { in: ['RESOLVED', 'CLOSED'] } },
      }),
      this.prisma.case.count({
        where: { createdAt: { gte: since }, status: { in: ['RESOLVED', 'CLOSED', 'STABILIZED'] } },
      }),
      this.prisma.providerApplication.count({ where: { createdAt: { gte: since } } }),
      this.prisma.ambulanceRequest.count({ where: { status: 'SEARCHING' } }),
      this.prisma.platformConfig.findMany({ where: { groupKey: 'sla' } }),
      this.prisma.case.findMany({
        where: { createdAt: { gte: since }, goldenHourTargetDeadline: { not: null } },
        select: { status: true, updatedAt: true, goldenHourTargetDeadline: true },
        take: 5000,
      }),
    ]);

    const goldenOk = goldenCases.filter(
      (c) =>
        ['RESOLVED', 'CLOSED', 'STABILIZED'].includes(c.status) &&
        c.goldenHourTargetDeadline != null &&
        c.updatedAt <= c.goldenHourTargetDeadline,
    ).length;

    // Returns null (not 0% / not 100%) when there's zero volume in the 30d window —
    // there is nothing to be "breached" or "compliant" against yet. Previously this
    // forced the denominator to Math.max(d, 1), which silently turned "no data" into
    // a real 0% and rendered every metric as BREACH on a fresh/quiet environment.
    const pct = (n: number, d: number): number | null => (d === 0 ? null : Math.round((n / d) * 1000) / 10);
    const band = (p: number | null): { status: string; variant: 'success' | 'warning' | 'danger' | 'neutral' } => {
      if (p == null) return { status: 'NO_DATA', variant: 'neutral' };
      if (p >= 95) return { status: 'WITHIN_SLA', variant: 'success' };
      if (p >= 85) return { status: 'WATCH', variant: 'warning' };
      return { status: 'BREACH', variant: 'danger' };
    };
    const pctLabel = (p: number | null, suffix: string) => (p == null ? 'n/a (no activity in 30d)' : `${p}%${suffix}`);

    const ambPct = pct(ambMatched, ambTotal);
    const holdPct = pct(holdsConfirmedOnTime, holdsTotal);
    const ticketPct = pct(ticketsResolved, ticketsTotal);
    const goldenPct = goldenCases.length === 0 ? null : pct(goldenOk, goldenCases.length);

    const ambTarget = configRows.find((r) => /ambulance|dispatch/i.test(r.label))?.value ?? '90s P95';
    const holdTarget = configRows.find((r) => /hold/i.test(r.label))?.value ?? 'confirm before expiry';
    const supportTarget = configRows.find((r) => /support|ticket/i.test(r.label))?.value ?? 'first response < 15m';

    const definitions = [
      {
        key: 'AMBULANCE_DISPATCH',
        name: 'Ambulance dispatch (BR-01)',
        definition: 'Case → matched driver (proxy for en-route SLA)',
        target: ambTarget,
        currentP95: pctLabel(ambPct, ' matched (30d)'),
        ...band(ambPct),
      },
      {
        key: 'HOLD_CONFIRMATION',
        name: 'Resource hold confirmation',
        definition: 'Hold reaches CONFIRMED before release/expiry',
        target: holdTarget,
        currentP95: pctLabel(holdPct, ' confirmed (30d)'),
        ...band(holdPct),
      },
      {
        key: 'SUPPORT_RESOLUTION',
        name: 'Support ticket resolution',
        definition: 'Tickets closed/resolved within 30d window',
        target: supportTarget,
        currentP95: pctLabel(ticketPct, ' resolved (30d)'),
        ...band(ticketPct),
      },
      {
        key: 'GOLDEN_HOUR',
        name: 'Golden hour compliance',
        definition: 'Cases with deadline met before target',
        target: 'before golden_hour_target_deadline',
        currentP95: goldenPct == null ? 'n/a (no timed cases)' : `${goldenPct}%`,
        ...(goldenPct == null ? { status: 'WATCH', variant: 'warning' as const } : band(goldenPct)),
      },
    ];

    const compliance30d = [
      {
        category: 'Ambulance',
        volume: ambTotal,
        volumeLabel: `${ambTotal} requests`,
        compliancePercent: ambPct,
        ...band(ambPct),
      },
      {
        category: 'Bed / resource holds',
        volume: holdsTotal,
        volumeLabel: `${holdsTotal} holds`,
        compliancePercent: holdPct,
        ...band(holdPct),
      },
      {
        category: 'Support',
        volume: ticketsTotal,
        volumeLabel: `${ticketsTotal} tickets`,
        compliancePercent: ticketPct,
        ...band(ticketPct),
      },
    ];

    return {
      definitions,
      compliance30d,
      rollup: {
        casesResolved30d: casesResolved,
        goldenHourCompliancePercent: goldenPct,
        providerNetworkGrowth30d: providersCreated,
        bloodDonorRegistryGrowth30d: null as number | null,
        searchingAmbulancesNow: searchingNow,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  // ── A-11 Knowledge Base ────────────────────────────────────────────────────

  async listKnowledgeArticles() {
    const articles = await this.prisma.knowledgeArticle.findMany({ orderBy: { updatedAt: 'desc' } });
    const categories = Array.from(new Set(articles.map((a) => a.category))).sort();
    return { articles, categories };
  }

  async createKnowledgeArticle(input: { title: string; category: string; body?: string; note?: string; actor: string }) {
    const article = await this.prisma.knowledgeArticle.create({
      data: {
        title: input.title,
        category: input.category,
        body: input.body ?? '',
        note: input.note,
      },
    });
    await this.audit.record({
      actor: input.actor,
      action: 'KNOWLEDGE_ARTICLE_CREATED',
      entityType: 'KnowledgeArticle',
      entityId: article.id,
      metadata: { title: article.title },
    });
    return article;
  }

  // ── A-13 Workflows (read-only catalog; Provider Onboarding is immutable G4) ─

  listWorkflows() {
    const providerStages = [
      { num: 1, name: 'Application intake', gate: 'Submit legal entity docs', key: 'APPLICATION_INTAKE' },
      { num: 2, name: 'Credential verification', gate: 'Zero-tolerance checklist', key: 'CREDENTIAL_VERIFICATION' },
      { num: 3, name: 'Integration test', gate: 'Beds/ambulance webhook pass', key: 'INTEGRATION_TEST' },
      { num: 4, name: 'Go-live approval', gate: 'Console Administrator sign-off', key: 'GO_LIVE_APPROVAL' },
      { num: 5, name: 'Portal access activated', gate: 'Staff can sign in', key: 'PORTAL_ACCESS_ACTIVATED' },
    ];
    return [
      {
        id: 'wf-provider-onboarding',
        name: 'Provider Onboarding (G4)',
        stageCount: providerStages.length,
        usage: 'All provider types',
        active: true,
        immutable: true,
        stages: providerStages,
      },
      {
        id: 'wf-citizen-duplicate',
        name: 'Citizen duplicate review (G3)',
        stageCount: 3,
        usage: 'Trust & Safety',
        active: true,
        immutable: false,
        stages: [
          { num: 1, name: 'Flag raised', gate: 'Automated or agent', key: 'FLAGGED' },
          { num: 2, name: 'In review', gate: 'Analyst assigned', key: 'IN_REVIEW' },
          { num: 3, name: 'Resolved', gate: 'Merge / clear / escalate', key: 'RESOLVED' },
        ],
      },
      {
        id: 'wf-support-escalation',
        name: 'Support escalation',
        stageCount: 3,
        usage: 'Support Agents',
        active: true,
        immutable: false,
        stages: [
          { num: 1, name: 'Open', gate: 'Ticket created', key: 'OPEN' },
          { num: 2, name: 'In progress', gate: 'Agent owning', key: 'IN_PROGRESS' },
          { num: 3, name: 'Resolved', gate: 'Citizen/provider confirmed', key: 'RESOLVED' },
        ],
      },
    ];
  }

  // ── A-16 Communications ────────────────────────────────────────────────────

  async listBroadcasts() {
    return this.prisma.broadcast.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
  }

  async createBroadcast(input: {
    title: string;
    body: string;
    audience: string;
    channels: string[];
    status?: string;
    actor: string;
  }) {
    const row = await this.prisma.broadcast.create({
      data: {
        title: input.title,
        body: input.body,
        audience: input.audience,
        channels: input.channels,
        status: input.status ?? 'DRAFT',
      },
    });
    await this.audit.record({
      actor: input.actor,
      action: 'BROADCAST_CREATED',
      entityType: 'Broadcast',
      entityId: row.id,
      metadata: { status: row.status, audience: row.audience },
    });
    return row;
  }

  // ── Admin provider directory (search + ops oversight) ──────────────────────

  async searchProviders(q?: string) {
    const term = q?.trim();
    return this.prisma.hospitalRegistry.findMany({
      where: {
        isActive: true,
        ...(term
          ? {
              OR: [
                { name: { contains: term, mode: 'insensitive' } },
                { hospitalId: { contains: term, mode: 'insensitive' } },
                { city: { contains: term, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
      take: 50,
    });
  }

  async getProviderOrg(orgId: string, actor: string) {
    const registry = await this.prisma.hospitalRegistry.findUnique({
      where: { hospitalId: orgId },
    });
    if (!registry) throw new NotFoundException(`Provider ${orgId} not found`);

    const [application, beds] = await Promise.all([
      this.prisma.providerApplication.findFirst({
        where: { orgId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.hospitalBedInventory.findMany({
        where: { hospitalId: orgId },
        orderBy: { category: 'asc' },
      }),
    ]);

    await this.audit.record({
      actor,
      action: 'ADMIN_PROVIDER_VIEWED',
      entityType: 'HospitalRegistry',
      entityId: orgId,
      metadata: { name: registry.name },
    });

    return { registry, application, beds };
  }

  // ── A-17 AI Ops Assistant ──────────────────────────────────────────────────

  async getAiOpsAssistant() {
    const [suggestions, monitoring] = await Promise.all([
      this.prisma.aiOpsSuggestion.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }),
      this.getMonitoringSnapshot(),
    ]);
    const anomalies = monitoring.incidents.slice(0, 8).map((i, idx) => ({
      id: `anom-${idx}`,
      text: i.text,
      variant: (i.variant === 'danger' ? 'danger' : 'warning') as 'warning' | 'danger',
      createdAt: monitoring.generatedAt,
    }));
    const status = monitoring.healthCards.map((c) => ({
      label: c.name,
      value: c.value,
      variant: c.variant,
    }));
    return { anomalies, status, suggestions };
  }

  async updateAiSuggestion(id: string, status: 'APPROVED' | 'DISMISSED', actor: string) {
    const existing = await this.prisma.aiOpsSuggestion.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`AiOpsSuggestion ${id} not found`);
    const row = await this.prisma.aiOpsSuggestion.update({
      where: { id },
      data: { status },
    });
    await this.audit.record({
      actor,
      action: 'AI_OPS_SUGGESTION_UPDATED',
      entityType: 'AiOpsSuggestion',
      entityId: row.id,
      metadata: { from: existing.status, to: status },
    });
    return row;
  }
}
