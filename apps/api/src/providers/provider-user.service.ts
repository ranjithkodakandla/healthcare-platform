import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { ProviderType, Role } from '@sahayak/shared-constants';
import { getFirebaseAdminApp } from '../shared-services/auth/firebase-admin.app';
import { AuditService } from '../shared-services/audit/audit.service';
import { InviteProviderUserDto } from './dto/invite-provider-user.dto';

export interface InvitedProviderUser {
  uid: string;
  name: string;
  email: string;
  role: string;
  passwordResetLink: string;
}

// P-10: "+ Add user" (F3.6). Provisions a real Firebase Auth account for the new staff
// member and stamps it with the same custom claims (`role`, `orgId`, `providerType`)
// FirebaseAuthProvider reads on every subsequent login — this is the one place those
// claims are written today, matching the platform's existing claims-based identity
// model rather than introducing a parallel one (see auth-provider.interface.ts).
@Injectable()
export class ProviderUserService {
  constructor(
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  async inviteUser(
    hospitalId: string,
    dto: InviteProviderUserDto,
    actorUid: string,
  ): Promise<InvitedProviderUser> {
    const app = getFirebaseAdminApp(this.config);
    const auth = admin.auth(app);

    let userRecord: admin.auth.UserRecord;
    try {
      userRecord = await auth.createUser({ email: dto.email, displayName: dto.name });
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === 'auth/email-already-exists') {
        throw new BadRequestException(
          `PROVIDER_USER_EMAIL_EXISTS: ${dto.email} is already registered`,
        );
      }
      throw err;
    }

    await auth.setCustomUserClaims(userRecord.uid, {
      role: Role.PROVIDER_STAFF,
      orgId: hospitalId,
      providerType: ProviderType.HOSPITAL,
      portalRole: dto.role,
    });

    const passwordResetLink = await auth.generatePasswordResetLink(dto.email);

    await this.audit.record({
      actor: actorUid,
      action: 'PROVIDER_USER_INVITED',
      entityType: 'HospitalStaffUser',
      entityId: userRecord.uid,
      metadata: { hospitalId, email: dto.email, role: dto.role },
    });

    return {
      uid: userRecord.uid,
      name: dto.name,
      email: dto.email,
      role: dto.role,
      passwordResetLink,
    };
  }
}
