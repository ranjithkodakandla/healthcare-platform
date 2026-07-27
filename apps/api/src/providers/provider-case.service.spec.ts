import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CaseSeverity, BedCategory } from '@sahayak/shared-constants';
import { ProviderCaseService } from './provider-case.service';

describe('ProviderCaseService', () => {
  function build() {
    const prisma = {
      resourceHold: { findMany: jest.fn(), findFirst: jest.fn() },
      case: { findMany: jest.fn() },
    };
    const caseService = {
      createCase: jest.fn(),
      getTimeline: jest.fn(),
    };
    const resourceCoordination = {
      ensureCapacity: jest.fn().mockResolvedValue({}),
      createHold: jest.fn(),
    };
    const config = { get: jest.fn().mockReturnValue(undefined) };
    return {
      service: new ProviderCaseService(prisma as never, caseService as never, resourceCoordination as never, config as never),
      prisma,
      caseService,
      resourceCoordination,
      config,
    };
  }

  it('lists cases from holds owned by this hospital, joined to Case rows', async () => {
    const { service, prisma } = build();
    prisma.resourceHold.findMany.mockResolvedValue([
      { id: 'h1', caseId: 'c1', resourceOwnerId: 'hosp-1:ICU', status: 'PENDING', heldAt: new Date() },
      { id: 'h2', caseId: null, resourceOwnerId: 'hosp-1:GENERAL', status: 'PENDING', heldAt: new Date() },
    ]);
    prisma.case.findMany.mockResolvedValue([
      { id: 'c1', caseNumber: 'HCC-1', severity: 'CRITICAL', status: 'IN_PROGRESS' },
    ]);

    const rows = await service.list('hosp-1');

    expect(prisma.resourceHold.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ resourceOwnerId: { startsWith: 'hosp-1:' } }) }),
    );
    expect(rows).toEqual([
      { caseId: 'c1', caseNumber: 'HCC-1', severity: 'CRITICAL', status: 'IN_PROGRESS', holdId: 'h1', category: 'ICU', holdStatus: 'PENDING', heldAt: expect.any(Date) },
    ]);
  });

  it('returns an empty list when no holds exist', async () => {
    const { service, prisma } = build();
    prisma.resourceHold.findMany.mockResolvedValue([]);
    expect(await service.list('hosp-1')).toEqual([]);
    expect(prisma.case.findMany).not.toHaveBeenCalled();
  });

  it('getTimeline rejects a case not held at this hospital', async () => {
    const { service, prisma } = build();
    prisma.resourceHold.findFirst.mockResolvedValue(null);
    await expect(service.getTimeline('hosp-1', 'c1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('getTimeline delegates to CaseService for an owned case', async () => {
    const { service, prisma, caseService } = build();
    prisma.resourceHold.findFirst.mockResolvedValue({ id: 'h1' });
    caseService.getTimeline.mockResolvedValue([{ id: 'evt-1' }]);
    const result = await service.getTimeline('hosp-1', 'c1');
    expect(result).toEqual([{ id: 'evt-1' }]);
    expect(caseService.getTimeline).toHaveBeenCalledWith('c1');
  });

  it('createWalkIn rejects a missing category', async () => {
    const { service } = build();
    await expect(
      service.createWalkIn('hosp-1', { severity: CaseSeverity.CRITICAL, category: undefined as never }, 'actor'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('createWalkIn creates a Case and a matching ResourceHold, CRITICAL severity uses the 30min bucket', async () => {
    const { service, caseService, resourceCoordination } = build();
    caseService.createCase.mockResolvedValue({ id: 'c1', caseNumber: 'HCC-1' });
    resourceCoordination.createHold.mockResolvedValue({ id: 'h1', status: 'PENDING' });

    const result = await service.createWalkIn(
      'hosp-1',
      { severity: CaseSeverity.CRITICAL, category: BedCategory.ICU, patientName: 'Walk-in Patient' },
      'actor',
    );

    expect(caseService.createCase).toHaveBeenCalledWith(
      expect.objectContaining({ actor: 'actor', initiatorId: 'actor', severity: CaseSeverity.CRITICAL }),
    );
    expect(resourceCoordination.ensureCapacity).toHaveBeenCalledWith('BED', 'hosp-1:ICU', 1);
    expect(resourceCoordination.createHold).toHaveBeenCalledWith(
      expect.objectContaining({ resourceOwnerId: 'hosp-1:ICU', caseId: 'c1', ttlSeconds: 1800, requiresSecondaryAck: true }),
    );
    expect(result).toEqual({ case: { id: 'c1', caseNumber: 'HCC-1' }, hold: { id: 'h1', status: 'PENDING' } });
  });

  it('createWalkIn uses the 120min PLANNED bucket for non-critical severity, and requiresSecondaryAck=false for General', async () => {
    const { service, caseService, resourceCoordination } = build();
    caseService.createCase.mockResolvedValue({ id: 'c2' });
    resourceCoordination.createHold.mockResolvedValue({ id: 'h2' });
    await service.createWalkIn('hosp-1', { severity: CaseSeverity.MODERATE, category: BedCategory.GENERAL }, 'actor');
    expect(resourceCoordination.createHold).toHaveBeenCalledWith(
      expect.objectContaining({ ttlSeconds: 7200, requiresSecondaryAck: false }),
    );
  });
});
