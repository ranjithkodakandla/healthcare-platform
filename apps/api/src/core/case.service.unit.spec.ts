import { NotFoundException } from '@nestjs/common';
import { CaseSeverity, CaseStatus, CaseType, DomainEvent } from '@sahayak/shared-constants';
import { CaseService } from './case.service';
import { GuestAccessService } from './guest-access.service';

describe('CaseService (unit)', () => {
  const created = {
    id: 'case-1',
    caseNumber: 'HCC-2026-0000001',
    status: CaseStatus.INITIATED,
    severity: CaseSeverity.CRITICAL,
  };

  function build(overrides: {
    execute?: jest.Mock;
    assertCanCreateRequest?: jest.Mock;
  } = {}) {
    const tx = {
      case: { create: jest.fn().mockResolvedValue(created) },
      caseTimelineEvent: { create: jest.fn().mockResolvedValue({}) },
      $queryRaw: jest.fn().mockResolvedValue([{ nextval: 1n }]),
    };
    const prisma = {
      $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
      case: {
        findUnique: jest.fn(),
      },
      caseTimelineEvent: {
        create: jest.fn().mockResolvedValue({ id: 'evt-1' }),
        findMany: jest.fn().mockResolvedValue([{ id: 'evt-1' }]),
      },
    };
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const events = { publish: jest.fn() };
    const guestAccess = {
      assertCanCreateRequest: overrides.assertCanCreateRequest ?? jest.fn().mockResolvedValue(undefined),
    };
    const ai = {
      execute: overrides.execute ?? jest.fn().mockResolvedValue({ value: { severity: CaseSeverity.CRITICAL } }),
    };
    const service = new CaseService(
      prisma as never,
      audit as never,
      events as never,
      guestAccess as never,
      ai as never,
    );
    return { service, prisma, audit, events, guestAccess, ai, tx };
  }

  it('createGuestCase asserts device limit then creates case with AI severity', async () => {
    const { service, guestAccess, events } = build();
    const result = await service.createGuestCase({
      deviceId: 'dev-1',
      initialPayload: { triageHint: 'chest pain', triage: { isConscious: false } },
    });
    expect(guestAccess.assertCanCreateRequest).toHaveBeenCalledWith('dev-1');
    expect(result.id).toBe('case-1');
    expect(events.publish).toHaveBeenCalledWith(DomainEvent.CASE_CREATED, expect.any(Object));
    expect(events.publish).toHaveBeenCalledWith(
      DomainEvent.CASE_SEVERITY_CLASSIFIED,
      expect.objectContaining({ severity: CaseSeverity.CRITICAL }),
    );
  });

  it('createCase falls back when AI returns invalid severity', async () => {
    const { service, ai } = build({
      execute: jest.fn().mockResolvedValue({ value: { severity: 'NOPE' } }),
    });
    await service.createCase({
      actor: 'u1',
      initiatorId: 'u1',
      caseType: CaseType.EMERGENCY,
      initialPayload: { symptoms: 'unconscious not breathing' },
    });
    expect(ai.execute).toHaveBeenCalled();
  });

  it('createCase uses provided severity without AI when set', async () => {
    const { service, ai, events } = build();
    await service.createCase({
      actor: 'u1',
      initiatorId: 'u1',
      severity: CaseSeverity.ROUTINE,
    });
    // classifySeverity still not called when severity provided — execute should not run
    expect(ai.execute).not.toHaveBeenCalled();
    expect(events.publish).toHaveBeenCalledWith(
      DomainEvent.CASE_SEVERITY_CLASSIFIED,
      expect.objectContaining({ severity: CaseSeverity.ROUTINE }),
    );
  });

  it('getCaseSeverity returns the case severity, or null when the case is missing', async () => {
    const { service, prisma } = build();
    prisma.case.findUnique.mockResolvedValueOnce(created);
    await expect(service.getCaseSeverity('case-1')).resolves.toBe(CaseSeverity.CRITICAL);

    prisma.case.findUnique.mockResolvedValueOnce(null);
    await expect(service.getCaseSeverity('missing')).resolves.toBeNull();
  });

  it('appendTimelineEvent throws when case missing', async () => {
    const { service, prisma } = build();
    prisma.case.findUnique.mockResolvedValue(null);
    await expect(service.appendTimelineEvent('missing', 'x', {})).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('appendTimelineEvent and getTimeline happy paths', async () => {
    const { service, prisma } = build();
    prisma.case.findUnique.mockResolvedValue(created);
    await service.appendTimelineEvent('case-1', 'note', { a: 1 });
    expect(prisma.caseTimelineEvent.create).toHaveBeenCalled();
    await service.getTimeline('case-1');
    expect(prisma.caseTimelineEvent.findMany).toHaveBeenCalledWith({
      where: { caseId: 'case-1' },
      orderBy: { createdAt: 'asc' },
    });
  });

  it('extracts triage text from answers and flags', async () => {
    const { service } = build({
      execute: jest.fn().mockImplementation(async ({ input, fallback }) => {
        expect(String(input.text)).toMatch(/unconscious|severe bleeding|answer/);
        return { value: { severity: fallback().severity } };
      }),
    });
    await service.createCase({
      actor: 'u1',
      initiatorId: 'u1',
      initialPayload: {
        triage: { isConscious: false, isBreathing: false, hasVisibleBleeding: true },
        answers: ['answer-one', { q: 1 }],
        notes: '  note  ',
      },
    });
  });

  it('guest initiator id format', () => {
    expect(GuestAccessService.guestInitiatorId('abc')).toBe('guest:abc');
  });
});
