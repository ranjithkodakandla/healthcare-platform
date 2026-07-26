import { PrismaService } from './prisma.service';

describe('PrismaService lifecycle', () => {
  it('connects and disconnects', async () => {
    const service = Object.create(PrismaService.prototype) as PrismaService;
    service.$connect = jest.fn().mockResolvedValue(undefined);
    service.$disconnect = jest.fn().mockResolvedValue(undefined);
    await service.onModuleInit();
    await service.onModuleDestroy();
    expect(service.$connect).toHaveBeenCalled();
    expect(service.$disconnect).toHaveBeenCalled();
  });
});
