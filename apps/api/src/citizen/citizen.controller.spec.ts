import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ExecutionContext, NotFoundException } from '@nestjs/common';
import { CitizenController } from './citizen.controller';
import { CitizenBedSearchService } from './citizen-bed-search.service';
import { CitizenAmbulanceService } from './citizen-ambulance.service';
import { CaseService } from '../core/case.service';
import { ResourceCoordinationService } from '../resource-coordination/resource-coordination.service';
import { AuthGuard } from '../shared-services/auth/auth.guard';
import { BedCategory, CaseSeverity } from '@sahayak/shared-constants';

const mockBedSearch = {
  searchBeds: jest.fn(),
  getHospitalBedSummary: jest.fn(),
};

const mockAmbulanceService = {
  searchAvailableDrivers: jest.fn(),
  createRequest: jest.fn(),
  getRequestByCaseId: jest.fn(),
};

const mockCaseService = {
  createGuestCase: jest.fn(),
  createCase: jest.fn(),
  getTimeline: jest.fn(),
};

const mockResourceCoordination = {
  ensureCapacity: jest.fn(),
  createHold: jest.fn(),
};

const fakeUser = { uid: 'user-123', role: 'CITIZEN' };

// Bypass live Firebase auth for controller tests — same pattern as provider/admin specs.
const mockAuthGuard = {
  canActivate: (ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    req.user = fakeUser;
    return true;
  },
};

