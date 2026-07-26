import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { HospitalPortalRole, ResourceHoldStatus } from '@sahayak/shared-constants';
import { ClinicalAckService, IncomingPatientsService } from './incoming-patients.service';

describe('IncomingPatientsService (unit)', () => {
  function build() {
    const prisma = {
      resourceHold: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      case: { findMany: jest.fn() },
      $transaction: jest.fn(async (fn: (tx: unknown) => unknown) =>
        fn({
          resourceHold: { update: jest.fn().mockResolvedValue({}) },
        }),
      ),
    };
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const events = { publish: jest.fn().mockResolvedValue(undefined) };
    const service = new IncomingPatientsService(prisma as never, audit as never, events as never);
    return { service, prisma, audit, events };
  }

  it('getIncomingQueue returns empty and ranks by severity', async () => {
    const { service, prisma } = build();
    prisma.resourceHold.findMany.mockResolvedValueOnce([]);
    expect(await service.getIncomingQueue('h1')).toEqual([]);

    const t1 = new Date('2026-01-01T00:00:00Z');
    const t2 = new Date('2026-01-01T00:01:00Z');
    prisma.resourceHold.findMany.mockResolvedValueOnce([
      {
        id: 'h-a',
        caseId: 'c1',
        resourceType: 'BED',
        status: 'PENDING',
        requiresSecondaryAck: false,
        heldAt: t2,
        expiresAt: t2,
      },
      {
        id: 'h-b',
        caseId: 'c2',
        resourceType: 'BED',
        status: 'PENDING',
        requiresSecondaryAck: true,
        heldAt: t1,
        expiresAt: t1,
      },
      {
        id: 'h-c',
        caseId: null,
        resourceType: 'BED',
        status: 'PENDING',
        requiresSecondaryAck: false,
        heldAt: t1,
        expiresAt: t1,
      },
    ]);
    prisma.case.findMany.mockResolvedValueOnce([
      { id: 'c1', severity: 'MODERATE', caseNumber: 'A' },
      { id: 'c2', severity: 'CRITICAL', caseNumber: 'B' },
    ]);
    const queue = await service.getIncomingQueue('hosp');
    expect(queue.map((q) => q.holdId)).toEqual(['h-b', 'h-a', 'h-c']);
  });

  it('confirmHold validates ownership, state, and clinical ack gate', async () => {
    const { service, prisma } = build();
    prisma.resourceHold.findUnique.mockResolvedValueOnce(null);
    await expect(service.confirmHold('h', 'x', 'a', 'ADMISSIONS')).rejects.toBeInstanceOf(
      NotFoundException,
    );

    prisma.resourceHold.findUnique.mockResolvedValueOnce({
      id: 'x',
      resourceOwnerId: 'other',
      status: ResourceHoldStatus.PENDING,
      requiresSecondaryAck: false,
    });
    await expect(service.confirmHold('h', 'x', 'a', 'ADMISSIONS')).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    prisma.resourceHold.findUnique.mockResolvedValueOnce({
      id: 'x',
      resourceOwnerId: 'h',
      status: ResourceHoldStatus.CONFIRMED,
      requiresSecondaryAck: false,
    });
    await expect(service.confirmHold('h', 'x', 'a', 'ADMISSIONS')).rejects.toBeInstanceOf(
      BadRequestException,
    );

    prisma.resourceHold.findUnique.mockResolvedValueOnce({
      id: 'x',
      resourceOwnerId: 'h',
      status: ResourceHoldStatus.PENDING,
      requiresSecondaryAck: true,
    });
    await expect(service.confirmHold('h', 'x', 'a', 'ADMISSIONS')).rejects.toBeInstanceOf(
      BadRequestException,
    );

    prisma.resourceHold.findUnique.mockResolvedValueOnce({
      id: 'x',
      resourceOwnerId: 'h',
      status: ResourceHoldStatus.PENDING,
      requiresSecondaryAck: false,
    });
    await service.confirmHold('h', 'x', 'actor', 'ADMISSIONS');
  });

  it('declineHold happy and error paths', async () => {
    const { service, prisma } = build();
    prisma.resourceHold.findUnique.mockResolvedValueOnce(null);
    await expect(service.declineHold('h', 'x', 'a', 'full')).rejects.toBeInstanceOf(NotFoundException);

    prisma.resourceHold.findUnique.mockResolvedValueOnce({
      id: 'x',
      resourceOwnerId: 'other',
      status: ResourceHoldStatus.PENDING,
    });
    await expect(service.declineHold('h', 'x', 'a', 'full')).rejects.toBeInstanceOf(ForbiddenException);

    prisma.resourceHold.findUnique.mockResolvedValueOnce({
      id: 'x',
      resourceOwnerId: 'h',
      status: ResourceHoldStatus.RELEASED,
    });
    await expect(service.declineHold('h', 'x', 'a', 'full')).rejects.toBeInstanceOf(BadRequestException);

    prisma.resourceHold.findUnique.mockResolvedValueOnce({
      id: 'x',
      resourceOwnerId: 'h',
      status: ResourceHoldStatus.PENDING,
    });
    await service.declineHold('h', 'x', 'a', 'no beds');
  });
});

