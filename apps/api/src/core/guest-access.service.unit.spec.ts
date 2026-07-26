import { ForbiddenException } from '@nestjs/common';
import { GuestAccessService } from './guest-access.service';

describe('GuestAccessService (unit)', () => {
  it('allows when no active cases and blocks when active', async () => {
    const prisma = { case: { count: jest.fn().mockResolvedValue(0) } };
    const service = new GuestAccessService(prisma as never);
    await expect(service.assertCanCreateRequest('d1')).resolves.toBeUndefined();
    prisma.case.count.mockResolvedValue(1);
    await expect(service.assertCanCreateRequest('d1')).rejects.toBeInstanceOf(ForbiddenException);
  });
});
