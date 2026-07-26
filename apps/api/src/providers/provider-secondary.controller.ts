import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@sahayak/shared-constants';
import { AuthGuard } from '../shared-services/auth/auth.guard';
import { RolesGuard } from '../shared-services/auth/roles.guard';
import { Roles } from '../shared-services/auth/roles.decorator';
import { CurrentUser } from '../shared-services/auth/current-user.decorator';
import { ProviderSecondaryService } from './provider-secondary.service';

// P-14 / P-15 / P-16 — secondary provider portals (ambulance fleet, pharmacy, blood bank).
// `:providerId` is the org id from the Provider Portal session (same key as hospitalId).
@ApiTags('Provider Secondary')
@ApiBearerAuth()
@Controller('v1/providers')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.PROVIDER_STAFF, Role.ADMIN)
export class ProviderSecondaryController {
  constructor(private readonly secondary: ProviderSecondaryService) {}

  // ── P-14 Fleet ─────────────────────────────────────────────────────────────

  @Get(':providerId/fleet')
  @ApiOperation({ summary: 'P-14: FR-AMBP-001 — ambulance fleet roster' })
  async getFleet(@Param('providerId') providerId: string) {
    const data = await this.secondary.getFleet(providerId);
    return { data, meta: { providerId, count: data.length } };
  }

  @Patch(':providerId/fleet/:driverId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'P-14: Update fleet vehicle status' })
  async updateFleetStatus(
    @Param('providerId') providerId: string,
    @Param('driverId') driverId: string,
    @Body() body: { fleetStatus: string },
    @CurrentUser() user: { uid: string },
  ) {
    const data = await this.secondary.updateFleetStatus(
      providerId,
      driverId,
      body.fleetStatus,
      user.uid,
    );
    return { data, meta: {} };
  }

  // ── P-15 Pharmacy stock ────────────────────────────────────────────────────

  @Get(':providerId/pharmacy/stock')
  @ApiOperation({ summary: 'P-15: FR-PHRP-001 — pharmacy medicine stock list' })
  async getPharmacyStock(
    @Param('providerId') providerId: string,
    @Query('q') q?: string,
  ) {
    const data = await this.secondary.getPharmacyStock(providerId, q);
    return { data, meta: { providerId, count: data.length } };
  }

  @Put(':providerId/pharmacy/stock')
  @ApiOperation({ summary: 'P-15: FR-PHR-009 — update medicine stock counts' })
  async updatePharmacyStock(
    @Param('providerId') providerId: string,
    @Body() body: { updates: Array<{ medicineName: string; stockCount: number }> },
    @CurrentUser() user: { uid: string },
  ) {
    const data = await this.secondary.updatePharmacyStock(
      providerId,
      body.updates ?? [],
      user.uid,
    );
    return { data, meta: { updatedCount: data.length } };
  }

  // ── P-16 Blood pre-alerts ──────────────────────────────────────────────────

  @Get(':providerId/blood/pre-alerts')
  @ApiOperation({ summary: 'P-16: FR-BLDP-001 — AI pre-alerts + explicit requests' })
  async getBloodPreAlerts(@Param('providerId') providerId: string) {
    const data = await this.secondary.getBloodPreAlerts(providerId);
    return {
      data,
      meta: {
        providerId,
        aiCount: data.aiPreAlerts.length,
        explicitCount: data.explicitRequests.length,
      },
    };
  }

  @Post(':providerId/blood/pre-alerts/:alertId/acknowledge')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'P-16: Acknowledge a blood pre-alert' })
  async acknowledgeBloodAlert(
    @Param('providerId') providerId: string,
    @Param('alertId') alertId: string,
    @CurrentUser() user: { uid: string },
  ) {
    const data = await this.secondary.acknowledgeBloodAlert(providerId, alertId, user.uid);
    return { data, meta: {} };
  }
}
