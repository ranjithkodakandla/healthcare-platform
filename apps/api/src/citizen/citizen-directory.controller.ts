import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CitizenDirectoryService } from './citizen-directory.service';

// Modules 3–9 citizen search surfaces (no auth — browse/search is public, holds require auth later).
@ApiTags('Citizen Directory')
@Controller('v1/citizen')
export class CitizenDirectoryController {
  constructor(private readonly directory: CitizenDirectoryService) {}

  @Get('doctors/search')
  @ApiOperation({ summary: 'C-15: Module 3 doctor search by specialty' })
  async searchDoctors(
    @Query('specialty') specialty?: string,
    @Query('q') q?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
  ) {
    const data = await this.directory.searchDoctors({
      specialty,
      q,
      lat: lat != null ? Number(lat) : undefined,
      lng: lng != null ? Number(lng) : undefined,
    });
    return { data, meta: { count: data.length } };
  }

  @Get('pharmacies/search')
  @ApiOperation({ summary: 'C-20: Module 5 pharmacy stock search by medicine' })
  async searchPharmacies(
    @Query('medicine') medicine?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
  ) {
    const data = await this.directory.searchPharmacies({
      medicine,
      lat: lat != null ? Number(lat) : undefined,
      lng: lng != null ? Number(lng) : undefined,
    });
    return { data, meta: { count: data.length, medicine: medicine ?? 'Insulin' } };
  }

  @Get('blood-banks/search')
  @ApiOperation({ summary: 'C-22: Module 6 blood bank search by group' })
  async searchBloodBanks(
    @Query('bloodGroup') bloodGroup?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
  ) {
    const data = await this.directory.searchBloodBanks({
      bloodGroup,
      lat: lat != null ? Number(lat) : undefined,
      lng: lng != null ? Number(lng) : undefined,
    });
    return { data, meta: { count: data.length, bloodGroup: bloodGroup ?? 'O+' } };
  }

  @Get('diagnostics/search')
  @ApiOperation({ summary: 'C-25: Module 8 diagnostic test search' })
  async searchDiagnostics(
    @Query('q') q?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
  ) {
    const data = await this.directory.searchDiagnostics({
      q,
      lat: lat != null ? Number(lat) : undefined,
      lng: lng != null ? Number(lng) : undefined,
    });
    return { data, meta: { count: data.length } };
  }

  @Get('cancer-centers/search')
  @ApiOperation({ summary: 'C-27: Module 9 cancer centre search by modality' })
  async searchCancer(
    @Query('modality') modality?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
  ) {
    const data = await this.directory.searchCancerCenters({
      modality,
      lat: lat != null ? Number(lat) : undefined,
      lng: lng != null ? Number(lng) : undefined,
    });
    return { data, meta: { count: data.length } };
  }

  @Get('insurance/pre-auth')
  @ApiOperation({ summary: 'C-24: FR-INS-001 latest insurance pre-auth status' })
  async getPreAuth(@Query('caseId') caseId?: string) {
    const data = await this.directory.getLatestPreAuth(caseId);
    return { data, meta: {} };
  }
}
