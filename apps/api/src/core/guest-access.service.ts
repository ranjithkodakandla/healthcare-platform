import { ForbiddenException, Injectable } from '@nestjs/common';
import { CaseStatus, ERROR_CODES } from '@sahayak/shared-constants';
import { PrismaService } from '../prisma/prisma.service';

const ACTIVE_CASE_STATUSES = [CaseStatus.INITIATED, CaseStatus.IN_PROGRESS, CaseStatus.STABILIZED];

// GT-10/BR-06: an unregistered/guest requester can create and track exactly one
// active request; a second concurrent request from the same device requires
// registration (phone OTP). Enforced server-side against the real Case table — never
// trusted from the client, since BR-06 exists specifically to prevent abuse.
@Injectable()
export class GuestAccessService {
  constructor(private readonly prisma: PrismaService) {}

  static guestInitiatorId(deviceId: string): string {
    return `guest:${deviceId}`;
  }

  async assertCanCreateRequest(deviceId: string): Promise<void> {
    const activeCount = await this.prisma.case.count({
      where: {
        initiatorId: GuestAccessService.guestInitiatorId(deviceId),
        status: { in: ACTIVE_CASE_STATUSES },
      },
    });

    if (activeCount > 0) {
      throw new ForbiddenException({
        code: ERROR_CODES.GUEST_ACTIVE_REQUEST_LIMIT_EXCEEDED,
        message:
          'This device already has an active guest request. Verify your phone number (OTP) to create another.',
      });
    }
  }
}
