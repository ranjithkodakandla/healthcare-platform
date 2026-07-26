import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CaseStatus } from '@sahayak/shared-constants';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ConsentService } from '../consent/consent.service';
import { redactLocationJson } from './pii-sanitize.util';
import {
  ConsentPurpose,
  DEFAULT_RETENTION,
  PLATFORM_GRANTEE,
  PRIVACY_POLICY_VERSION,
  RetentionPolicy,
  TERMS_VERSION,
} from './retention.policy';

@Injectable()
export class PrivacyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly consent: ConsentService,
  ) {}

  async getRetentionPolicy(): Promise<RetentionPolicy> {
    const rows = await this.prisma.platformConfig.findMany({
      where: { groupKey: 'retention' },
    });
    const map = Object.fromEntries(rows.map((r) => [r.label, r.value]));
    return {
      locationPreciseDays: Number(map.locationPreciseDays ?? DEFAULT_RETENTION.locationPreciseDays),
      applicationLogDays: Number(map.applicationLogDays ?? DEFAULT_RETENTION.applicationLogDays),
      aiMetadataDays: Number(map.aiMetadataDays ?? DEFAULT_RETENTION.aiMetadataDays),
      guestDeviceDays: Number(map.guestDeviceDays ?? DEFAULT_RETENTION.guestDeviceDays),
      supportTicketDays: Number(map.supportTicketDays ?? DEFAULT_RETENTION.supportTicketDays),
    };
  }

  async ensureRetentionDefaults(): Promise<void> {
    for (const [label, value] of Object.entries(DEFAULT_RETENTION)) {
      await this.prisma.platformConfig.upsert({
        where: { groupKey_label: { groupKey: 'retention', label } },
        create: {
          groupKey: 'retention',
          label,
          value: String(value),
        },
        update: {},
      });
    }
  }

  async acceptPolicies(
    uid: string,
    input: { privacyPolicy?: boolean; terms?: boolean; emergencyProcessing?: boolean },
  ) {
    const accepted: string[] = [];
    if (input.privacyPolicy) {
      await this.consent.grant({
        granterId: uid,
        granteeId: PLATFORM_GRANTEE,
        purpose: ConsentPurpose.PRIVACY_POLICY,
        scope: { version: PRIVACY_POLICY_VERSION, acceptedAt: new Date().toISOString() },
      });
      accepted.push(ConsentPurpose.PRIVACY_POLICY);
    }
    if (input.terms) {
      await this.consent.grant({
        granterId: uid,
        granteeId: PLATFORM_GRANTEE,
        purpose: ConsentPurpose.TERMS_OF_SERVICE,
        scope: { version: TERMS_VERSION, acceptedAt: new Date().toISOString() },
      });
      accepted.push(ConsentPurpose.TERMS_OF_SERVICE);
    }
    if (input.emergencyProcessing) {
      await this.consent.grant({
        granterId: uid,
        granteeId: PLATFORM_GRANTEE,
        purpose: ConsentPurpose.EMERGENCY_PROCESSING,
        scope: { note: 'Legitimate use for emergency coordination' },
      });
      accepted.push(ConsentPurpose.EMERGENCY_PROCESSING);
    }
    return {
      accepted,
      privacyPolicyVersion: PRIVACY_POLICY_VERSION,
      termsVersion: TERMS_VERSION,
    };
  }

  async listConsents(uid: string) {
    return this.prisma.consentGrant.findMany({
      where: { granterId: uid },
      orderBy: { grantedAt: 'desc' },
      take: 100,
    });
  }

  async revokeConsent(uid: string, consentGrantId: string) {
    const grant = await this.prisma.consentGrant.findUnique({ where: { id: consentGrantId } });
    if (!grant || grant.granterId !== uid) {
      throw new NotFoundException('Consent grant not found');
    }
    if (grant.revokedAt) return grant;
    return this.consent.revoke(consentGrantId, uid);
  }

  async exportMyData(uid: string) {
    const [consents, casesAsInitiator, casesAsPatient, audit] = await Promise.all([
      this.listConsents(uid),
      this.prisma.case.findMany({
        where: { initiatorId: uid },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      this.prisma.case.findMany({
        where: { primaryPatientId: uid },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      this.prisma.auditLog.findMany({
        where: { actor: uid },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    ]);

    await this.audit.record({
      actor: uid,
      action: 'DATA_EXPORT',
      entityType: 'PrivacyExport',
      entityId: uid,
      metadata: {
        consents: consents.length,
        cases: casesAsInitiator.length + casesAsPatient.length,
      },
    });

    return {
      exportedAt: new Date().toISOString(),
      subjectId: uid,
      privacyPolicyVersion: PRIVACY_POLICY_VERSION,
      termsVersion: TERMS_VERSION,
      consents,
      cases: [...casesAsInitiator, ...casesAsPatient],
      auditTrail: audit.map((a) => ({
        action: a.action,
        entityType: a.entityType,
        entityId: a.entityId,
        createdAt: a.createdAt,
        // Omit raw metadata that may contain unnecessary PII copies
        metadataKeys: a.metadata && typeof a.metadata === 'object' ? Object.keys(a.metadata as object) : [],
      })),
      notice:
        'This export is provided under DPDP 2023 data principal rights. Do not share outside secure channels.',
    };
  }

  async getMyDataSummary(uid: string) {
    const [consentCount, caseCount, deactivated] = await Promise.all([
      this.prisma.consentGrant.count({ where: { granterId: uid, revokedAt: null } }),
      this.prisma.case.count({
        where: { OR: [{ initiatorId: uid }, { primaryPatientId: uid }] },
      }),
      this.consent.isGranted(uid, PLATFORM_GRANTEE, ConsentPurpose.ACCOUNT_DEACTIVATED),
    ]);
    return {
      subjectId: uid,
      activeConsents: consentCount,
      linkedCases: caseCount,
      accountDeactivated: deactivated,
      privacyPolicyVersion: PRIVACY_POLICY_VERSION,
      termsVersion: TERMS_VERSION,
      rights: [
        'view',
        'export',
        'correct_profile_client',
        'withdraw_consent',
        'erasure_request',
        'deactivate',
      ],
    };
  }

  /**
   * DPDP erasure / deactivation:
   * - Revoke platform consents
   * - Anonymize location on subject's cases (timeline kept for care continuity / legal holds)
   * - Mark ACCOUNT_DEACTIVATED
   * Does not hard-delete immutable timeline events (GT-02); PII in payloads is redacted where owned.
   */
  async requestErasure(uid: string, reason?: string) {
    if (await this.consent.isGranted(uid, PLATFORM_GRANTEE, ConsentPurpose.ACCOUNT_DEACTIVATED)) {
      throw new ForbiddenException('Account already deactivated / erasure completed');
    }

    const cases = await this.prisma.case.findMany({
      where: { OR: [{ initiatorId: uid }, { primaryPatientId: uid }] },
    });

    await this.prisma.$transaction(async (tx) => {
      for (const kase of cases) {
        const loc =
          kase.location && typeof kase.location === 'object'
            ? redactLocationJson(kase.location as Record<string, unknown>)
            : { erased: true };
        await tx.case.update({
          where: { id: kase.id },
          data: {
            location: loc as never,
            // Keep case number for ops continuity; unlink direct identity where safe
            primaryPatientId:
              kase.primaryPatientId === uid ? `erased:${uid.slice(0, 8)}` : kase.primaryPatientId,
          },
        });
      }

      const active = await tx.consentGrant.findMany({
        where: { granterId: uid, revokedAt: null },
      });
      for (const g of active) {
        await tx.consentGrant.update({
          where: { id: g.id },
          data: { revokedAt: new Date() },
        });
      }
    });

    await this.consent.grant({
      granterId: uid,
      granteeId: PLATFORM_GRANTEE,
      purpose: ConsentPurpose.ACCOUNT_DEACTIVATED,
      scope: { reason: reason ?? 'user_requested', at: new Date().toISOString() },
    });

    await this.audit.record({
      actor: uid,
      action: 'DATA_ERASURE_COMPLETED',
      entityType: 'PrivacySubject',
      entityId: uid,
      metadata: { casesAffected: cases.length, reason: reason ?? 'user_requested' },
    });

    return {
      status: 'completed',
      casesAnonymized: cases.length,
      note:
        'Personal identifiers on your cases were anonymized. Immutable care timeline events are retained in redacted form for safety and legal obligations.',
    };
  }

  /** Coarsen precise locations on closed/cancelled cases older than retention window. */
  async applyLocationRetention(): Promise<number> {
    const policy = await this.getRetentionPolicy();
    const cutoff = new Date(Date.now() - policy.locationPreciseDays * 86_400_000);
    const closed = await this.prisma.case.findMany({
      where: {
        status: { in: [CaseStatus.CLOSED, CaseStatus.CANCELLED, CaseStatus.RESOLVED] },
        updatedAt: { lt: cutoff },
      },
      take: 200,
    });
    let updated = 0;
    for (const kase of closed) {
      const loc = kase.location as Record<string, unknown> | null;
      if (!loc || loc.precision === 'coarse' || loc.erased === true) continue;
      await this.prisma.case.update({
        where: { id: kase.id },
        data: { location: redactLocationJson(loc) as never },
      });
      updated += 1;
    }
    if (updated > 0) {
      await this.audit.record({
        actor: 'system:retention-job',
        action: 'LOCATION_RETENTION_APPLIED',
        entityType: 'RetentionJob',
        entityId: new Date().toISOString().slice(0, 10),
        metadata: { updated },
      });
    }
    return updated;
  }
}
