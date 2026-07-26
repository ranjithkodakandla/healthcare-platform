import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Case, Prisma } from '@prisma/client';
import {
  AiCapability,
  CaseSeverity,
  CaseStatus,
  CaseType,
  DomainEvent,
} from '@sahayak/shared-constants';
import { PrismaService } from '../prisma/prisma.service';
import { AiPlatformClient } from '../shared-services/ai/ai-platform.client';
import { classifyTriage } from '../shared-services/ai/deterministic-ranking';
import { AuditService } from '../shared-services/audit/audit.service';
import { EVENT_PUBLISHER, EventPublisher } from '../shared-services/event-bus/event-publisher.interface';
import { GuestAccessService } from './guest-access.service';
import { sanitizeForAi } from '../shared-services/privacy/pii-sanitize.util';

export interface CreateCaseInput {
  actor: string;
  initiatorId: string;
  caseType?: CaseType;
  primaryPatientId?: string;
  location?: Record<string, unknown>;
  initialPayload?: Record<string, unknown>;
  severity?: CaseSeverity;
}

export interface CreateGuestCaseInput {
  deviceId: string;
  location?: Record<string, unknown>;
  initialPayload?: Record<string, unknown>;
}

// GT-01/GT-02: the Case object and its append-only Timeline. Every write here is
// audited and emits a domain event in the same transaction as the state change.
@Injectable()
export class CaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(EVENT_PUBLISHER) private readonly events: EventPublisher,
    private readonly guestAccess: GuestAccessService,
    private readonly ai: AiPlatformClient,
  ) {}

  // GT-10/BR-06: the guest/bystander entry point — no login required. Enforces
  // "exactly one active untracked request per device" before delegating to the same
  // createCase used by authenticated flows, so guest and registered cases share one
  // code path beyond the access check.
  async createGuestCase(input: CreateGuestCaseInput): Promise<Case> {
    await this.guestAccess.assertCanCreateRequest(input.deviceId);

    const initiatorId = GuestAccessService.guestInitiatorId(input.deviceId);
    const severity = await this.classifySeverity(input.initialPayload);
    return this.createCase({
      actor: initiatorId,
      initiatorId,
      location: input.location,
      initialPayload: input.initialPayload,
      severity,
    });
  }

  async createCase(input: CreateCaseInput): Promise<Case> {
    const severity =
      input.severity ?? (await this.classifySeverity(input.initialPayload));

    const created = await this.prisma.$transaction(async (tx) => {
      const caseNumber = await this.nextCaseNumber(tx);

      const kase = await tx.case.create({
        data: {
          caseNumber,
          caseType: input.caseType ?? CaseType.EMERGENCY,
          status: CaseStatus.INITIATED,
          severity,
          initiatorId: input.initiatorId,
          primaryPatientId: input.primaryPatientId,
          location: input.location as Prisma.InputJsonValue,
        },
      });

      await tx.caseTimelineEvent.create({
        data: {
          caseId: kase.id,
          type: DomainEvent.CASE_CREATED,
          payload: (input.initialPayload ?? {}) as Prisma.InputJsonValue,
        },
      });

      if (severity) {
        await tx.caseTimelineEvent.create({
          data: {
            caseId: kase.id,
            type: DomainEvent.CASE_SEVERITY_CLASSIFIED,
            payload: { severity } as Prisma.InputJsonValue,
          },
        });
      }

      await this.audit.record(
        {
          actor: input.actor,
          action: 'CASE_CREATED',
          entityType: 'Case',
          entityId: kase.id,
        },
        tx,
      );

      return kase;
    });

    this.events.publish(DomainEvent.CASE_CREATED, { caseId: created.id, caseNumber: created.caseNumber });
    if (severity) {
      this.events.publish(DomainEvent.CASE_SEVERITY_CLASSIFIED, {
        caseId: created.id,
        severity,
      });
    }
    return created;
  }

  // M8 TRIAGE_INTAKE — AI severity with keyword fallback (C-05 / <2s target via AI_TIMEOUT_MS).
  private async classifySeverity(
    initialPayload?: Record<string, unknown>,
  ): Promise<CaseSeverity> {
    // DPDP: never send raw phone/email/free-text identifiers to third-party LLMs.
    const text = sanitizeForAi(this.extractTriageText(initialPayload));
    const { value } = await this.ai.execute<{ severity: CaseSeverity }>({
      capability: AiCapability.TRIAGE_INTAKE,
      input: { text },
      context: { source: 'case.create' },
      fallback: () => ({ severity: classifyTriage(text) }),
    });
    const allowed = Object.values(CaseSeverity) as string[];
    if (value?.severity && allowed.includes(value.severity)) {
      return value.severity;
    }
    return classifyTriage(text);
  }

  private extractTriageText(initialPayload?: Record<string, unknown>): string {
    if (!initialPayload) return '';
    const parts: string[] = [];
    for (const key of ['triageHint', 'rawBody', 'symptoms', 'notes', 'answerSummary']) {
      const v = initialPayload[key];
      if (typeof v === 'string' && v.trim()) parts.push(v.trim());
    }
    if (initialPayload.triage && typeof initialPayload.triage === 'object') {
      const t = initialPayload.triage as Record<string, unknown>;
      // Natural-language cues for NIM / keyword fallback (not clinical diagnosis).
      if (t.isConscious === false) parts.push('unconscious');
      if (t.isBreathing === false) parts.push('not breathing');
      if (t.hasVisibleBleeding === true) parts.push('severe bleeding trauma');
      parts.push(JSON.stringify(t));
    }
    if (Array.isArray(initialPayload.answers)) {
      parts.push(
        initialPayload.answers
          .map((a) => (typeof a === 'string' ? a : JSON.stringify(a)))
          .join(' '),
      );
    }
    return parts.join(' ').trim();
  }

  // Placeholder scheme per PRD Part A2 ("immutable, human-readable e.g.
  // HCC-DL-2026-0000481") — the PRD doesn't specify the state-code derivation rule,
  // so the state segment is omitted until that's defined (see Decision Log DL-006).
  private async nextCaseNumber(tx: Prisma.TransactionClient): Promise<string> {
    const [{ nextval }] = await tx.$queryRaw<Array<{ nextval: bigint }>>`
      SELECT nextval('core.case_number_seq')
    `;
    const year = new Date().getFullYear();
    return `HCC-${year}-${nextval.toString().padStart(7, '0')}`;
  }

  async appendTimelineEvent(caseId: string, type: string, payload: Record<string, unknown>) {
    const kase = await this.prisma.case.findUnique({ where: { id: caseId } });
    if (!kase) {
      throw new NotFoundException(`Case ${caseId} not found`);
    }

    return this.prisma.caseTimelineEvent.create({
      data: { caseId, type, payload: payload as Prisma.InputJsonValue },
    });
  }

  async getTimeline(caseId: string) {
    return this.prisma.caseTimelineEvent.findMany({
      where: { caseId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
