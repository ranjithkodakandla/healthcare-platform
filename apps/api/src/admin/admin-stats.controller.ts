import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../shared-services/auth/auth.guard';
import { RolesGuard } from '../shared-services/auth/roles.guard';
import { Roles } from '../shared-services/auth/roles.decorator';
import { OnboardingStage, OnboardingStageStatus, Role } from '@sahayak/shared-constants';
import { PrismaService } from '../prisma/prisma.service';

// A-02: Operations Dashboard platform-wide stats for the Admin Console.
// GET /v1/admin/platform/stats — aggregates live data from all schemas.
// Protected by Role.ADMIN (same RBAC gate as all admin routes).
// DL-007: cannot be live-verified until Firebase unblocks, but route is correct.
@ApiTags('admin')
@ApiBearerAuth()
@Controller('v1/admin/platform')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminStatsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('stats')
  @ApiOperation({ summary: 'A-02: Platform-wide operations dashboard stats' })
  async getPlatformStats() {
    const [bedStats, caseStats, onboardingStats, ambulanceStats] = await Promise.all([
      this.getBedStats(),
      this.getCaseStats(),
      this.getOnboardingStats(),
      this.getAmbulanceStats(),
    ]);

    return {
      data: {
        beds: bedStats,
        cases: caseStats,
        onboarding: onboardingStats,
        ambulances: ambulanceStats,
        generatedAt: new Date().toISOString(),
      },
      meta: {},
    };
  }

  @Get('onboarding-queue')
  @ApiOperation({ summary: 'A-04: Provider onboarding queue for Admin Console' })
  async getOnboardingQueue() {
    // Applications not yet portal-live: status has not reached PORTAL_ACCESS_ACTIVATED
    const applications = await this.prisma.providerApplication.findMany({
      where: { status: { not: OnboardingStage.PORTAL_ACCESS_ACTIVATED } },
      include: { stages: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return {
      data: applications.map((a) => {
        const isPortalLive = a.stages.length > 0 &&
          a.stages.every((s) => s.status === OnboardingStageStatus.COMPLETE);
        return {
          id: a.id,
          providerType: a.providerType,
          legalName: a.legalName,
          currentStage: a.status, // furthest-reached stage (schema field name: status)
          isPortalLive,
          createdAt: a.createdAt,
          updatedAt: a.updatedAt,
        };
      }),
      meta: { count: applications.length },
    };
  }

  // ── Private aggregation helpers ─────────────────────────────────────────────

  private async getBedStats() {
    const rows = await this.prisma.hospitalBedInventory.aggregate({
      _sum: { totalCount: true, availableCount: true, occupiedCount: true },
      _count: { hospitalId: true },
    });
    const staleCount = await this.prisma.hospitalBedInventory.count({
      where: { stalenessStatus: 'STALE' },
    });
    const total = rows._sum.totalCount ?? 0;
    const occupied = rows._sum.occupiedCount ?? 0;
    return {
      totalBeds: total,
      occupiedBeds: occupied,
      availableBeds: rows._sum.availableCount ?? 0,
      platformOccupancyPercent: total > 0 ? Math.round((occupied / total) * 100) : 0,
      staleProviderCount: staleCount,
      registeredHospitals: rows._count.hospitalId,
    };
  }

  private async getCaseStats() {
    const [total, active, critical] = await Promise.all([
      this.prisma.case.count(),
      this.prisma.case.count({ where: { status: { not: 'CLOSED' } } }),
      this.prisma.case.count({ where: { status: { not: 'CLOSED' }, caseType: 'EMERGENCY' } }),
    ]);
    return { totalCases: total, activeCases: active, activeCriticalCases: critical };
  }

  private async getOnboardingStats() {
    const [pending, approved] = await Promise.all([
      this.prisma.providerApplication.count({
        where: { status: { not: OnboardingStage.PORTAL_ACCESS_ACTIVATED } },
      }),
      this.prisma.providerApplication.count({
        where: { status: OnboardingStage.PORTAL_ACCESS_ACTIVATED },
      }),
    ]);
    return { pendingApplications: pending, approvedProviders: approved };
  }

  private async getAmbulanceStats() {
    const [onDuty, searching, matched] = await Promise.all([
      this.prisma.ambulanceDriver.count({ where: { isOnDuty: true } }),
      this.prisma.ambulanceRequest.count({ where: { status: 'SEARCHING' } }),
      this.prisma.ambulanceRequest.count({ where: { status: 'MATCHED' } }),
    ]);
    return { driversOnDuty: onDuty, requestsSearching: searching, requestsMatched: matched };
  }
}
