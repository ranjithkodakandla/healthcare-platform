import {
  Controller,
  Get,
  Put,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../shared-services/auth/auth.guard';
import { RolesGuard } from '../shared-services/auth/roles.guard';
import { OrgScopeGuard } from '../shared-services/auth/org-scope.guard';
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
import { InviteProviderUserDto } from './dto/invite-provider-user.dto';
import { UpsertDoctorDto, UpsertDiagnosticOfferingDto } from './dto/hospital-department.dto';
import { CreateWalkInCaseDto } from './dto/create-walkin-case.dto';
import { ProviderUserService } from './provider-user.service';
import { ProviderConfigService } from './provider-config.service';
import { ProviderAuditService } from './provider-audit.service';
import { ProviderDoctorService } from './provider-doctor.service';
import { ProviderDiagnosticsService } from './provider-diagnostics.service';
import { ProviderCaseService } from './provider-case.service';

@ApiTags('Provider Portal')
@ApiBearerAuth()
@Controller('v1/providers')
export class ProviderController {
  constructor(
    private readonly bedInventory: BedInventoryService,
    private readonly incomingPatients: IncomingPatientsService,
    private readonly clinicalAckService: ClinicalAckService,
    private readonly providerUserService: ProviderUserService,
    private readonly providerConfigService: ProviderConfigService,
    private readonly providerAuditService: ProviderAuditService,
    private readonly providerDoctorService: ProviderDoctorService,
    private readonly providerDiagnosticsService: ProviderDiagnosticsService,
    private readonly providerCaseService: ProviderCaseService,
  ) {}

  // ── Dashboard ────────────────────────────────────────────────────────────────

  @Get(':hospitalId/dashboard')
  @UseGuards(AuthGuard, RolesGuard, OrgScopeGuard)
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
  @UseGuards(AuthGuard, RolesGuard, OrgScopeGuard)
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
  @UseGuards(AuthGuard, RolesGuard, OrgScopeGuard)
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
  @UseGuards(AuthGuard, RolesGuard, OrgScopeGuard)
  @Roles(Role.PROVIDER_STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Get current bed inventory for a hospital' })
  async getBedInventory(@Param('hospitalId') hospitalId: string) {
    const rows = await this.bedInventory.getBedInventory(hospitalId);
    return { data: rows, meta: { hospitalId } };
  }

  // ── FR-HOSP-001: Incoming Patients / Booking Queue (P-04) ────────────────────

  @Get(':hospitalId/incoming-queue')
  @UseGuards(AuthGuard, RolesGuard, OrgScopeGuard)
  @Roles(Role.PROVIDER_STAFF, Role.ADMIN)
  @ApiOperation({
    summary: 'P-04: FR-HOSP-001 — incoming patients/booking queue ranked by severity',
  })
  async getIncomingQueue(@Param('hospitalId') hospitalId: string) {
    const queue = await this.incomingPatients.getIncomingQueue(hospitalId);
    return { data: queue, meta: { hospitalId, count: queue.length } };
  }

  @Post(':hospitalId/holds/:holdId/confirm')
  @UseGuards(AuthGuard, RolesGuard, OrgScopeGuard)
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
  @UseGuards(AuthGuard, RolesGuard, OrgScopeGuard)
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
  @UseGuards(AuthGuard, RolesGuard, OrgScopeGuard)
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

  // ── P-10: User Management "+ Add user" (F3.6) ────────────────────────────────

  @Post(':hospitalId/users')
  @UseGuards(AuthGuard, RolesGuard, OrgScopeGuard)
  @Roles(Role.PROVIDER_STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'P-10: FR-ID F3.6 — provision a new hospital staff account' })
  async inviteUser(
    @Param('hospitalId') hospitalId: string,
    @Body() dto: InviteProviderUserDto,
    @CurrentUser() user: { uid: string },
  ) {
    const created = await this.providerUserService.inviteUser(hospitalId, dto, user.uid);
    return { data: created, meta: { hospitalId } };
  }

  // ── P-11: Configuration (F2, G16) ────────────────────────────────────────────

  @Get(':hospitalId/config')
  @UseGuards(AuthGuard, RolesGuard, OrgScopeGuard)
  @Roles(Role.PROVIDER_STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'P-11: BR-02 hold-expiry windows (read-only)' })
  async getConfig(@Param('hospitalId') hospitalId: string) {
    const holdExpiry = await this.providerConfigService.getHoldExpiryConfig();
    return { data: { holdExpiry }, meta: { hospitalId } };
  }

  // ── P-12: Audit Logs (F2, GT-06) ─────────────────────────────────────────────

  @Get(':hospitalId/audit')
  @UseGuards(AuthGuard, RolesGuard, OrgScopeGuard)
  @Roles(Role.PROVIDER_STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'P-12: GT-06 — audit log entries for this hospital' })
  async getAuditLog(@Param('hospitalId') hospitalId: string) {
    const rows = await this.providerAuditService.listForHospital(hospitalId);
    return { data: rows, meta: { hospitalId, count: rows.length } };
  }

  // ── Hospital in-house Doctors department (full CRUD) ─────────────────────────

  @Get(':hospitalId/doctors')
  @UseGuards(AuthGuard, RolesGuard, OrgScopeGuard)
  @Roles(Role.PROVIDER_STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'In-house doctors owned by this hospital' })
  async listDoctors(@Param('hospitalId') hospitalId: string) {
    const data = await this.providerDoctorService.list(hospitalId);
    return { data, meta: { hospitalId, count: data.length } };
  }

  @Post(':hospitalId/doctors')
  @UseGuards(AuthGuard, RolesGuard, OrgScopeGuard)
  @Roles(Role.PROVIDER_STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Add an in-house doctor' })
  async addDoctor(
    @Param('hospitalId') hospitalId: string,
    @Body() dto: UpsertDoctorDto,
    @CurrentUser() user: { uid: string },
  ) {
    const data = await this.providerDoctorService.create(hospitalId, dto, user.uid);
    return { data, meta: { hospitalId } };
  }

  @Patch(':hospitalId/doctors/:doctorId')
  @UseGuards(AuthGuard, RolesGuard, OrgScopeGuard)
  @Roles(Role.PROVIDER_STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Update an in-house doctor' })
  async updateDoctor(
    @Param('hospitalId') hospitalId: string,
    @Param('doctorId') doctorId: string,
    @Body() dto: Partial<UpsertDoctorDto>,
    @CurrentUser() user: { uid: string },
  ) {
    const data = await this.providerDoctorService.update(hospitalId, doctorId, dto, user.uid);
    return { data, meta: { hospitalId } };
  }

  @Delete(':hospitalId/doctors/:doctorId')
  @UseGuards(AuthGuard, RolesGuard, OrgScopeGuard)
  @Roles(Role.PROVIDER_STAFF, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove an in-house doctor' })
  async removeDoctor(
    @Param('hospitalId') hospitalId: string,
    @Param('doctorId') doctorId: string,
    @CurrentUser() user: { uid: string },
  ) {
    await this.providerDoctorService.remove(hospitalId, doctorId, user.uid);
    return { data: { doctorId, removed: true }, meta: { hospitalId } };
  }

  // ── Hospital in-house Diagnostics department (full CRUD) ─────────────────────

  @Get(':hospitalId/diagnostics/offerings')
  @UseGuards(AuthGuard, RolesGuard, OrgScopeGuard)
  @Roles(Role.PROVIDER_STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'In-house diagnostic offerings owned by this hospital' })
  async listDiagnosticOfferings(@Param('hospitalId') hospitalId: string) {
    const data = await this.providerDiagnosticsService.list(hospitalId);
    return { data, meta: { hospitalId, count: data.length } };
  }

  @Post(':hospitalId/diagnostics/offerings')
  @UseGuards(AuthGuard, RolesGuard, OrgScopeGuard)
  @Roles(Role.PROVIDER_STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Add an in-house diagnostic offering' })
  async addDiagnosticOffering(
    @Param('hospitalId') hospitalId: string,
    @Body() dto: UpsertDiagnosticOfferingDto,
    @CurrentUser() user: { uid: string },
  ) {
    const data = await this.providerDiagnosticsService.create(hospitalId, dto, user.uid);
    return { data, meta: { hospitalId } };
  }

  @Patch(':hospitalId/diagnostics/offerings/:offeringId')
  @UseGuards(AuthGuard, RolesGuard, OrgScopeGuard)
  @Roles(Role.PROVIDER_STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Update an in-house diagnostic offering' })
  async updateDiagnosticOffering(
    @Param('hospitalId') hospitalId: string,
    @Param('offeringId') offeringId: string,
    @Body() dto: Partial<UpsertDiagnosticOfferingDto>,
    @CurrentUser() user: { uid: string },
  ) {
    const data = await this.providerDiagnosticsService.update(hospitalId, offeringId, dto, user.uid);
    return { data, meta: { hospitalId } };
  }

  @Delete(':hospitalId/diagnostics/offerings/:offeringId')
  @UseGuards(AuthGuard, RolesGuard, OrgScopeGuard)
  @Roles(Role.PROVIDER_STAFF, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove an in-house diagnostic offering' })
  async removeDiagnosticOffering(
    @Param('hospitalId') hospitalId: string,
    @Param('offeringId') offeringId: string,
    @CurrentUser() user: { uid: string },
  ) {
    await this.providerDiagnosticsService.remove(hospitalId, offeringId, user.uid);
    return { data: { offeringId, removed: true }, meta: { hospitalId } };
  }

  // ── P-06: Case Management (F2, GT-07 consent-scoped) ─────────────────────────

  @Get(':hospitalId/cases')
  @UseGuards(AuthGuard, RolesGuard, OrgScopeGuard)
  @Roles(Role.PROVIDER_STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'P-06: cases with an active bed hold at this hospital' })
  async listCases(@Param('hospitalId') hospitalId: string) {
    const data = await this.providerCaseService.list(hospitalId);
    return { data, meta: { hospitalId, count: data.length } };
  }

  @Get(':hospitalId/cases/:caseId/timeline')
  @UseGuards(AuthGuard, RolesGuard, OrgScopeGuard)
  @Roles(Role.PROVIDER_STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'P-06: consent-scoped timeline for a case held at this hospital' })
  async getCaseTimeline(@Param('hospitalId') hospitalId: string, @Param('caseId') caseId: string) {
    const data = await this.providerCaseService.getTimeline(hospitalId, caseId);
    return { data, meta: { hospitalId, caseId } };
  }

  @Post(':hospitalId/cases/walk-in')
  @UseGuards(AuthGuard, RolesGuard, OrgScopeGuard)
  @Roles(Role.PROVIDER_STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'P-06: add a walk-in case (patient not routed via the citizen app)' })
  async createWalkInCase(
    @Param('hospitalId') hospitalId: string,
    @Body() dto: CreateWalkInCaseDto,
    @CurrentUser() user: { uid: string },
  ) {
    const data = await this.providerCaseService.createWalkIn(hospitalId, dto, user.uid);
    return { data, meta: { hospitalId } };
  }
}
