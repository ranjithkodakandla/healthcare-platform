import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/** Append-only audit trail — DPDP / CERT-In accountability. */
function assertAuditImmutable(params: { model?: string; action: string }) {
  if (params.model === 'AuditLog' && (params.action === 'update' || params.action === 'delete')) {
    throw new Error('AuditLog is immutable: updates and deletes are forbidden');
  }
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super();
    this.$use(async (params, next) => {
      assertAuditImmutable(params);
      return next(params);
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
