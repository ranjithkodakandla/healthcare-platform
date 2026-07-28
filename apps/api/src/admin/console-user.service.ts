import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConsoleUser } from '@prisma/client';
import * as admin from 'firebase-admin';
import { ConsoleRole, Role } from '@sahayak/shared-constants';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../shared-services/audit/audit.service';
import { getFirebaseAdminApp } from '../shared-services/auth/firebase-admin.app';

export interface CreateConsoleUserInput {
  email: string;
  role: ConsoleRole;
  actor: string;
  firebaseUid?: string; // set once the user has actually logged in via Firebase (DL-007)
  /** Optional — provisions/resets a real Firebase login (with `Role.ADMIN` + `consoleRole` claims) in the same step. */
  password?: string;
}

/** Practical email check — reject access grants for malformed addresses. */
const CONSOLE_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

export function normalizeConsoleEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function assertValidConsoleEmail(email: string): string {
  const normalized = normalizeConsoleEmail(email);
  if (!normalized || !CONSOLE_EMAIL_RE.test(normalized)) {
    throw new BadRequestException('A valid email address is required');
  }
  return normalized;
}

// G9 minimal slice: "enough to create internal Console roles" (Phase 3 blocking
// scope per the Implementation Strategy) — the rest of G9 (deactivation, role
// changes, bulk management) is deferred alongside the rest of Admin Console.
@Injectable()
export class ConsoleUserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  async createConsoleUser(input: CreateConsoleUserInput): Promise<ConsoleUser> {
    const email = assertValidConsoleEmail(input.email);
    let firebaseUid = input.firebaseUid;

    if (input.password) {
      firebaseUid = await this.provisionConsoleLogin({
        email,
        password: input.password,
        consoleRole: input.role,
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.consoleUser.create({
        data: { email, role: input.role, firebaseUid },
      });

      await this.audit.record(
        {
          actor: input.actor,
          action: 'CONSOLE_USER_CREATED',
          entityType: 'ConsoleUser',
          entityId: user.id,
          metadata: { role: input.role, firebaseUid },
        },
        tx,
      );

      return user;
    });
  }

  // A-12: list console staff for User & Role Management screen.
  // Returns all ConsoleUser rows ordered by createdAt desc — no soft-delete yet
  // (deactivation deferred with the rest of G9 per Phase 3 scope note).
  async listConsoleUsers(): Promise<ConsoleUser[]> {
    return this.prisma.consoleUser.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async updateConsoleUser(input: {
    id: string;
    role?: ConsoleRole;
    status?: 'ACTIVE' | 'DEACTIVATED';
    actor: string;
  }): Promise<ConsoleUser> {
    if (input.role == null && input.status == null) {
      throw new BadRequestException('role or status is required');
    }
    if (input.status && !['ACTIVE', 'DEACTIVATED'].includes(input.status)) {
      throw new BadRequestException('status must be ACTIVE or DEACTIVATED');
    }

    const existing = await this.prisma.consoleUser.findUnique({ where: { id: input.id } });
    if (!existing) throw new NotFoundException(`ConsoleUser ${input.id} not found`);

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.consoleUser.update({
        where: { id: input.id },
        data: {
          ...(input.role != null ? { role: input.role } : {}),
          ...(input.status != null ? { status: input.status } : {}),
        },
      });
      await this.audit.record(
        {
          actor: input.actor,
          action: 'CONSOLE_USER_UPDATED',
          entityType: 'ConsoleUser',
          entityId: row.id,
          metadata: {
            from: { role: existing.role, status: existing.status },
            to: { role: row.role, status: row.status },
          },
        },
        tx,
      );
      return row;
    });

    // Keep the Firebase claim in sync so a role change (or reactivation) takes
    // effect on the account's next token refresh, not just in the ConsoleUser row.
    if (updated.firebaseUid && input.role != null) {
      const auth = this.getFirebaseAuth();
      await this.stampConsoleClaims(auth, updated.firebaseUid, updated.role as ConsoleRole);
    }

