import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '../shared-services/auth/auth.guard';
import { CurrentUser } from '../shared-services/auth/current-user.decorator';
import { CaseService } from '../core/case.service';
import { CitizenBedSearchService } from './citizen-bed-search.service';
import { CitizenAmbulanceService } from './citizen-ambulance.service';
import { ResourceCoordinationService } from '../resource-coordination/resource-coordination.service';
import {
  BedSearchQueryDto,
  CreateCitizenCaseDto,
  PlaceBedHoldDto,
  AmbulanceSearchQueryDto,
  CreateAmbulanceRequestDto,
} from './dto/citizen.dto';
import { CaseSeverity, BedCategory, ResourceType } from '@sahayak/shared-constants';

const ICU_VENT_CATEGORIES = [BedCategory.ICU, BedCategory.VENTILATOR];

// PRD §2.8 BR-02 default hold-expiry windows, by case severity (not bed category —
// PROVIDER_UAT_REPORT.md Finding #7 flagged the previous category-keyed windows as
// both spec-non-compliant and operationally backwards: ICU/Vent, which needs the
// extra BR-04 clinical-ack step, had a *shorter* window than General). Runtime-
// configurable per PRD line 1024 ("never hardcoded constants in module code") via
// env vars, defaulting to the PRD's named values (Part J: BED_HOLD_EXPIRY_MIN_CRITICAL
// = 30, BED_HOLD_EXPIRY_MIN_PLANNED = 120).
const DEFAULT_HOLD_EXPIRY_MIN_CRITICAL = 30;
const DEFAULT_HOLD_EXPIRY_MIN_PLANNED = 120;

@ApiTags('Citizen App')
@Controller('v1/citizen')
export class CitizenController {
  constructor(
    private readonly bedSearch: CitizenBedSearchService,
    private readonly ambulanceService: CitizenAmbulanceService,
    private readonly caseService: CaseService,
    private readonly resourceCoordination: ResourceCoordinationService,
    private readonly config: ConfigService,
  ) {}

  private async resolveHoldTtlSeconds(caseId: string): Promise<number> {
    const severity = await this.caseService.getCaseSeverity(caseId);
    const isCritical = severity === CaseSeverity.CRITICAL;
    const minutes = isCritical
      ? Number(this.config.get('BED_HOLD_EXPIRY_MIN_CRITICAL') ?? DEFAULT_HOLD_EXPIRY_MIN_CRITICAL)
      : Number(this.config.get('BED_HOLD_EXPIRY_MIN_PLANNED') ?? DEFAULT_HOLD_EXPIRY_MIN_PLANNED);
    return minutes * 60;
  }

  // ── FR-BED-002: Bed Search (C-12) ────────────────────────────────────────────

  @Get('beds/search')
  @ApiOperation({
    summary: 'C-12: FR-BED-002 — Citizen bed search (staleness shown on every result, §13.1)',
  })
  async searchBeds(@Query() query: BedSearchQueryDto) {
    const results = await this.bedSearch.searchBeds({
      ...query,
      lat: query.lat != null ? Number(query.lat) : undefined,
      lng: query.lng != null ? Number(query.lng) : undefined,
      radiusKm: query.radiusKm != null ? Number(query.radiusKm) : undefined,
    });
    return {
      data: results,
      meta: {
        count: results.length,
        category: query.category ?? 'ALL',
        freshOnly: query.freshOnly ?? false,
        // Note TD-003: geo-proximity sort pending hospital-registry lat/lng table (Phase 7)
        geoSort: false,
      },
    };
  }

  // FR-NBH-001: Hospital bed summary by hospital ID (C-13, C-19 detail view)
  @Get('beds/hospitals/:hospitalId')
  @ApiOperation({ summary: 'C-13/C-19: FR-NBH-001 — bed summary for a specific hospital' })
  async getHospitalBedSummary(@Param('hospitalId') hospitalId: string) {
    const results = await this.bedSearch.getHospitalBedSummary(hospitalId);
    return { data: results, meta: { hospitalId } };
  }

