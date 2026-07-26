import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../shared-services/auth/auth.guard';
import { RolesGuard } from '../shared-services/auth/roles.guard';
import { Roles } from '../shared-services/auth/roles.decorator';
import { CurrentUser } from '../shared-services/auth/current-user.decorator';
import { Role } from '@sahayak/shared-constants';
import { BedInventoryService } from '../modules/beds/bed-inventory.service';
import {
  IncomingPatientsService,
  ClinicalAckService,
} from '../modules/beds/incoming-patients.service';
import {
  UpdateBedInventoryDto,
  WhatsAppBedUpdateDto,
  DeclineHoldDto,
  ClinicalAckDto,
} from './dto/update-bed-inventory.dto';

@ApiTags('Provider Portal')
@ApiBearerAuth()
@Controller('v1/providers')
export class ProviderController {
  constructor(
    private readonly bedInventory: BedInventoryService,
    private readonly incomingPatients: IncomingPatientsService,
    private readonly clinicalAckService: ClinicalAckService,
  ) {}

  // ── Dashboard ────────────────────────────────────────────────────────────────

  @Get(':hospitalId/dashboard')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.PROVIDER_STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'P-02: Hospital portal dashboard summary' })
  async getDashboard(@Param('hospitalId') hospitalId: string) {
    const [inventory, queue] = await Promise.all([
      this.bedInventory.getBedInventory(hospitalId),
      this.incomingPatients.getIncomingQueue(hospitalId),
    ]);

    const totalBeds = inventory.reduce((s, r) => s + r.totalCount, 0);
    const occupiedBeds = inventory.reduce((s, r) => s + r.occupiedCount, 0);
    const availableBeds = inventory.reduce((s, r) => s + r.availableCount, 0);
    const isFresh = await this.bedInventory.isInventoryFresh(hospitalId);

    const pendingClinicalAck = queue.filter((q) => q.requiresSecondaryAck).length;

    return {
      data: {
        hospitalId,
        bedOccupancy: {
          total: totalBeds,
          occupied: occupiedBeds,
          available: availableBeds,
          occupancyPercent: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
        },
        stalenessStatus: isFresh ? 'FRESH' : 'STALE',
        pendingActionsCount: queue.length,
        pendingClinicalAckCount: pendingClinicalAck,
        activeLinkedCasesCount: queue.filter((q) => q.caseId != null).length,
      },
      meta: { hospitalId },
    };
  }

  // ── FR-BED-001: Bed Inventory Update (P-03) ───────────────────────────────────

  @Put(':hospitalId/beds')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.PROVIDER_STAFF, Role.ADMIN)
  @ApiOperation({
    summary: 'P-03: FR-BED-001 — update hospital bed category counts (Portal path)',
  })
  async updateBedInventory(
    @Param('hospitalId') hospitalId: string,
    @Body() dto: UpdateBedInventoryDto,
    @CurrentUser() user: { uid: string },
  ) {
    const rows = await this.bedInventory.updateBedCounts(
      hospitalId,
      user.uid,
      dto.updates,
      dto.overrideReason,
    );
    return {
      data: rows,
      meta: { hospitalId, updatedCount: rows.length },
    };
  }

  // FR-BED-001 WhatsApp Tier 1 ingestion parity (L2: identical outcome).
  // Parses the same DTO shape — normalisation of the raw WhatsApp text is the
  // caller's responsibility (the Messaging adapter does that upstream; this
  // endpoint receives the already-parsed updates to keep the service layer pure).
  @Post(':hospitalId/beds/whatsapp-update')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.PROVIDER_STAFF, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'FR-BED-001 — WhatsApp Tier 1 ingestion (parity with Portal path, L2)',
  })
  async whatsappBedUpdate(
    @Param('hospitalId') hospitalId: string,
    @Body() dto: WhatsAppBedUpdateDto,
    @CurrentUser() user: { uid: string },
  ) {
    // Same underlying service call as PUT /beds — identical outcome guaranteed (L2).
    const rows = await this.bedInventory.updateBedCounts(
      hospitalId,
      user.uid,
      dto.updates,
    );
    return {
      data: rows,
      meta: {
        hospitalId,
        updatedCount: rows.length,
        source: 'whatsapp_tier1',
        rawMessage: dto.rawMessage ?? null,
      },
    };
  }

  @Get(':hospitalId/beds')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.PROVIDER_STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Get current bed inventory for a hospital' })
  async getBedInventory(@Param('hospitalId') hospitalId: string) {
    const rows = await this.bedInventory.getBedInventory(hospitalId);
    return { data: rows, meta: { hospitalId } };
  }

  // ── FR-HOSP-001: Incoming Patients / Booking Queue (P-04) ────────────────────

  @Get(':hospitalId/incoming-queue')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.PROVIDER_STAFF, Role.ADMIN)
  @ApiOperation({
    summary: 'P-04: FR-HOSP-001 — incoming patients/booking queue ranked by severity',
  })
  async getIncomingQueue(@Param('hospitalId') hospitalId: string) {
    const queue = await this.incomingPatients.getIncomingQueue(hospitalId);
    return { data: queue, meta: { hospitalId, count: queue.length } };
  }

  @Post(':hospitalId/holds/:holdId/confirm')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.PROVIDER_STAFF, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'FR-HOSP-001 — Admissions confirms a PENDING hold (General beds); ICU/Vent uses /clinical-ack',
  })
  async confirmHold(
    @Param('hospitalId') hospitalId: string,
    @Param('holdId') holdId: string,
    @CurrentUser() user: { uid: string; role?: string },
  ) {
    await this.incomingPatients.confirmHold(
      hospitalId,
      holdId,
      user.uid,
      user.role ?? '',
    );
    return { data: { holdId, status: 'CONFIRMED' }, meta: {} };
  }

  @Post(':hospitalId/holds/:holdId/decline')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.PROVIDER_STAFF, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'FR-HOSP-001 — Admissions declines a hold with reason' })
  async declineHold(
    @Param('hospitalId') hospitalId: string,
    @Param('holdId') holdId: string,
    @Body() dto: DeclineHoldDto,
    @CurrentUser() user: { uid: string },
  ) {
    await this.incomingPatients.declineHold(hospitalId, holdId, user.uid, dto.reason);
    return { data: { holdId, status: 'DECLINED' }, meta: {} };
  }

  // ── FR-HOSP-002: ICU/Vent Clinical Acknowledgment (P-05) ─────────────────────

  @Post(':hospitalId/holds/:holdId/clinical-ack')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.PROVIDER_STAFF, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'P-05: FR-HOSP-002 — Clinical Lead acknowledges ICU/Vent hold (zero-tolerance audit gate BR-04)',
  })
  async clinicalAck(
    @Param('hospitalId') hospitalId: string,
    @Param('holdId') holdId: string,
    @Body() dto: ClinicalAckDto,
    @CurrentUser() user: { uid: string },
  ) {
    await this.clinicalAckService.acknowledgeHold(
      hospitalId,
      holdId,
      user.uid,
      dto.actorRole,
    );
    return { data: { holdId, status: 'CONFIRMED', clinicalAckLogged: true }, meta: {} };
  }
}