describe('CitizenController', () => {
  let controller: CitizenController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CitizenController],
      providers: [
        { provide: CitizenBedSearchService, useValue: mockBedSearch },
        { provide: CitizenAmbulanceService, useValue: mockAmbulanceService },
        { provide: CaseService, useValue: mockCaseService },
        { provide: ResourceCoordinationService, useValue: mockResourceCoordination },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .compile();

    controller = module.get<CitizenController>(CitizenController);
    jest.clearAllMocks();
  });

  // ── Bed Search ────────────────────────────────────────────────────────────────

  describe('searchBeds', () => {
    it('returns results with staleness and meta (FR-BED-002, §13.1)', async () => {
      const rows = [
        { hospitalId: 'h1', category: 'ICU', availableCount: 3, stalenessStatus: 'FRESH', distanceKm: null, occupiedCount: 7, totalCount: 10, occupancyPercent: 70, lastUpdatedAt: new Date() },
      ];
      mockBedSearch.searchBeds.mockResolvedValue(rows);

      const result = await controller.searchBeds({ category: BedCategory.ICU });

      expect(result.data).toHaveLength(1);
      expect(result.meta.category).toBe('ICU');
      expect(result.meta.geoSort).toBe(false); // TD-003 placeholder
    });

    it('returns ALL categories when no filter supplied', async () => {
      mockBedSearch.searchBeds.mockResolvedValue([]);
      const result = await controller.searchBeds({});
      expect(result.meta.category).toBe('ALL');
      expect(mockBedSearch.searchBeds).toHaveBeenCalledWith({});
    });
  });

  describe('getHospitalBedSummary', () => {
    it('returns per-category summary for a hospital', async () => {
      mockBedSearch.getHospitalBedSummary.mockResolvedValue([]);
      const result = await controller.getHospitalBedSummary('hospital-abc');
      expect(result.meta.hospitalId).toBe('hospital-abc');
    });
  });

  // ── Guest Case Creation ───────────────────────────────────────────────────────

  describe('createGuestCase', () => {
    const triage = { isConscious: false, isBreathing: false, hasVisibleBleeding: false };
    const location = { lat: 12.97, lng: 77.59 };

    it('throws if deviceId missing (BR-06 enforcement)', async () => {
      await expect(
        controller.createGuestCase({ location, triage }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('computes CRITICAL severity from triage (unresponsive, BR-05)', async () => {
      const kase = { id: 'case-1', caseNumber: 'HCC-2026-0000001' };
      mockCaseService.createGuestCase.mockResolvedValue(kase);

      const result = await controller.createGuestCase({
        deviceId: 'device-xyz',
        location,
        triage, // isConscious=false → CRITICAL
      });

      // meta.severity falls back to local triage hint when Case.severity unset on mock.
      expect(result.meta.severity).toBe(CaseSeverity.CRITICAL);
      expect(mockCaseService.createGuestCase).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId: 'device-xyz',
          initialPayload: expect.objectContaining({
            triage,
            source: 'citizen_app_guest',
          }),
        }),
      );
    });

    it('computes URGENT severity when conscious + breathing + bleeding', async () => {
      mockCaseService.createGuestCase.mockResolvedValue({ id: 'case-2' });
      const bleedingTriage = { isConscious: true, isBreathing: true, hasVisibleBleeding: true };
      const result = await controller.createGuestCase({ deviceId: 'dev', location, triage: bleedingTriage });
      expect(result.meta.severity).toBe(CaseSeverity.URGENT);
    });

    it('computes MODERATE when all clear', async () => {
      mockCaseService.createGuestCase.mockResolvedValue({ id: 'case-3' });
      const clearTriage = { isConscious: true, isBreathing: true, hasVisibleBleeding: false };
      const result = await controller.createGuestCase({ deviceId: 'dev', location, triage: clearTriage });
      expect(result.meta.severity).toBe(CaseSeverity.MODERATE);
    });
  });

  // ── Authenticated Case Creation ───────────────────────────────────────────────

  describe('createCase', () => {
    it('creates case with user uid as actor', async () => {
      const kase = { id: 'case-auth-1' };
      mockCaseService.createCase.mockResolvedValue(kase);
      const triage = { isConscious: true, isBreathing: true, hasVisibleBleeding: false };

      const result = await controller.createCase(
        { location: { lat: 12, lng: 77 }, triage },
        fakeUser,
      );

      expect(mockCaseService.createCase).toHaveBeenCalledWith(
        expect.objectContaining({ actor: fakeUser.uid, initiatorId: fakeUser.uid }),
      );
      expect(result.data).toBe(kase);
    });
  });

  // ── Bed Hold (FR-BED-003 / BR-02 / BR-04) ────────────────────────────────────

  describe('placeBedHold', () => {
    it('places General hold with 600s TTL, no secondaryAck', async () => {
      mockResourceCoordination.ensureCapacity.mockResolvedValue({});
      mockResourceCoordination.createHold.mockResolvedValue({ id: 'hold-1', status: 'PENDING' });

      const result = await controller.placeBedHold(
        'case-1',
        { hospitalId: 'hospital-1', category: BedCategory.GENERAL },
        fakeUser,
      );

      expect(mockResourceCoordination.createHold).toHaveBeenCalledWith(
        expect.objectContaining({ ttlSeconds: 600, requiresSecondaryAck: false }),
      );
      expect(result.meta.ttlSeconds).toBe(600);
      expect(result.meta.requiresSecondaryAck).toBe(false);
    });

    it('places ICU hold with 300s TTL and requiresSecondaryAck=true (BR-04)', async () => {
      mockResourceCoordination.ensureCapacity.mockResolvedValue({});
      mockResourceCoordination.createHold.mockResolvedValue({ id: 'hold-2', status: 'PENDING' });

      const result = await controller.placeBedHold(
        'case-1',
        { hospitalId: 'hospital-1', category: BedCategory.ICU },
        fakeUser,
      );

      expect(mockResourceCoordination.createHold).toHaveBeenCalledWith(
        expect.objectContaining({ ttlSeconds: 300, requiresSecondaryAck: true }),
      );
      expect(result.meta.requiresSecondaryAck).toBe(true);
    });

    it('places VENTILATOR hold with requiresSecondaryAck=true (BR-04)', async () => {
      mockResourceCoordination.ensureCapacity.mockResolvedValue({});
      mockResourceCoordination.createHold.mockResolvedValue({ id: 'hold-3' });

      const result = await controller.placeBedHold(
        'case-1',
        { hospitalId: 'h1', category: BedCategory.VENTILATOR },
        fakeUser,
      );

      expect(result.meta.requiresSecondaryAck).toBe(true);
      expect(result.meta.ttlSeconds).toBe(300);
    });
  });

  // ── Ambulance Search + Request ────────────────────────────────────────────────

  describe('searchAmbulances', () => {
    it('returns available drivers with geo placeholder (TD-003)', async () => {
      mockAmbulanceService.searchAvailableDrivers.mockResolvedValue([
        { driverUid: 'drv-1', vehicleReg: 'KA-01 AB 4521', vehicleType: 'BASIC_LIFE_SUPPORT', isOnDuty: true, distanceKm: null },
      ]);

      const result = await controller.searchAmbulances({ lat: 12.97, lng: 77.59 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.geoSort).toBe(false);
      expect(result.data[0].distanceKm).toBeNull(); // TD-003 confirmed
    });
  });

  describe('createAmbulanceRequest', () => {
    it('creates request linked to case', async () => {
      mockAmbulanceService.createRequest.mockResolvedValue({ id: 'req-1', caseId: 'case-1', status: 'SEARCHING' });

      const result = await controller.createAmbulanceRequest(
        { caseId: 'case-1', pickupLat: 12.97, pickupLng: 77.59 },
        fakeUser,
      );

      expect(result.data.status).toBe('SEARCHING');
      expect(mockAmbulanceService.createRequest).toHaveBeenCalledWith(
        expect.objectContaining({ caseId: 'case-1', actorId: fakeUser.uid }),
      );
    });
  });

  describe('getAmbulanceRequestByCaseId', () => {
    it('returns active request for a case', async () => {
      const req = { id: 'req-1', caseId: 'case-1', status: 'EN_ROUTE_PICKUP', driver: null };
      mockAmbulanceService.getRequestByCaseId.mockResolvedValue(req);

      const result = await controller.getAmbulanceRequestByCaseId('case-1');

      expect(result.data.status).toBe('EN_ROUTE_PICKUP');
    });

    it('propagates NotFoundException from service', async () => {
      mockAmbulanceService.getRequestByCaseId.mockRejectedValue(
        new NotFoundException('No active ambulance request'),
      );
      await expect(controller.getAmbulanceRequestByCaseId('no-case')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('getCaseTimeline', () => {
    it('returns timeline events for a case (§A3.2 append-only)', async () => {
      const events = [
        { id: 'ev-1', caseId: 'case-1', type: 'case.created', payload: {}, createdAt: new Date() },
      ];
      mockCaseService.getTimeline.mockResolvedValue(events);

      const result = await controller.getCaseTimeline('case-1');

      expect(result.data).toHaveLength(1);
      expect(result.meta.count).toBe(1);
    });
  });
});
