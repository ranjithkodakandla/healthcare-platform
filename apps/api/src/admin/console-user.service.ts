import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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
  ) {}

  async createConsoleUser(input: CreateConsoleUserInput): Promise<ConsoleUser> {
    const email = assertValidConsoleEmail(input.email);
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.consoleUser.create({
        data: { email, role: input.role, firebaseUid: input.firebaseUid },
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

    return updated;
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
