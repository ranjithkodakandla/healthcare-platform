import { NotFoundException } from '@nestjs/common';
import { AdminOpsService } from './admin-ops.service';

describe('AdminOpsService (unit)', () => {
  function build() {
    const prisma: Record<string, any> = {
      supportTicket: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({ id: 't1', ticketNumber: 'TCK-3400' }),
        update: jest.fn().mockResolvedValue({ id: 't1', status: 'OPEN', priority: 'HIGH' }),
      },
      platformIssue: {
        findMany: jest.fn().mockResolvedValue([
          { issueNumber: 'ISS-1', title: 'Outage', status: 'BLOCKED', severity: 'HIGH', updatedAt: new Date() },
        ]),
        findFirst: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: 'i1', status: 'OPEN' }),
      },
      ambulanceRequest: { count: jest.fn().mockResolvedValue(2) },
      hospitalBedInventory: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([]),
      },
      hospitalRegistry: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
      },
      featureFlag: {
        findMany: jest.fn().mockResolvedValue([{ key: 'x' }]),
        update: jest.fn().mockResolvedValue({ id: 'f1', key: 'x', enabled: true }),
      },
      platformConfig: {
        findMany: jest.fn().mockResolvedValue([
          { id: '1', groupKey: 'sla', label: 'Ambulance dispatch', value: '90s' },
          { id: '2', groupKey: 'hold_expiry', label: 'General', value: '600' },
        ]),
      },
      auditLog: { findMany: jest.fn().mockResolvedValue([]) },
      consoleUser: { findMany: jest.fn().mockResolvedValue([]) },
      citizenOnboardingFlag: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: 'cf1', status: 'CLEARED' }),
      },
      resourceHold: { count: jest.fn().mockResolvedValue(10) },
      case: {
        count: jest.fn().mockResolvedValue(3),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([
          {
            status: 'RESOLVED',
            updatedAt: new Date('2026-01-01'),
            goldenHourTargetDeadline: new Date('2026-01-02'),
          },
        ]),
      },
      providerApplication: {
        count: jest.fn().mockResolvedValue(1),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      knowledgeArticle: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'k1', category: 'Beds', title: 'A', updatedAt: new Date() },
        ]),
        create: jest.fn().mockResolvedValue({ id: 'k1', title: 'A' }),
      },
      broadcast: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({ id: 'b1', status: 'DRAFT', audience: 'ALL' }),
      },
      aiOpsSuggestion: {
        findMany: jest.fn().mockResolvedValue([{ id: 's1' }]),
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: 's1', status: 'APPROVED' }),
      },
    };
    const health = {
      check: jest.fn().mockResolvedValue({
        status: 'ok',
        checks: { postgres: 'up', redis: 'up', aiPlatform: 'up' },
      }),
    };
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const service = new AdminOpsService(prisma as never, health as never, audit as never);
    return { service, prisma, health, audit };
  }

  it('tickets CRUD + list filters', async () => {
    const { service, prisma, audit } = build();
    await service.listTickets({ requesterType: 'CITIZEN', q: 'bed' });
    expect(prisma.supportTicket.findMany).toHaveBeenCalled();

    prisma.supportTicket.findFirst.mockResolvedValueOnce(null);
    await expect(service.getTicket('missing')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.supportTicket.findFirst).toHaveBeenCalledWith({
      where: { ticketNumber: 'missing' },
    });

    prisma.supportTicket.findFirst.mockResolvedValueOnce(null);
    await expect(service.getTicket('nonexistent-id-123')).rejects.toBeInstanceOf(NotFoundException);

    prisma.supportTicket.findFirst.mockResolvedValueOnce({ id: 't1', ticketNumber: 'TCK-1' });
    await service.getTicket('TCK-1');

    const uuid = '11111111-1111-4111-8111-111111111111';
    prisma.supportTicket.findFirst.mockResolvedValueOnce({ id: uuid, ticketNumber: 'TCK-9' });
    await service.getTicket(uuid);
    expect(prisma.supportTicket.findFirst).toHaveBeenLastCalledWith({
      where: { OR: [{ id: uuid }, { ticketNumber: uuid }] },
    });

    await service.createTicket({
      requester: 'u',
      requesterType: 'CITIZEN',
      subject: 'Help',
      actor: 'admin',
    });
    expect(audit.record).toHaveBeenCalled();

    prisma.supportTicket.findFirst.mockResolvedValueOnce({ id: 't1' });
    await service.updateTicket('t1', { status: 'OPEN', priority: 'HIGH', assignedAgent: 'a', internalNotes: 'n', actor: 'admin' });
  });

  it('appends internal notes instead of overwriting them (UAT #17)', async () => {
    const { service, prisma } = build();
    prisma.supportTicket.findFirst.mockResolvedValueOnce({
      id: 't1',
      ticketNumber: 'TCK-1',
      status: 'OPEN',
      internalNotes: 'first note',
    });
    await service.updateTicket('t1', { internalNotes: 'second note', actor: 'agent@sahayak' });

    const updateCall = prisma.supportTicket.update.mock.calls[0][0];
    expect(updateCall.data.internalNotes).toContain('first note');
    expect(updateCall.data.internalNotes).toContain('second note');
    expect(updateCall.data.internalNotes).toContain('agent@sahayak');
  });

  it('rejects re-resolving or adding notes to an already-resolved ticket (UAT #21)', async () => {
    const { service, prisma } = build();
    prisma.supportTicket.findFirst.mockResolvedValue({
      id: 't1',
      ticketNumber: 'TCK-1',
      status: 'RESOLVED',
      internalNotes: 'closed out',
    });

    await expect(
      service.updateTicket('t1', { status: 'RESOLVED', actor: 'admin' }),
    ).rejects.toThrow(/already resolved|resolved.*reopen|reopen.*resolving/i);

    await expect(
      service.updateTicket('t1', { internalNotes: 'late addition', actor: 'admin' }),
    ).rejects.toThrow(/reopen/i);

    // Reopening (an explicit status change away from RESOLVED/CLOSED) is allowed.
    await expect(
      service.updateTicket('t1', { status: 'IN_PROGRESS', actor: 'admin' }),
    ).resolves.toBeDefined();
  });

  it('does not attempt a Case lookup for PROVIDER ticket entityRef (UAT #18/#20)', async () => {
    const { service, prisma } = build();
    prisma.supportTicket.findFirst.mockResolvedValueOnce({
      id: 't1',
      ticketNumber: 'TCK-3388',
      requesterType: 'PROVIDER',
      entityRef: 'Apollo Hospital, Whitefield',
    });
    prisma.supportTicket.update.mockResolvedValueOnce({ id: 't1', accessJustification: 'Investigating HMS webhook' });

    const result = await service.getTicketCaseContext('t1', 'Investigating HMS webhook', 'admin');

    expect(prisma.case.findFirst).not.toHaveBeenCalled();
    expect(result.case).toBeNull();
    expect(result.note).toMatch(/provider "Apollo Hospital, Whitefield"/);
  });

  it('searches providers and loads org detail', async () => {
    const { service, prisma, audit } = build();
    prisma.hospitalRegistry.findMany.mockResolvedValueOnce([{ hospitalId: 'hosp-1', name: 'Apollo' }]);
    prisma.hospitalRegistry.findUnique.mockResolvedValueOnce({ hospitalId: 'hosp-1', name: 'Apollo' });
    prisma.providerApplication.findFirst.mockResolvedValueOnce({ id: 'app1', orgId: 'hosp-1' });
    prisma.hospitalBedInventory.findMany.mockResolvedValueOnce([
      { category: 'ICU', totalCount: 10, availableCount: 2 },
    ]);

    const list = await service.searchProviders('Apollo');
    expect(list).toHaveLength(1);
    const detail = await service.getProviderOrg('hosp-1', 'admin');
    expect(detail.registry.hospitalId).toBe('hosp-1');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ADMIN_PROVIDER_VIEWED' }),
    );
  });

  it('issues, monitoring, flags, config, audit, citizen flags', async () => {
    const { service, prisma, health } = build();
    await service.listIssues();
    prisma.platformIssue.findFirst.mockResolvedValueOnce(null);
    await expect(service.updateIssueStatus('x', 'OPEN', 'a')).rejects.toBeInstanceOf(NotFoundException);
    prisma.platformIssue.findFirst.mockResolvedValueOnce({ id: 'i1', status: 'OPEN' });
    await service.updateIssueStatus('i1', 'IN_PROGRESS', 'a');

    const mon = await service.getMonitoringSnapshot();
    expect(mon.healthCards.length).toBeGreaterThan(3);
    expect(mon.incidents.length).toBeGreaterThan(0);

    health.check.mockResolvedValueOnce({
      status: 'degraded',
      checks: { postgres: 'down', redis: 'down', aiPlatform: 'not_configured' },
    });
    prisma.ambulanceRequest.count.mockResolvedValueOnce(6);
    prisma.hospitalBedInventory.count.mockResolvedValueOnce(0);
    prisma.platformIssue.findMany.mockResolvedValueOnce([]);
    prisma.supportTicket.count.mockResolvedValueOnce(0);
    await service.getMonitoringSnapshot();

    await service.listFeatureFlags();
    await service.toggleFeatureFlag('x', true, 'a');
    const cfg = await service.listConfig();
    expect(cfg[0].title).toMatch(/Hold-expiry|sla|Staleness|hold_expiry/i);
    await service.searchAudit('actor');
    await service.searchAudit();

    // UAT #30 regression: actor should resolve to a human-readable console-user
    // label (email + role) when the raw `actor` (a Firebase UID) matches a known
    // console user, instead of always surfacing the opaque uid string.
    prisma.auditLog.findMany.mockResolvedValueOnce([
      { id: 'a1', actor: 'uid-abc123', action: 'LOGIN', entityType: 'Session', entityId: 'e1', createdAt: new Date() },
    ]);
    prisma.consoleUser.findMany.mockResolvedValueOnce([
      { firebaseUid: 'uid-abc123', email: 'agent@sahayak.example', role: 'SUPPORT_AGENT' },
    ]);
    const [resolved] = await service.searchAudit();
    expect(resolved.actorLabel).toBe('agent@sahayak.example (SUPPORT AGENT)');

    prisma.auditLog.findMany.mockResolvedValueOnce([
      { id: 'a2', actor: 'unknown-uid', action: 'LOGIN', entityType: 'Session', entityId: 'e2', createdAt: new Date() },
    ]);
    prisma.consoleUser.findMany.mockResolvedValueOnce([]);
    const [unresolved] = await service.searchAudit();
    expect(unresolved.actorLabel).toBe('unknown-uid');

    await service.listCitizenFlags();
    prisma.citizenOnboardingFlag.findUnique.mockResolvedValueOnce(null);
    await expect(service.updateCitizenFlag('x', 'RESOLVED', 'a', 'ok', 'CLEARED')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    prisma.citizenOnboardingFlag.findUnique.mockResolvedValueOnce({ id: 'cf1', status: 'PENDING' });
    await service.updateCitizenFlag('cf1', 'RESOLVED', 'a', 'Reviewed duplicate — cleared', 'CLEARED');
  });

  it('SLA analytics, knowledge, workflows, broadcasts, AI ops', async () => {
    const { service, prisma } = build();
    // counts return various for band thresholds
    prisma.ambulanceRequest.count
      .mockResolvedValueOnce(100) // ambTotal
      .mockResolvedValueOnce(96) // ambMatched
      .mockResolvedValueOnce(0); // searchingNow later in Promise.all - order matters
    // Reset to sequential resolved values via mockImplementation
    let n = 0;
    const values = [100, 96, 50, 40, 20, 10, 5, 2, 0];
    prisma.ambulanceRequest.count.mockImplementation(async () => values[Math.min(n++, values.length - 1)] ?? 0);
    prisma.resourceHold.count
      .mockResolvedValueOnce(50)
      .mockResolvedValueOnce(40);
    prisma.supportTicket.count
      .mockResolvedValueOnce(20)
      .mockResolvedValueOnce(10);
    prisma.case.count.mockResolvedValueOnce(5);
    prisma.providerApplication.count.mockResolvedValueOnce(2);
    prisma.case.findMany.mockResolvedValueOnce([
      { status: 'RESOLVED', updatedAt: new Date('2026-01-01'), goldenHourTargetDeadline: new Date('2026-01-02') },
      { status: 'INITIATED', updatedAt: new Date('2026-01-03'), goldenHourTargetDeadline: new Date('2026-01-02') },
    ]);
    prisma.platformConfig.findMany.mockResolvedValueOnce([
      { label: 'Ambulance dispatch', value: '90s' },
      { label: 'Hold confirm', value: '600s' },
      { label: 'Support ticket', value: '15m' },
    ]);

    const sla = await service.getSlaAndAnalyticsSnapshot();
    expect(sla.definitions).toHaveLength(4);
    expect(sla.compliance30d.length).toBe(3);

    // empty golden cases branch
    n = 0;
    prisma.ambulanceRequest.count.mockResolvedValue(0);
    prisma.resourceHold.count.mockResolvedValue(0);
    prisma.supportTicket.count.mockResolvedValue(0);
    prisma.case.count.mockResolvedValue(0);
    prisma.providerApplication.count.mockResolvedValue(0);
    prisma.case.findMany.mockResolvedValueOnce([]);
    prisma.platformConfig.findMany.mockResolvedValueOnce([]);
    const sla2 = await service.getSlaAndAnalyticsSnapshot();
    expect(sla2.rollup.goldenHourCompliancePercent).toBeNull();
    // UAT #25 regression: zero volume in the 30d window must never render as a
    // false BREACH (it previously did, because a Math.max(d, 1) denominator
    // turned "no data" into a real 0%). It must be a neutral "no data" state.
    for (const def of sla2.definitions.filter((d) => d.key !== 'GOLDEN_HOUR')) {
      expect(def.status).toBe('NO_DATA');
      expect(def.variant).toBe('neutral');
    }
    for (const row of sla2.compliance30d) {
      expect(row.status).toBe('NO_DATA');
      expect(row.variant).toBe('neutral');
      expect(row.compliancePercent).toBeNull();
    }

    // low compliance band (<85)
    prisma.ambulanceRequest.count.mockResolvedValue(100);
    prisma.resourceHold.count.mockResolvedValue(100);
    prisma.supportTicket.count.mockResolvedValue(100);
    prisma.case.count.mockResolvedValue(0);
    prisma.providerApplication.count.mockResolvedValue(0);
    prisma.case.findMany.mockResolvedValueOnce([
      { status: 'RESOLVED', updatedAt: new Date('2026-01-03'), goldenHourTargetDeadline: new Date('2026-01-02') },
    ]);
    // matched/confirmed/resolved low
    prisma.ambulanceRequest.count.mockImplementation(async (args: any) => {
      if (args?.where?.status?.in) return 50;
      if (args?.where?.status === 'SEARCHING') return 0;
      return 100;
    });
    prisma.resourceHold.count.mockImplementation(async (args: any) => {
      if (args?.where?.status === 'CONFIRMED') return 50;
      return 100;
    });
    prisma.supportTicket.count.mockImplementation(async (args: any) => {
      if (args?.where?.status?.in) return 50;
      return 100;
    });
    await service.getSlaAndAnalyticsSnapshot();

    const kb = await service.listKnowledgeArticles();
    expect(kb.categories).toContain('Beds');
    await service.createKnowledgeArticle({ title: 'T', category: 'Beds', actor: 'a' });
    expect(service.listWorkflows().length).toBe(3);
    await service.listBroadcasts();
    await service.createBroadcast({
      title: 'Hi',
      body: 'Body',
      audience: 'ALL',
      channels: ['PUSH'],
      actor: 'a',
    });

    const ai = await service.getAiOpsAssistant();
    expect(ai.suggestions).toHaveLength(1);
    prisma.aiOpsSuggestion.findUnique.mockResolvedValueOnce(null);
    await expect(service.updateAiSuggestion('x', 'APPROVED', 'a')).rejects.toBeInstanceOf(NotFoundException);
    prisma.aiOpsSuggestion.findUnique.mockResolvedValueOnce({ id: 's1', status: 'PENDING' });
    await service.updateAiSuggestion('s1', 'APPROVED', 'a');
  });
});
