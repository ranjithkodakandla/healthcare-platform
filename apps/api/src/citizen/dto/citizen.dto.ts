import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BedCategory, CaseSeverity } from '@sahayak/shared-constants';

// ── Bed Search ────────────────────────────────────────────────────────────────

export class BedSearchQueryDto {
  @ApiPropertyOptional({ description: 'Latitude of citizen location (for future geo-sort, TD-003)' })
  lat?: number;

  @ApiPropertyOptional({ description: 'Longitude of citizen location (for future geo-sort, TD-003)' })
  lng?: number;

  @ApiPropertyOptional({ description: 'Search radius in km (default 10)', default: 10 })
  radiusKm?: number;

  @ApiPropertyOptional({ enum: BedCategory, description: 'Filter by bed category' })
  category?: BedCategory;

  @ApiPropertyOptional({ description: 'Exclude STALE results (default false)', default: false })
  freshOnly?: boolean;
}

// ── Triage / Create Case (C-05 triage intake) ─────────────────────────────────

export class TriageDataDto {
  @ApiProperty({ description: 'Is patient conscious?' })
  isConscious!: boolean;

  @ApiProperty({ description: 'Is patient breathing?' })
  isBreathing!: boolean;

  @ApiProperty({ description: 'Is there visible bleeding?' })
  hasVisibleBleeding!: boolean;
}

export class CreateCitizenCaseDto {
  @ApiPropertyOptional({ description: 'Citizen Firebase UID (omit for guest flow)' })
  citizenUid?: string;

  @ApiPropertyOptional({ description: 'Device ID — required for guest flow (GT-10/BR-06)' })
  deviceId?: string;

  @ApiProperty({ description: 'Pickup location { lat, lng, address }' })
  location!: Record<string, unknown>;

  @ApiProperty({ type: TriageDataDto, description: 'BR-05: routing metadata only, not a diagnosis' })
  triage!: TriageDataDto;

  @ApiPropertyOptional({ enum: CaseSeverity, description: 'Override computed severity' })
  severity?: CaseSeverity;
}

// ── Bed Hold ─────────────────────────────────────────────────────────────────

export class PlaceBedHoldDto {
  @ApiProperty({ description: 'Hospital ID to place hold against' })
  hospitalId!: string;

  @ApiProperty({ enum: BedCategory, description: 'Bed category (BR-04: ICU/Vent requires secondaryAck)' })
  category!: BedCategory;

  @ApiPropertyOptional({ description: 'Case ID to link hold to' })
  caseId?: string;
}

// ── Ambulance Search ──────────────────────────────────────────────────────────

export class AmbulanceSearchQueryDto {
  @ApiProperty({ description: 'Latitude of pickup location' })
  lat!: number;

  @ApiProperty({ description: 'Longitude of pickup location' })
  lng!: number;

  @ApiPropertyOptional({ description: 'Search radius in km (default 5)', default: 5 })
  radiusKm?: number;
}

// ── Create Ambulance Request ──────────────────────────────────────────────────

export class CreateAmbulanceRequestDto {
  @ApiProperty({ description: 'Case ID for the emergency' })
  caseId!: string;

  @ApiProperty({ description: 'Pickup latitude' })
  pickupLat!: number;

  @ApiProperty({ description: 'Pickup longitude' })
  pickupLng!: number;

  @ApiPropertyOptional({ enum: CaseSeverity })
  severity?: CaseSeverity;
}
