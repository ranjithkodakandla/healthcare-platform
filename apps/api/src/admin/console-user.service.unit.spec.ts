import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConsoleRole } from '@sahayak/shared-constants';
import { ConsoleUserService } from './console-user.service';

describe('ConsoleUserService (unit)', () => {
  function build() {
    const tx = {
      consoleUser: {
        create: jest.fn().mockResolvedValue({ id: 'u1', role: ConsoleRole.SUPPORT_AGENT, status: 'ACTIVE' }),
        update: jest.fn().mockResolvedValue({
          id: 'u1',
          role: ConsoleRole.CONSOLE_ADMINISTRATOR,
          status: 'DEACTIVATED',
        }),
      },
    };
    const prisma = {
      $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
      consoleUser: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        update: tx.consoleUser.update,
      },
    };
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    return { service: new ConsoleUserService(prisma as never, audit as never), prisma, tx };
  }

  it('create list and requireConsoleRole', async () => {
    const { service, prisma, tx } = build();
    await service.createConsoleUser({
      email: ' Agent@Sahayak.test ',
      role: ConsoleRole.SUPPORT_AGENT,
      actor: 'admin',
      firebaseUid: 'fb1',
    });
    expect(tx.consoleUser.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ email: 'agent@sahayak.test' }),
    });
    await service.listConsoleUsers();
    prisma.consoleUser.findUnique.mockResolvedValueOnce(null);
    await expect(
      service.requireConsoleRole('fb1', [ConsoleRole.SUPPORT_AGENT]),
    ).rejects.toBeInstanceOf(ForbiddenException);
    prisma.consoleUser.findUnique.mockResolvedValueOnce({
      id: 'u1',
      role: ConsoleRole.SUPPORT_AGENT,
      status: 'ACTIVE',
    });
    await expect(
      service.requireConsoleRole('fb1', [ConsoleRole.SUPPORT_AGENT]),
    ).resolves.toEqual(expect.objectContaining({ id: 'u1' }));
  });

  it('rejects malformed invite emails', async () => {
    const { service, tx } = build();
    await expect(
      service.createConsoleUser({
        email: 'not-an-email',
        role: ConsoleRole.SUPPORT_AGENT,
        actor: 'admin',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.consoleUser.create).not.toHaveBeenCalled();
  });

  it('updates role/status and blocks deactivated users', async () => {
    const { service, prisma } = build();
    prisma.consoleUser.findUnique.mockResolvedValueOnce({
      id: 'u1',
      role: ConsoleRole.SUPPORT_AGENT,
      status: 'ACTIVE',
    });
    await service.updateConsoleUser({
      id: 'u1',
      role: ConsoleRole.CONSOLE_ADMINISTRATOR,
      status: 'DEACTIVATED',
      actor: 'admin',
    });
    prisma.consoleUser.findUnique.mockResolvedValueOnce({
      id: 'u1',
      role: ConsoleRole.CONSOLE_ADMINISTRATOR,
      status: 'DEACTIVATED',
      firebaseUid: 'fb1',
    });
    await expect(
      service.requireConsoleRole('fb1', [ConsoleRole.CONSOLE_ADMINISTRATOR]),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