describe('ClinicalAckService (unit)', () => {
  function build() {
    const prisma = {
      resourceHold: { findUnique: jest.fn() },
      $transaction: jest.fn(async (fn: (tx: unknown) => unknown) =>
        fn({ resourceHold: { update: jest.fn() } }),
      ),
    };
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const events = { publish: jest.fn().mockResolvedValue(undefined) };
    const service = new ClinicalAckService(prisma as never, audit as never, events as never);
    return { service, prisma };
  }

  it('enforces clinical lead and hold preconditions', async () => {
    const { service, prisma } = build();
    await expect(
      service.acknowledgeHold('h', 'x', 'lead', 'ADMISSIONS'),
    ).rejects.toBeInstanceOf(ForbiddenException);

    prisma.resourceHold.findUnique.mockResolvedValueOnce(null);
    await expect(
      service.acknowledgeHold('h', 'x', 'lead', HospitalPortalRole.HOSPITAL_CLINICAL_LEAD),
    ).rejects.toBeInstanceOf(NotFoundException);

    prisma.resourceHold.findUnique.mockResolvedValueOnce({
      id: 'x',
      resourceOwnerId: 'other',
      requiresSecondaryAck: true,
      status: ResourceHoldStatus.PENDING,
    });
    await expect(
      service.acknowledgeHold('h', 'x', 'lead', HospitalPortalRole.HOSPITAL_CLINICAL_LEAD),
    ).rejects.toBeInstanceOf(ForbiddenException);

    prisma.resourceHold.findUnique.mockResolvedValueOnce({
      id: 'x',
      resourceOwnerId: 'h',
      requiresSecondaryAck: false,
      status: ResourceHoldStatus.PENDING,
    });
    await expect(
      service.acknowledgeHold('h', 'x', 'lead', HospitalPortalRole.HOSPITAL_CLINICAL_LEAD),
    ).rejects.toBeInstanceOf(BadRequestException);

    prisma.resourceHold.findUnique.mockResolvedValueOnce({
      id: 'x',
      resourceOwnerId: 'h',
      requiresSecondaryAck: true,
      status: ResourceHoldStatus.CONFIRMED,
    });
    await expect(
      service.acknowledgeHold('h', 'x', 'lead', HospitalPortalRole.HOSPITAL_CLINICAL_LEAD),
    ).rejects.toBeInstanceOf(BadRequestException);

    prisma.resourceHold.findUnique.mockResolvedValueOnce({
      id: 'x',
      resourceOwnerId: 'h',
      requiresSecondaryAck: true,
      status: ResourceHoldStatus.PENDING,
    });
    await service.acknowledgeHold('h', 'x', 'lead', HospitalPortalRole.HOSPITAL_CLINICAL_LEAD);
  });
});
