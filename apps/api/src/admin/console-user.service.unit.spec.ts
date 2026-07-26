import { ForbiddenException } from '@nestjs/common';
import { ConsoleRole } from '@sahayak/shared-constants';
import { ConsoleUserService } from './console-user.service';

describe('ConsoleUserService (unit)', () => {
  function build() {
    const tx = {
      consoleUser: { create: jest.fn().mockResolvedValue({ id: 'u1', role: ConsoleRole.SUPPORT_AGENT }) },
    };
    const prisma = {
      $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
      consoleUser: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
      },
    };
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    return { service: new ConsoleUserService(prisma as never, audit as never), prisma };
  }

  it('create list and requireConsoleRole', async () => {
    const { service, prisma } = build();
    await service.createConsoleUser({
      email: 'a@b.c',
      role: ConsoleRole.SUPPORT_AGENT,
      actor: 'admin',
      firebaseUid: 'fb1',
    });
    await service.listConsoleUsers();
    prisma.consoleUser.findUnique.mockResolvedValueOnce(null);
    await expect(
      service.requireConsoleRole('fb1', [ConsoleRole.SUPPORT_AGENT]),
    ).rejects.toBeInstanceOf(ForbiddenException);
    prisma.consoleUser.findUnique.mockResolvedValueOnce({
      id: 'u1',
      role: ConsoleRole.SUPPORT_AGENT,
    });
    await expect(
      service.requireConsoleRole('fb1', [ConsoleRole.SUPPORT_AGENT]),
    ).resolves.toEqual(expect.objectContaining({ id: 'u1' }));
  });
});
