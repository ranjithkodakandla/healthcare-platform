import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProviderApplication } from '@prisma/client';
import * as admin from 'firebase-admin';
import {
  ERROR_CODES,
  OnboardingStage,
  OnboardingStageStatus,
  ProviderType,
  Role,
} from '@sahayak/shared-constants';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../shared-services/audit/audit.service';
import { getFirebaseAdminApp } from '../shared-services/auth/firebase-admin.app';

const STAGE_ORDER: OnboardingStage[] = [
  OnboardingStage.APPLICATION_INTAKE,
  OnboardingStage.CREDENTIAL_VERIFICATION,
  OnboardingStage.INTEGRATION_TEST,
  OnboardingStage.GO_LIVE_APPROVAL,
  OnboardingStage.PORTAL_ACCESS_ACTIVATED,
];

export interface CreateProviderApplicationInput {
  providerType: ProviderType;
  legalName: string;
  actor: string;
  orgId?: string;
  portalEmail?: string;
  portalPassword?: string;
  city?: string;
}

export interface CompleteStageInput {
  applicationId: string;
  stage: OnboardingStage;
  reviewerId: string;
  notes?: string;
}

@Injectable()
export class ProviderOnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  async createApplication(input: CreateProviderApplicationInput): Promise<ProviderApplication> {
    const wantsCreds = Boolean(input.portalEmail || input.portalPassword || input.orgId);
    if (wantsCreds) {
      if (!input.orgId?.trim() || !input.portalEmail?.trim() || !input.portalPassword) {
        throw new BadRequestException(
          'orgId, portalEmail, and portalPassword are required together to set provider credentials',
        );
      }
      if (input.portalPassword.length < 8) {
        throw new BadRequestException('portalPassword must be at least 8 characters');
      }
    }

    const application = await this.prisma.$transaction(async (tx) => {
      const created = await tx.providerApplication.create({
        data: {
          providerType: input.providerType,
          legalName: input.legalName,
          orgId: input.orgId?.trim() || null,
          portalEmail: input.portalEmail?.trim().toLowerCase() || null,
        },
      });

      await tx.providerOnboardingStage.createMany({
        data: STAGE_ORDER.map((stage) => ({ applicationId: created.id, stage })),
      });

      if (input.providerType === ProviderType.HOSPITAL && input.orgId?.trim()) {
        const orgId = input.orgId.trim();
        const existing = await tx.hospitalRegistry.findUnique({ where: { hospitalId: orgId } });
        if (!existing) {
          await tx.hospitalRegistry.create({
            data: {
              hospitalId: orgId,
              name: input.legalName,
              address: 'To be confirmed',
              city: input.city?.trim() || 'Bengaluru',
              state: 'KA',
              lat: 12.9716,
              lng: 77.5946,
            },
          });
        }
      }

      await this.audit.record(
        {
          actor: input.actor,
          action: 'PROVIDER_APPLICATION_CREATED',
          entityType: 'ProviderApplication',
          entityId: created.id,
          metadata: {
            providerType: input.providerType,
            orgId: input.orgId ?? null,
            portalEmail: input.portalEmail ?? null,
          },
        },
        tx,
      );

      return created;
    });

    if (wantsCreds) {
      await this.provisionPortalLogin({
        orgId: input.orgId!.trim(),
        email: input.portalEmail!.trim().toLowerCase(),
        password: input.portalPassword!,
        displayName: input.legalName,
        actor: input.actor,
        applicationId: application.id,
      });
    }

