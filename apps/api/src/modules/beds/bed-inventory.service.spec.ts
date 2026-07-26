import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BedInventoryService } from './bed-inventory.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../shared-services/audit/audit.service';
import { EVENT_PUBLISHER } from '../../shared-services/event-bus/event-publisher.interface';
import { BedCategory, BedInventoryStatus, DomainEvent } from '@sahayak/shared-constants';

const HOSPITAL_ID = 'hosp-test-001';
const ACTOR_ID = 'admissions-staff-uid-1';

const mockHospitalBedInventory = {
  findUnique: jest.fn(),
  upsert: jest.fn(),
  findMany: jest.fn(),
  count: jest.fn(),
};

const mockPrisma: any = {
  hospitalBedInventory: mockHospitalBedInventory,
  $transaction: jest.fn((fn: (tx: any) => unknown) => fn(mockPrisma)),
};

const mockAudit = { record: jest.fn() };
const mockEvents = { publish: jest.fn() };
const mockConfig = { get: jest.fn().mockReturnValue(6) };

describe('BedInventoryService', () => {
  let service: BedInventoryService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BedInventoryService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
        { provide: EVENT_PUBLISHER, useValue: mockEvents },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();
    service = module.get(BedInventoryService);
  });

  describe('updateBedCounts', () => {
    it('updates counts, resets staleness to FRESH, audits, and emits event', async () => {
      const updatedRow = {
        id: 'row-1',
        hospitalId: HOSPITAL_ID,
        category: BedCategory.GENERAL,
        availableCount: 5,
        occupiedCount: 45,
        totalCount: 50,
        stalenessStatus: BedInventoryStatus.FRESH,
        lastUpdatedAt: new Date(),
        lastUpdatedBy: ACTOR_ID,
        version: 2,
      };

      mockPrisma.hospitalBedInventory.findUnique.mockResolvedValue(null);
      mockPrisma.hospitalBedInventory.upsert.mockResolvedValue(updatedRow);

      const result = await service.updateBedCounts(HOSPITAL_ID, ACTOR_ID, [
        { category: BedCategory.GENERAL, availableCount: 5, occupiedCount: 45, totalCount: 50 },
      ]);

      expect(result).toHaveLength(1);
      expect(result[0].stalenessStatus).toBe(BedInventoryStatus.FRESH);
      expect(mockAudit.record).toHaveBeenCalledTimes(1);
      expect(mockAudit.record.mock.calls[0][0]).toMatchObject({
        action: 'BED_INVENTORY_UPDATED',
        entityType: 'HospitalBedInventory',
      });
      expect(mockEvents.publish).toHaveBeenCalledWith(
        DomainEvent.BED_INVENTORY_UPDATED,
        expect.objectContaining({ hospitalId: HOSPITAL_ID }),
      );
    });

    it('rejects negative counts', async () => {
      await expect(
        service.updateBedCounts(HOSPITAL_ID, ACTOR_ID, [
          { category: BedCategory.ICU, availableCount: -1, occupiedCount: 0, totalCount: 5 },
        ]),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects occupied+available > total without overrideReason', async () => {
      await expect(
        service.updateBedCounts(HOSPITAL_ID, ACTOR_ID, [
          { category: BedCategory.GENERAL, availableCount: 10, occupiedCount: 45, totalCount: 50 },
        ]),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows occupied+available > total when overrideReason is provided', async () => {
      const updatedRow = {
        id: 'row-2',
        hospitalId: HOSPITAL_ID,
        category: BedCategory.GENERAL,
        availableCount: 10,
        occupiedCount: 45,
        totalCount: 50,
        stalenessStatus: BedInventoryStatus.FRESH,
        lastUpdatedAt: new Date(),
        lastUpdatedBy: ACTOR_ID,
        version: 1,
      };
      mockPrisma.hospitalBedInventory.findUnique.mockResolvedValue(null);
      mockPrisma.hospitalBedInventory.upsert.mockResolvedValue(updatedRow);

      const result = await service.updateBedCounts(
        HOSPITAL_ID,
        ACTOR_ID,
        [{ category: BedCategory.GENERAL, availableCount: 10, occupiedCount: 45, totalCount: 50 }],
        'Temporary mattress beds added pending census reconciliation',
      );

      expect(result).toHaveLength(1);
    });
  });

  describe('getBedInventory', () => {
    it('returns all category rows for a hospital ordered by category', async () => {
      const rows = [
        { id: '1', category: BedCategory.GENERAL, availableCount: 5 },
        { id: '2', category: BedCategory.ICU, availableCount: 2 },
      ];
      mockPrisma.hospitalBedInventory.findMany.mockResolvedValue(rows);

      const result = await service.getBedInventory(HOSPITAL_ID);
      expect(result).toHaveLength(2);
      expect(mockPrisma.hospitalBedInventory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { hospitalId: HOSPITAL_ID } }),
      );
    });
  });

  describe('isInventoryFresh', () => {
    it('returns true when no STALE rows', async () => {
      mockPrisma.hospitalBedInventory.count.mockResolvedValue(0);
      expect(await service.isInventoryFresh(HOSPITAL_ID)).toBe(true);
    });

    it('returns false when stale rows exist', async () => {
      mockPrisma.hospitalBedInventory.count.mockResolvedValue(2);
      expect(await service.isInventoryFresh(HOSPITAL_ID)).toBe(false);
    });
  });
});