  // C-18 — Nearby Hospitals Directory (Module 4 / FR-NBH)
  @Get('hospitals/nearby')
  @ApiOperation({ summary: 'C-18: Nearby hospitals from HospitalRegistry, geo-sorted with occupancy' })
  async nearbyHospitals(
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radiusKm') radiusKm?: string,
  ) {
    const data = await this.bedSearch.searchNearbyHospitals({
      lat: lat != null && lat !== '' ? Number(lat) : undefined,
      lng: lng != null && lng !== '' ? Number(lng) : undefined,
      radiusKm: radiusKm != null && radiusKm !== '' ? Number(radiusKm) : undefined,
    });
    return {
      data,
      meta: {
        count: data.length,
        geoSort: lat != null && lng != null,
      },
    };
  }

  // C-19 — Hospital Profile (FR-NBH-001)
  @Get('hospitals/:hospitalId')
  @ApiOperation({ summary: 'C-19: Hospital profile + bed categories' })
  async hospitalProfile(
    @Param('hospitalId') hospitalId: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
  ) {
    const geo =
      lat != null && lat !== '' && lng != null && lng !== ''
        ? { lat: Number(lat), lng: Number(lng) }
        : undefined;
    const profile = await this.bedSearch.getHospitalProfile(hospitalId, geo);
    if (!profile) {
      throw new NotFoundException(`Hospital ${hospitalId} not found`);
    }
    return { data: profile, meta: { hospitalId } };
  }

  // ── GT-10 / FR-AMB-001: Emergency Case Creation (C-05 triage intake) ─────────

