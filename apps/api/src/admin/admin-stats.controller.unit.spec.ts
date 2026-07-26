import { OnboardingStage, OnboardingStageStatus } from '@sahayak/shared-constants';
import { AdminStatsController } from './admin-stats.controller';

describe('AdminStatsController (unit)', () => {
  it('aggregates platform stats and onboarding queue', async () => {
    const prisma = {
      hospitalBedInventory: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: { totalCount: 10, availableCount: 4, occupiedCount: 6 },
          _count: { hospitalId: 2 },
        }),
        count: jest.fn().mockResolvedValue(1),
      },
      case: { count: jest.fn().mockResolvedValue(5) },
      providerApplication: {
        count: jest.fn().mockResolvedValue(2),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'a1',
            providerType: 'HOSPITAL',
            legalName: 'X',
            status: OnboardingStage.APPLICATION_INTAKE,
            createdAt: new Date(),
            updatedAt: new Date(),
            stages: [{ status: OnboardingStageStatus.COMPLETE }],
          },
          {
            id: 'a2',
            providerType: 'HOSPITAL',
            legalName: 'Y',
            status: OnboardingStage.APPLICATION_INTAKE,
            createdAt: new Date(),
            updatedAt: new Date(),
            stages: [
              { status: OnboardingStageStatus.COMPLETE },
              { status: OnboardingStageStatus.PENDING },
            ],
          },
        ]),
      },
      ambulanceDriver: { count: jest.fn().mockResolvedValue(3) },
      ambulanceRequest: { count: jest.fn().mockResolvedValue(1) },
    };
    const controller = new AdminStatsController(prisma as never);
    const stats = await controller.getPlatformStats();
    expect(stats.data.beds.platformOccupancyPercent).toBe(60);
    const queue = await controller.getOnboardingQueue();
    expect(queue.meta.count).toBe(2);
    expect(queue.data[0].isPortalLive).toBe(true);
    expect(queue.data[1].isPortalLive).toBe(false);

    prisma.hospitalBedInventory.aggregate.mockResolvedValueOnce({
      _sum: { totalCount: null, availableCount: null, occupiedCount: null },
      _count: { hospitalId: 0 },
    });
    const empty = await controller.getPlatformStats();
    expect(empty.data.beds.platformOccupancyPercent).toBe(0);
  });
});
