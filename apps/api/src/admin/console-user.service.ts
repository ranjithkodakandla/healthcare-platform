import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConsoleUser } from '@prisma/client';
import { ConsoleRole } from '@sahayak/shared-constants';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../shared-services/audit/audit.service';

export interface CreateConsoleUserInput {
  email: string;
  role: ConsoleRole;
  actor: string;
  firebaseUid?: string; // set once the user has actually logged in via Firebase (DL-007)
}

// G9 minimal slice: "enough to create internal Console roles" (Phase 3 blocking
// scope per the Implementation Strategy) — the rest of G9 (deactivation, role
// changes, bulk management) is deferred alongside the rest of Admin Console.
@Injectable()
export class ConsoleUserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async createConsoleUser(input: CreateConsoleUserInput): Promise<ConsoleUser> {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.consoleUser.create({
        data: { email: input.email, role: input.role, firebaseUid: input.firebaseUid },
      });

      await this.audit.record(
        {
          actor: input.actor,
          action: 'CONSOLE_USER_CREATED',
          entityType: 'ConsoleUser',
          entityId: user.id,
          metadata: { role: input.role },
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

    if (!user || !allowed.includes(user.role as ConsoleRole)) {
      throw new ForbiddenException(`Requires one of Console roles: ${allowed.join(', ')}`);
    }

    return user;
  }
}