  // Guest path — no auth required (GT-10: "zero friction for a bystander").
  // Requires deviceId to enforce BR-06 (exactly one active untracked request per device).
  @Post('cases/guest')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'C-05: GT-10/BR-06 — Create emergency case as guest (no auth, device-tracked)',
  })
  async createGuestCase(@Body() dto: CreateCitizenCaseDto) {
    if (!dto.deviceId) {
      throw new BadRequestException('deviceId is required for guest case creation (BR-06)');
    }

    const severity = dto.severity ?? this.computeSeverity(dto.triage);

    // DPDP minimization: never persist guest phone inside case.location JSON.
    const safeLocation = { ...(dto.location ?? {}) } as Record<string, unknown>;
    delete safeLocation.phone;
    delete safeLocation.mobile;
    delete safeLocation.guestPhone;

    const kase = await this.caseService.createGuestCase({
      deviceId: dto.deviceId,
      location: safeLocation,
      initialPayload: {
        triage: dto.triage,
        // Prefer CaseService AI severity (NIM) over local rule hint when available.
        source: 'citizen_app_guest',
      },
    });

    return { data: kase, meta: { guestFlow: true, severity: kase.severity ?? severity } };
  }

  // Authenticated path — registered citizen.
  @Post('cases')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'C-05: FR-AMB-001 — Create emergency case (registered citizen, auth required)',
  })
  @ApiBearerAuth()
  async createCase(
    @Body() dto: CreateCitizenCaseDto,
    @CurrentUser() user: { uid: string },
  ) {
    const severity = dto.severity ?? this.computeSeverity(dto.triage);

    const kase = await this.caseService.createCase({
      actor: user.uid,
      initiatorId: user.uid,
      location: dto.location,
      initialPayload: {
        triage: dto.triage,
        severity,
        source: 'citizen_app_registered',
      },
    });

    return { data: kase, meta: { guestFlow: false, severity } };
  }

  // ── Case detail + timeline (C-09, C-10) ──────────────────────────────────────

  @Get('cases/:caseId/timeline')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'C-10: §A3.2 — Case timeline (append-only, consent-scoped)' })
  @ApiBearerAuth()
  async getCaseTimeline(@Param('caseId') caseId: string) {
    const events = await this.caseService.getTimeline(caseId);
    return { data: events, meta: { caseId, count: events.length } };
  }

  // ── FR-BED-003: Place Bed Hold (C-13) ────────────────────────────────────────

  @Post('cases/:caseId/bed-holds')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'C-13: FR-BED-003 — Place bed hold (BR-02 TTL, BR-04 ICU/Vent requires secondaryAck)',
  })
  async placeBedHold(
    @Param('caseId') caseId: string,
    @Body() dto: PlaceBedHoldDto,
    @CurrentUser() user: { uid: string },
  ) {
    const ttl = await this.resolveHoldTtlSeconds(caseId);
    const requiresSecondaryAck = ICU_VENT_CATEGORIES.includes(dto.category as BedCategory);
    const resourceOwnerId = `${dto.hospitalId}:${dto.category}`;

    // Ensure capacity row exists (idempotent — creates with capacity=1 if missing)
    await this.resourceCoordination.ensureCapacity(ResourceType.BED, resourceOwnerId, 1);

    const hold = await this.resourceCoordination.createHold({
      resourceType: ResourceType.BED,
      resourceOwnerId,
      caseId,
      ttlSeconds: ttl,
      requiresSecondaryAck,
      actor: user.uid,
    });

    return {
      data: hold,
      meta: {
        caseId,
        hospitalId: dto.hospitalId,
        category: dto.category,
        ttlSeconds: ttl,
        requiresSecondaryAck,
      },
    };
  }

  // ── FR-AMB-001: Ambulance Search (C-06 searching state) ──────────────────────

  @Get('ambulances/search')
  @ApiOperation({
    summary: 'C-06: FR-AMB-001/002 — Search for on-duty ambulances (BR-01 90s SLA, BR-03 20s offer window)',
  })
  async searchAmbulances(@Query() query: AmbulanceSearchQueryDto) {
    const drivers = await this.ambulanceService.searchAvailableDrivers(
      query.lat,
      query.lng,
      query.radiusKm,
    );
    return {
      data: drivers,
      meta: {
        count: drivers.length,
        lat: query.lat,
        lng: query.lng,
        radiusKm: query.radiusKm ?? 5,
        // TD-003: geo-proximity sort pending
        geoSort: false,
      },
    };
  }

  // ── FR-AMB-001: Create Ambulance Request (links to case, starts matching) ─────

  @Post('ambulances/requests')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'FR-AMB-001 — Create ambulance request (starts SEARCHING → dispatch engine picks up)',
  })
  async createAmbulanceRequest(
    @Body() dto: CreateAmbulanceRequestDto,
    @CurrentUser() user: { uid: string },
  ) {
    const request = await this.ambulanceService.createRequest({
      caseId: dto.caseId,
      actorId: user.uid,
      pickupLat: dto.pickupLat,
      pickupLng: dto.pickupLng,
      severity: dto.severity,
    });

    return { data: request, meta: { caseId: dto.caseId } };
  }

  // ── FR-AMB-003: Get Ambulance Request status by Case ID (C-07 tracking) ───────

  @Get('ambulances/by-case/:caseId')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'C-07: FR-AMB-003 — Get active ambulance request for a case',
  })
  async getAmbulanceRequestByCaseId(@Param('caseId') caseId: string) {
    const request = await this.ambulanceService.getRequestByCaseId(caseId);
    return { data: request, meta: { caseId } };
  }

  // ── Utility ───────────────────────────────────────────────────────────────────

  // BR-05: triage data is routing metadata only, never auto-diagnosis.
  // Simple heuristic: unresponsive OR not breathing = CRITICAL.
  private computeSeverity(triage: CreateCitizenCaseDto['triage']): CaseSeverity {
    // Legacy rule-based hint for meta only — CaseService TRIAGE_INTAKE (NIM/fallback) sets Case.severity.
    if (!triage) return CaseSeverity.ROUTINE;
    if (!triage.isConscious || !triage.isBreathing) {
      return CaseSeverity.CRITICAL;
    }
    if (triage.hasVisibleBleeding) {
      return CaseSeverity.URGENT;
    }
    return CaseSeverity.MODERATE;
  }
}
