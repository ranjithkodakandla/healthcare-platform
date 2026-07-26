import { Injectable } from '@nestjs/common';
import { ConsentGrant } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

export interface GrantConsentInput {
  granterId: string;
  granteeId: string;
  purpose: string;
  caseId?: string;
  scope?: Record<string, unknown>;
}

// Part I1: "a Consent Service issuing scoped, revocable, auditable consent artifacts
// for every purpose named across this document ... one service, many purpose-scoped
// consumers" — the privacy analogue of Appendix C2's resource-coordination-engine
// principle. Every grant/revoke is audited (GT-07).
@Injectable()
export class ConsentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async grant(input: GrantConsentInput): Promise<ConsentGrant> {
    return this.prisma.$transaction(async (tx) => {
      const grant = await tx.consentGrant.create({
        data: {
          granterId: input.granterId,
          granteeId: input.granteeId,
          purpose: input.purpose,
          caseId: input.caseId,
          scope: input.scope as never,
        },
      });

      await this.audit.record(
        {
          actor: input.granterId,
          action: 'CONSENT_GRANTED',
          entityType: 'ConsentGrant',
          entityId: grant.id,
          metadata: { granteeId: input.granteeId, purpose: input.purpose },
        },
        tx,
      );

      return grant;
    });
  }

  async revoke(consentGrantId: string, actor: string): Promise<ConsentGrant> {
    return this.prisma.$transaction(async (tx) => {
      const revoked = await tx.consentGrant.update({
        where: { id: consentGrantId },
        data: { revokedAt: new Date() },
      });

      await this.audit.record(
        { actor, action: 'CONSENT_REVOKED', entityType: 'ConsentGrant', entityId: consentGrantId },
        tx,
      );

      return revoked;
    });
  }

  // Purpose-limitation check (I3): "a query without a matching declared purpose is
  // rejected" — modules call this before serving data for a given purpose/grantee.
  async isGranted(granterId: string, granteeId: string, purpose: string): Promise<boolean> {
    const grant = await this.prisma.consentGrant.findFirst({
      where: { granterId, granteeId, purpose, revokedAt: null },
      orderBy: { grantedAt: 'desc' },
    });
    return grant !== null;
  }
}
