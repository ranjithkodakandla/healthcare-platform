import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConsoleRole, Role } from '@sahayak/shared-constants';

jest.mock('firebase-admin', () => {
  const getUserByEmail = jest.fn();
  const updateUser = jest.fn();
  const createUser = jest.fn();
  const setCustomUserClaims = jest.fn();
  const initializeApp = jest.fn(() => ({ name: 'app' }));
  const auth = jest.fn(() => ({ getUserByEmail, updateUser, createUser, setCustomUserClaims }));
  const api = {
    apps: [] as unknown[],
    app: jest.fn(() => ({ name: 'app' })),
    initializeApp,
    auth,
    credential: { cert: jest.fn(() => 'cert'), applicationDefault: jest.fn(() => 'adc') },
  };
  return { __esModule: true, default: api, ...api };
});

import * as admin from 'firebase-admin';
import { ConsoleUserService } from './console-user.service';
import { resetFirebaseAdminAppCache } from '../shared-services/auth/firebase-admin.app';

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
        update: jest.fn(),
      },
    };
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const config = {
      get: (k: string) => (k === 'FIREBASE_PROJECT_ID' ? 'sahyak' : 'ADC'),
    };
    return { service: new ConsoleUserService(prisma as never, audit as never, config as never), prisma, tx };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    resetFirebaseAdminAppCache();
    (admin as unknown as { apps: unknown[] }).apps = [];
  });

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

  it('createConsoleUser with a password provisions a Firebase login and stamps role:ADMIN + consoleRole claims', async () => {
    const { service, tx } = build();
    const fbAuth = admin.auth();
    (fbAuth.getUserByEmail as jest.Mock).mockRejectedValueOnce({ code: 'auth/user-not-found' });
    (fbAuth.createUser as jest.Mock).mockResolvedValueOnce({ uid: 'fb-new' });

    await service.createConsoleUser({
      email: 'ranjith@sahyak.test',
      role: ConsoleRole.CONSOLE_ADMINISTRATOR,
      actor: 'admin',
      password: 'Password@01',
    });

    expect(fbAuth.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'ranjith@sahyak.test', password: 'Password@01' }),
    );
    expect(fbAuth.setCustomUserClaims).toHaveBeenCalledWith('fb-new', {
      role: Role.ADMIN,
      consoleRole: ConsoleRole.CONSOLE_ADMINISTRATOR,
    });
    expect(tx.consoleUser.create).toHaveBeenCalledWith({
      data: { email: 'ranjith@sahyak.test', role: ConsoleRole.CONSOLE_ADMINISTRATOR, firebaseUid: 'fb-new' },
    });
  });

  it('resyncConsoleClaims backfills firebaseUid by email when missing, then re-stamps claims', async () => {
    const { service, prisma } = build();
    prisma.consoleUser.findUnique.mockResolvedValueOnce({
      id: 'u1',
      email: 'ranjith@sahyak.test',
      role: ConsoleRole.CONSOLE_ADMINISTRATOR,
      firebaseUid: null,
    });
    const fbAuth = admin.auth();
    (fbAuth.getUserByEmail as jest.Mock).mockResolvedValueOnce({ uid: 'fb-existing' });

    const result = await service.resyncConsoleClaims('u1', 'admin');

    expect(prisma.consoleUser.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { firebaseUid: 'fb-existing' },
    });
    expect(fbAuth.setCustomUserClaims).toHaveBeenCalledWith('fb-existing', {
      role: Role.ADMIN,
      consoleRole: ConsoleRole.CONSOLE_ADMINISTRATOR,
    });
    expect(result).toEqual({ email: 'ranjith@sahyak.test', firebaseUid: 'fb-existing' });
  });

  it('resyncConsoleClaims rejects an unknown console user id', async () => {
    const { service, prisma } = build();
    prisma.consoleUser.findUnique.mockResolvedValueOnce(null);
    await expect(service.resyncConsoleClaims('missing', 'admin')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updateConsoleUser re-stamps claims when a linked user changes role', async () => {
    const { service, prisma, tx } = build();
    prisma.consoleUser.findUnique.mockResolvedValueOnce({
      id: 'u1',
      role: ConsoleRole.SUPPORT_AGENT,
      status: 'ACTIVE',
      firebaseUid: 'fb1',
    });
    tx.consoleUser.update.mockResolvedValueOnce({
      id: 'u1',
      role: ConsoleRole.CONSOLE_ADMINISTRATOR,
      status: 'ACTIVE',
      firebaseUid: 'fb1',
    });

    await service.updateConsoleUser({ id: 'u1', role: ConsoleRole.CONSOLE_ADMINISTRATOR, actor: 'admin' });

    const fbAuth = admin.auth();
    expect(fbAuth.setCustomUserClaims).toHaveBeenCalledWith('fb1', {
      role: Role.ADMIN,
      consoleRole: ConsoleRole.CONSOLE_ADMINISTRATOR,
    });
  });
});
