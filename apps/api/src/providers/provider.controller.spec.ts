import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { ProviderController } from './provider.controller';
import { BedInventoryService } from '../modules/beds/bed-inventory.service';
import { IncomingPatientsService, ClinicalAckService } from '../modules/beds/incoming-patients.service';
import { ProviderUserService } from './provider-user.service';
import { ProviderConfigService } from './provider-config.service';
import { ProviderAuditService } from './provider-audit.service';
import { AuthGuard } from '../shared-services/auth/auth.guard';
import { RolesGuard } from '../shared-services/auth/roles.guard';
import { BedCategory, BedInventoryStatus } from '@sahayak/shared-constants';

const HOSPITAL_ID = 'hosp-001';
const ACTOR_ID = 'staff-uid-1';

// Bypass live Firebase auth for controller tests — fabricate a principal directly,
// same pattern as AdminController spec (Session 7).
const mockAuthGuard = {
  canActivate: (ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    req.user = { uid: ACTOR_ID, role: 'PROVIDER_STAFF' };
    return true;
  },
};
const mockRolesGuard = { canActivate: () => true };

const mockBedInventory = {
  updateBedCounts: jest.fn(),
  getBedInventory: jest.fn(),
  isInventoryFresh: jest.fn(),
};
const mockIncomingPatients = {
  getIncomingQueue: jest.fn(),
  confirmHold: jest.fn(),
  declineHold: jest.fn(),
};
const mockClinicalAck = { acknowledgeHold: jest.fn() };
const mockProviderUserService = { inviteUser: jest.fn() };
const mockProviderConfigService = { getHoldExpiryConfig: jest.fn() };
const mockProviderAuditService = { listForHospital: jest.fn() };

