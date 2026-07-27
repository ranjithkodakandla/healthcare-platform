import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpsertDoctorDto {
  @ApiProperty() name!: string;
  @ApiProperty() specialty!: string;
  @ApiPropertyOptional() isTeleconsult?: boolean;
  @ApiPropertyOptional() nextSlotAt?: string;
  @ApiPropertyOptional() city?: string;
}

export class UpsertDiagnosticOfferingDto {
  @ApiProperty() testName!: string;
  @ApiProperty() priceInr!: number;
  @ApiPropertyOptional() nextSlotAt?: string;
  @ApiPropertyOptional() city?: string;
}
