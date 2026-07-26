import { AdminOpsService } from './admin-ops.service';

describe('AdminOpsService', () => {
  const prisma = {
    supportTicket: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    platformIssue: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    featureFlag: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    platformConfig: {
      findMany: jest.fn(),
    },
    auditLog: {
      findMany: jest.fn(),
    },
    ambulanceRequest: { count: jest.fn() },
    hospitalBedInventory: { count: jest.fn() },
  };

  const health = {
    check: jest.fn().mockResolvedValue({
      status: 'ok',
      checks: { postgres: 'up', redis: 'up', aiPlatform: 'not_configured' },
    }),
  };

  const audit = { record: jest.fn().mockResolvedValue(undefined) };

  const service = new AdminOpsService(prisma as never, health as never, audit as never);

  beforeEach(() => jest.clearAllMocks());

  it('lists tickets', async () => {
    prisma.supportTicket.findMany.mockResolvedValue([{ ticketNumber: 'TCK-1' }]);
    const rows = await service.listTickets();
    expect(rows).toHaveLength(1);
  });

  it('creates a ticket with sequential number', async () => {
    prisma.supportTicket.count.mockResolvedValue(0);
    prisma.supportTicket.create.mockResolvedValue({ id: 't1', ticketNumber: 'TCK-3400' });
    const created = await service.createTicket({
      requester: 'Test',
      requesterType: 'CITIZEN',
      subject: 'Help',
      actor: 'admin-1',
    });
    expect(created.ticketNumber).toBe('TCK-3400');
    expect(audit.record).toHaveBeenCalled();
  });

  it('groups config by groupKey', async () => {
    prisma.platformConfig.findMany.mockResolvedValue([
      { id: '1', groupKey: 'sla', label: 'Ambulance dispatch SLA (BR-01)', value: '90 sec' },
      { id: '2', groupKey: 'sla', label: 'Ambulance search radius, initial', value: '5 km' },
    ]);
    const groups = await service.listConfig();
    expect(groups).toHaveLength(1);
    expect(groups[0].title).toContain('SLA');
    expect(groups[0].rows).toHaveLength(2);
  });

  it('builds monitoring snapshot from health + aggregates', async () => {
    prisma.ambulanceRequest.count.mockResolvedValue(2);
    prisma.hospitalBedInventory.count.mockResolvedValue(1);
    prisma.platformIssue.findMany.mockResolvedValue([
      { issueNumber: 'ISS-1', title: 'Outage', status: 'OPEN', severity: 'HIGH' },
    ]);
    prisma.supportTicket.count.mockResolvedValue(3);
    const snap = await service.getMonitoringSnapshot();
    expect(snap.healthCards.length).toBeGreaterThanOrEqual(4);
    expect(snap.incidents.length).toBeGreaterThan(0);
  });
});
