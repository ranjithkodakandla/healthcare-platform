import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BedCategory, CaseSeverity } from '@sahayak/shared-constants';

export class CreateWalkInCaseDto {
  @ApiProperty({ enum: CaseSeverity }) severity!: CaseSeverity;
  @ApiProperty({ enum: BedCategory }) category!: BedCategory;
  @ApiPropertyOptional() patientName?: string;
}
