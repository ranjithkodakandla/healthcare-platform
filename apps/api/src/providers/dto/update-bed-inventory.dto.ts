import { ApiProperty } from '@nestjs/swagger';
import { BedCategory } from '@sahayak/shared-constants';

export class BedCategoryUpdateDto {
  @ApiProperty({ enum: BedCategory })
  category: BedCategory;

  @ApiProperty({ description: 'Count of available beds in this category' })
  availableCount: number;

  @ApiProperty({ description: 'Count of occupied beds in this category' })
  occupiedCount: number;

  @ApiProperty({ description: 'Total bed capacity for this category' })
  totalCount: number;
}

export class UpdateBedInventoryDto {
  @ApiProperty({ type: [BedCategoryUpdateDto] })
  updates: BedCategoryUpdateDto[];

  @ApiProperty({
    required: false,
    description: 'Required when occupied+available > total — override reason (logged in audit)',
  })
  overrideReason?: string;
}

// WhatsApp Tier 1 ingestion parity (FR-BED-001 + L6).
// Parsed from WhatsApp message text — same underlying service call as portal update (L2).
export class WhatsAppBedUpdateDto {
  @ApiProperty({ description: 'Parsed bed updates from WhatsApp message' })
  updates: BedCategoryUpdateDto[];

  @ApiProperty({
    description: 'Raw WhatsApp message text (stored for audit; normalisation done server-side)',
    required: false,
  })
  rawMessage?: string;
}

export class ConfirmHoldDto {
  @ApiProperty({ description: 'Actor role at this hospital for RBAC check' })
  actorRole: string;
}

export class DeclineHoldDto {
  @ApiProperty({ description: 'Mandatory reason for declining (logged in audit)' })
  reason: string;
}

export class ClinicalAckDto {
  @ApiProperty({ description: 'Clinical lead role (must be HOSPITAL_CLINICAL_LEAD)' })
  actorRole: string;
}