describe('ProviderController', () => {
  let controller: ProviderController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProviderController],
      providers: [
        { provide: BedInventoryService, useValue: mockBedInventory },
        { provide: IncomingPatientsService, useValue: mockIncomingPatients },
        { provide: ClinicalAckService, useValue: mockClinicalAck },
        { provide: ProviderUserService, useValue: mockProviderUserService },
        { provide: ProviderConfigService, useValue: mockProviderConfigService },
        { provide: ProviderAuditService, useValue: mockProviderAuditService },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile();
    controller = module.get(ProviderController);
  });

  describe('PUT /v1/providers/:hospitalId/beds (FR-BED-001)', () => {
    it('returns updated inventory rows', async () => {
      const updatedRow = {
        id: 'row-1',
        hospitalId: HOSPITAL_ID,
        category: BedCategory.GENERAL,
        availableCount: 5,
        occupiedCount: 45,
        totalCount: 50,
        stalenessStatus: BedInventoryStatus.FRESH,
        lastUpdatedAt: new Date(),
        version: 2,
      };
      mockBedInventory.updateBedCounts.mockResolvedValue([updatedRow]);

      const result = await controller.updateBedInventory(
        HOSPITAL_ID,
        { updates: [{ category: BedCategory.GENERAL, availableCount: 5, occupiedCount: 45, totalCount: 50 }] },
        { uid: ACTOR_ID } as any,
      );

      expect(result.data).toHaveLength(1);
      expect(result.meta).toMatchObject({ hospitalId: HOSPITAL_ID, updatedCount: 1 });
      expect(mockBedInventory.updateBedCounts).toHaveBeenCalledWith(
        HOSPITAL_ID,
        ACTOR_ID,
        expect.any(Array),
        undefined,
      );
    });
  });

  describe('POST /v1/providers/:hospitalId/beds/whatsapp-update (FR-BED-001 L2 parity)', () => {
    it('calls the same BedInventoryService — identical outcome to portal path', async () => {
      const row = { id: 'row-2', hospitalId: HOSPITAL_ID, category: BedCategory.ICU };
      mockBedInventory.updateBedCounts.mockResolvedValue([row]);

      const result = await controller.whatsappBedUpdate(
        HOSPITAL_ID,
        {
          updates: [{ category: BedCategory.ICU, availableCount: 2, occupiedCount: 3, totalCount: 5 }],
          rawMessage: 'ICU 2 available 3 occupied',
        },
        { uid: ACTOR_ID } as any,
      );

      expect(result.meta.source).toBe('whatsapp_tier1');
      // Crucial L2 check: same service method called as portal path (L2 parity)
      expect(mockBedInventory.updateBedCounts).toHaveBeenCalledWith(
        HOSPITAL_ID,
        ACTOR_ID,
        expect.any(Array),
        // no overrideReason — WhatsApp path doesn't support override
      );
    });
  });

  describe('GET /v1/providers/:hospitalId/dashboard', () => {
    it('aggregates inventory and queue into dashboard summary', async () => {
      mockBedInventory.getBedInventory.mockResolvedValue([
        { totalCount: 50, occupiedCount: 41, availableCount: 9 },
        { totalCount: 10, occupiedCount: 8, availableCount: 2 },
      ]);
      mockIncomingPatients.getIncomingQueue.mockResolvedValue([
        { requiresSecondaryAck: true, caseId: 'case-1' },
        { requiresSecondaryAck: false, caseId: null },
      ]);
      mockBedInventory.isInventoryFresh.mockResolvedValue(true);

      const result = await controller.getDashboard(HOSPITAL_ID);
      expect(result.data.bedOccupancy.total).toBe(60);
      expect(result.data.pendingActionsCount).toBe(2);
      expect(result.data.pendingClinicalAckCount).toBe(1);
      expect(result.data.stalenessStatus).toBe('FRESH');
    });
  });

  describe('POST /v1/providers/:hospitalId/holds/:holdId/confirm', () => {
    it('calls IncomingPatientsService.confirmHold and returns CONFIRMED status', async () => {
      mockIncomingPatients.confirmHold.mockResolvedValue(undefined);

      const result = await controller.confirmHold(HOSPITAL_ID, 'hold-1', {
        uid: ACTOR_ID,
        role: 'HOSPITAL_ADMISSIONS_STAFF',
      } as any);

      expect(result.data.status).toBe('CONFIRMED');
      expect(mockIncomingPatients.confirmHold).toHaveBeenCalledWith(
        HOSPITAL_ID,
        'hold-1',
        ACTOR_ID,
        'HOSPITAL_ADMISSIONS_STAFF',
      );
    });
  });

  describe('POST /v1/providers/:hospitalId/holds/:holdId/clinical-ack (FR-HOSP-002 zero-tolerance)', () => {
    it('calls ClinicalAckService.acknowledgeHold with the actorRole from body', async () => {
      mockClinicalAck.acknowledgeHold.mockResolvedValue(undefined);

      const result = await controller.clinicalAck(
        HOSPITAL_ID,
        'hold-icu-1',
        { actorRole: 'HOSPITAL_CLINICAL_LEAD' },
        { uid: ACTOR_ID } as any,
      );

      expect(result.data.clinicalAckLogged).toBe(true);
      expect(mockClinicalAck.acknowledgeHold).toHaveBeenCalledWith(
        HOSPITAL_ID,
        'hold-icu-1',
        ACTOR_ID,
        'HOSPITAL_CLINICAL_LEAD',
      );
    });
  });

  describe('POST /v1/providers/:hospitalId/users (P-10 Add user)', () => {
    it('provisions a staff account via ProviderUserService', async () => {
      mockProviderUserService.inviteUser.mockResolvedValue({
        uid: 'new-uid',
        name: 'Kavitha R.',
        email: 'kavitha@apollo.example',
        role: 'HOSPITAL_ADMISSIONS_STAFF',
        passwordResetLink: 'https://example.com/reset',
      });

      const result = await controller.inviteUser(
        HOSPITAL_ID,
        { name: 'Kavitha R.', email: 'kavitha@apollo.example', role: 'HOSPITAL_ADMISSIONS_STAFF' as any },
        { uid: ACTOR_ID } as any,
      );

      expect(result.data.uid).toBe('new-uid');
      expect(mockProviderUserService.inviteUser).toHaveBeenCalledWith(
        HOSPITAL_ID,
        expect.objectContaining({ email: 'kavitha@apollo.example' }),
        ACTOR_ID,
      );
    });
  });

  describe('GET /v1/providers/:hospitalId/config (P-11)', () => {
    it('returns severity-keyed hold-expiry rows (Finding #7 fix)', async () => {
      mockProviderConfigService.getHoldExpiryConfig.mockResolvedValue([
        { label: 'CRITICAL bed hold expiry', value: '30 min' },
        { label: 'PLANNED bed hold expiry', value: '120 min' },
      ]);

      const result = await controller.getConfig(HOSPITAL_ID);

      expect(result.data.holdExpiry).toHaveLength(2);
      expect(result.meta).toMatchObject({ hospitalId: HOSPITAL_ID });
    });
  });

  describe('GET /v1/providers/:hospitalId/audit (P-12)', () => {
    it('returns real audit rows scoped to this hospital', async () => {
      mockProviderAuditService.listForHospital.mockResolvedValue([
        { id: 'a1', actor: ACTOR_ID, action: 'BED_INVENTORY_UPDATED', entityType: 'HospitalBedInventory', entityId: 'row-1', createdAt: new Date(), metadata: {} },
      ]);

      const result = await controller.getAuditLog(HOSPITAL_ID);

      expect(result.data).toHaveLength(1);
      expect(mockProviderAuditService.listForHospital).toHaveBeenCalledWith(HOSPITAL_ID);
    });
  });
});