    return application;
  }

  async completeStage(input: CompleteStageInput & { checklistComplete?: boolean }): Promise<void> {
    const stageIndex = STAGE_ORDER.indexOf(input.stage);

    await this.prisma.$transaction(async (tx) => {
      const allStages = await tx.providerOnboardingStage.findMany({
        where: { applicationId: input.applicationId },
      });

      if (allStages.length === 0) {
        throw new NotFoundException(`ProviderApplication ${input.applicationId} not found`);
      }

      if (allStages.some((s) => s.status === OnboardingStageStatus.REJECTED)) {
        throw new BadRequestException('Application was rejected and cannot be advanced');
      }

      const stageRow = allStages.find((s) => s.stage === input.stage);
      if (!stageRow) {
        throw new NotFoundException(`Stage ${input.stage} not found on this application`);
      }
      if (stageRow.status === OnboardingStageStatus.COMPLETE) {
        throw new BadRequestException({
          code: ERROR_CODES.ONBOARDING_STAGE_ALREADY_COMPLETE,
          message: `Stage ${input.stage} is already complete`,
        });
      }

      if (
        input.stage === OnboardingStage.CREDENTIAL_VERIFICATION &&
        input.checklistComplete !== true
      ) {
        throw new BadRequestException(
          'Credential checklist must be completed before advancing CREDENTIAL_VERIFICATION',
        );
      }

      const priorStages = STAGE_ORDER.slice(0, stageIndex);
      const incompletePrior = priorStages.filter((prior) => {
        const row = allStages.find((s) => s.stage === prior);
        return row?.status !== OnboardingStageStatus.COMPLETE;
      });

      if (incompletePrior.length > 0) {
        throw new BadRequestException({
          code: ERROR_CODES.ONBOARDING_STAGE_OUT_OF_ORDER,
          message: `Cannot complete ${input.stage} before completing: ${incompletePrior.join(', ')}`,
        });
      }

      await tx.providerOnboardingStage.update({
        where: { id: stageRow.id },
        data: {
          status: OnboardingStageStatus.COMPLETE,
          reviewerId: input.reviewerId,
          notes: input.notes,
          completedAt: new Date(),
        },
      });

      await tx.providerApplication.update({
        where: { id: input.applicationId },
        data: { status: input.stage },
      });

      await this.audit.record(
        {
          actor: input.reviewerId,
          action: 'PROVIDER_ONBOARDING_STAGE_COMPLETED',
          entityType: 'ProviderApplication',
          entityId: input.applicationId,
          metadata: { stage: input.stage },
        },
        tx,
      );
    });
  }

  async rejectApplication(input: {
    applicationId: string;
    reviewerId: string;
    notes?: string;
  }): Promise<ProviderApplication> {
    return this.prisma.$transaction(async (tx) => {
      const application = await tx.providerApplication.findUnique({
        where: { id: input.applicationId },
        include: { stages: true },
      });
      if (!application) {
        throw new NotFoundException(`ProviderApplication ${input.applicationId} not found`);
      }
      if (application.status === 'REJECTED') {
        throw new BadRequestException('Application is already rejected');
      }

      const pending = STAGE_ORDER.map((stage) => application.stages.find((s) => s.stage === stage)).find(
        (s) => s && s.status === OnboardingStageStatus.PENDING,
      );
      if (pending) {
        await tx.providerOnboardingStage.update({
          where: { id: pending.id },
          data: {
            status: OnboardingStageStatus.REJECTED,
            reviewerId: input.reviewerId,
            notes: input.notes ?? 'Rejected by console admin',
            completedAt: new Date(),
          },
        });
      }

      const updated = await tx.providerApplication.update({
        where: { id: input.applicationId },
        data: { status: 'REJECTED' },
      });

      await this.audit.record(
        {
          actor: input.reviewerId,
          action: 'PROVIDER_APPLICATION_REJECTED',
          entityType: 'ProviderApplication',
          entityId: input.applicationId,
          metadata: { notes: input.notes ?? null },
        },
        tx,
      );

      return updated;
    });
  }

  async isPortalLive(applicationId: string): Promise<boolean> {
    const stages = await this.prisma.providerOnboardingStage.findMany({
      where: { applicationId },
    });

    if (stages.length !== STAGE_ORDER.length) return false;
    return stages.every((s) => s.status === OnboardingStageStatus.COMPLETE);
  }

  async getApplication(applicationId: string) {
    const application = await this.prisma.providerApplication.findUnique({
      where: { id: applicationId },
      include: { stages: true },
    });

    if (!application) {
      throw new NotFoundException(`ProviderApplication ${applicationId} not found`);
    }

    return application;
  }

  /** First incomplete stage in order, or null if all complete / rejected. */
  nextPendingStage(stages: Array<{ stage: string; status: string }>): OnboardingStage | null {
    if (stages.some((s) => s.status === OnboardingStageStatus.REJECTED)) return null;
    for (const stage of STAGE_ORDER) {
      const row = stages.find((s) => s.stage === stage);
      if (!row || row.status !== OnboardingStageStatus.COMPLETE) return stage;
    }
    return null;
  }

  credentialChecklist(providerType: string): Array<{ key: string; label: string }> {
    const base = [
      { key: 'legal_entity', label: 'Legal entity name matches registration' },
      { key: 'contact_verified', label: 'Primary contact reachable' },
    ];
    if (providerType === ProviderType.HOSPITAL || providerType === 'HOSPITAL') {
      return [
        ...base,
        { key: 'nabh', label: 'NABH / facility accreditation reviewed' },
        { key: 'reg_cert', label: 'Hospital registration certificate reviewed' },
        { key: 'facility', label: 'Facility photos / address verified' },
      ];
    }
    return [
      ...base,
      { key: 'license', label: 'Professional / operating license reviewed' },
      { key: 'identity', label: 'Identity / KYC documents reviewed' },
    ];
  }

  listVerificationDocuments(application: ProviderApplication): Array<{
    key: string;
    name: string;
    contentType: string;
  }> {
    const type = application.providerType;
    if (type === ProviderType.HOSPITAL || type === 'HOSPITAL') {
      return [
        { key: 'nabh', name: 'NABH_Certificate.pdf', contentType: 'application/pdf' },
        { key: 'registration', name: 'Registration_Cert.pdf', contentType: 'application/pdf' },
        { key: 'facility', name: 'Facility_Photos.pdf', contentType: 'application/pdf' },
      ];
    }
    return [
      { key: 'license', name: 'Operating_License.pdf', contentType: 'application/pdf' },
      { key: 'identity', name: 'Identity_KYC.pdf', contentType: 'application/pdf' },
    ];
  }

  async getVerificationDocument(
    applicationId: string,
    docKey: string,
  ): Promise<{ filename: string; body: Buffer }> {
    const application = await this.getApplication(applicationId);
    const docs = this.listVerificationDocuments(application);
    const doc = docs.find((d) => d.key === docKey);
    if (!doc) throw new NotFoundException(`Document ${docKey} not found`);

    // Minimal valid PDF so reviewers can download evidence placeholders until
    // real object storage is wired for uploaded credentials.
    const text = [
      '%PDF-1.1',
      '1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj',
      '2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj',
      '3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792]',
      '/Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj',
      '4 0 obj<< /Length 88 >>stream',
      'BT /F1 12 Tf 72 720 Td (Sahayak verification document) Tj T*',
      `(${application.legalName} / ${doc.name}) Tj ET`,
      'endstream endobj',
      '5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj',
      'xref',
      '0 6',
      '0000000000 65535 f ',
      'trailer<< /Size 6 /Root 1 0 R >>',
      'startxref',
      '0',
      '%%EOF',
    ].join('\n');

    return { filename: doc.name, body: Buffer.from(text, 'utf8') };
  }

  private async provisionPortalLogin(input: {
    orgId: string;
    email: string;
    password: string;
    displayName: string;
    actor: string;
    applicationId: string;
  }): Promise<void> {
    let app: admin.app.App;
    try {
      app = getFirebaseAdminApp(this.config);
    } catch {
      throw new ServiceUnavailableException(
        'Firebase is not configured — cannot create provider portal credentials',
      );
    }

    const auth = admin.auth(app);
    let uid: string;
    try {
      const existing = await auth.getUserByEmail(input.email);
      uid = existing.uid;
      await auth.updateUser(uid, {
        password: input.password,
        displayName: input.displayName,
        emailVerified: true,
        disabled: false,
      });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code !== 'auth/user-not-found') throw err;
      const created = await auth.createUser({
        email: input.email,
        password: input.password,
        displayName: input.displayName,
        emailVerified: true,
      });
      uid = created.uid;
    }

    await auth.setCustomUserClaims(uid, {
      role: Role.PROVIDER_STAFF,
      orgId: input.orgId,
      hospitalPortalRole: 'HOSPITAL_ADMINISTRATOR',
    });

    await this.audit.record({
      actor: input.actor,
      action: 'PROVIDER_PORTAL_CREDENTIALS_PROVISIONED',
      entityType: 'ProviderApplication',
      entityId: input.applicationId,
      metadata: { email: input.email, orgId: input.orgId, firebaseUid: uid },
    });
  }
}