    return updated;
  }

  // Re-stamps `{ role: Role.ADMIN, consoleRole }` Firebase custom claims for an
  // existing console user without touching their password — the fix path for
  // accounts created before claim-stamping existed, or any other claims drift.
  // Mirrors ProviderOnboardingService.resyncPortalClaims.
  async resyncConsoleClaims(id: string, actor: string): Promise<{ email: string; firebaseUid: string }> {
    const user = await this.prisma.consoleUser.findUnique({ where: { id } });
    if (!user) throw new NotFoundException(`ConsoleUser ${id} not found`);

    const auth = this.getFirebaseAuth();
    let firebaseUid = user.firebaseUid;
    if (!firebaseUid) {
      const record = await auth.getUserByEmail(user.email);
      firebaseUid = record.uid;
      await this.prisma.consoleUser.update({ where: { id }, data: { firebaseUid } });
    }

    await this.stampConsoleClaims(auth, firebaseUid, user.role as ConsoleRole);

    await this.audit.record({
      actor,
      action: 'CONSOLE_USER_CLAIMS_RESYNCED',
      entityType: 'ConsoleUser',
      entityId: id,
      metadata: { email: user.email, firebaseUid },
    });

    return { email: user.email, firebaseUid };
  }

  private getFirebaseAuth(): admin.auth.Auth {
    try {
      return admin.auth(getFirebaseAdminApp(this.config));
    } catch {
      throw new ServiceUnavailableException('Firebase is not configured — cannot manage console user credentials');
    }
  }

  private async stampConsoleClaims(
    auth: admin.auth.Auth,
    uid: string,
    consoleRole: ConsoleRole,
  ): Promise<void> {
    // `Role.ADMIN` is what RolesGuard's class-level `@Roles(Role.ADMIN)` on
    // AdminController/AdminStatsController checks; `consoleRole` is read by
    // requireConsoleRole's DB lookup (kept as a claim too for debuggability).
    await auth.setCustomUserClaims(uid, { role: Role.ADMIN, consoleRole });
  }

  private async provisionConsoleLogin(input: {
    email: string;
    password: string;
    consoleRole: ConsoleRole;
  }): Promise<string> {
    const auth = this.getFirebaseAuth();
    let uid: string;
    try {
      const existing = await auth.getUserByEmail(input.email);
      uid = existing.uid;
      await auth.updateUser(uid, { password: input.password, emailVerified: true, disabled: false });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code !== 'auth/user-not-found') throw err;
      const created = await auth.createUser({
        email: input.email,
        password: input.password,
        emailVerified: true,
      });
      uid = created.uid;
    }

    await this.stampConsoleClaims(auth, uid, input.consoleRole);
    return uid;
  }

  // I7 ABAC layer: "attribute-based rules atop RBAC where role alone is
  // insufficient." Phase 2's `RolesGuard` only knows the platform-wide `Role` enum
  // (e.g. `Role.ADMIN`) — it can gate "is this an authenticated Console user at all"
  // but not "which specific Console action can they perform" (G9's distinct role
  // catalogue). This is the second-layer check every Admin Console write endpoint
  // calls after `RolesGuard` passes. Deliberately keyed by `firebaseUid` — once
  // Phase 2's live auth is unblocked (DL-007), `request.user.uid` from
  // `AuthGuard`/`AuthProvider` is what's passed in here.
  async requireConsoleRole(firebaseUid: string, allowed: ConsoleRole[]): Promise<ConsoleUser> {
    const user = await this.prisma.consoleUser.findUnique({ where: { firebaseUid } });

    if (!user || user.status === 'DEACTIVATED' || !allowed.includes(user.role as ConsoleRole)) {
      throw new ForbiddenException(`Requires one of Console roles: ${allowed.join(', ')}`);
    }

    return user;
  }
}
