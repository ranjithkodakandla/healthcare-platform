import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@sahayak/shared-constants';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AuthenticatedPrincipal } from '../auth/auth-provider.interface';
import {
  PRIVACY_POLICY_VERSION,
  TERMS_VERSION,
} from './retention.policy';
import { PrivacyService } from './privacy.service';

class AcceptPoliciesDto {
  privacyPolicy?: boolean;
  terms?: boolean;
  emergencyProcessing?: boolean;
}

class ErasureDto {
  reason?: string;
  confirm?: boolean;
}

@ApiTags('privacy')
@Controller('v1/privacy')
export class PrivacyController {
  constructor(private readonly privacy: PrivacyService) {}

  @Get('notices')
  @ApiOperation({ summary: 'Public privacy/terms notice versions (no auth)' })
  notices() {
    return {
      data: {
        privacyPolicyVersion: PRIVACY_POLICY_VERSION,
        termsVersion: TERMS_VERSION,
        summary:
          'Sahayak collects only what is needed to coordinate emergency and care requests. You can view, export, withdraw consent, or request deletion of your personal data.',
        emergencyNote:
          'In a medical emergency we may process limited location and triage answers to dispatch help, even before you create an account.',
        contact: 'privacy@sahayak.in',
      },
    };
  }

  @Get('me')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(
    Role.CITIZEN,
    Role.FAMILY_CAREGIVER,
    Role.GUEST,
    Role.ADMIN,
    Role.PROVIDER_STAFF,
    Role.PLATFORM_COORDINATOR,
  )
  @ApiBearerAuth()
  @ApiOperation({ summary: 'DPDP — view my data summary' })
  async me(@CurrentUser() user: AuthenticatedPrincipal) {
    return { data: await this.privacy.getMyDataSummary(user.uid) };
  }

  @Get('export')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(
    Role.CITIZEN,
    Role.FAMILY_CAREGIVER,
    Role.GUEST,
    Role.ADMIN,
    Role.PROVIDER_STAFF,
    Role.PLATFORM_COORDINATOR,
  )
  @ApiBearerAuth()
  @ApiOperation({ summary: 'DPDP — download / portability export (JSON)' })
  async export(@CurrentUser() user: AuthenticatedPrincipal) {
    return { data: await this.privacy.exportMyData(user.uid) };
  }

  @Get('consents')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(
    Role.CITIZEN,
    Role.FAMILY_CAREGIVER,
    Role.GUEST,
    Role.ADMIN,
    Role.PROVIDER_STAFF,
    Role.PLATFORM_COORDINATOR,
  )
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List my consent grants' })
  async consents(@CurrentUser() user: AuthenticatedPrincipal) {
    return { data: await this.privacy.listConsents(user.uid) };
  }

  @Post('consents/accept')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(
    Role.CITIZEN,
    Role.FAMILY_CAREGIVER,
    Role.GUEST,
    Role.ADMIN,
    Role.PROVIDER_STAFF,
    Role.PLATFORM_COORDINATOR,
  )
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Accept privacy policy / terms / emergency processing' })
  async accept(@CurrentUser() user: AuthenticatedPrincipal, @Body() body: AcceptPoliciesDto) {
    return { data: await this.privacy.acceptPolicies(user.uid, body ?? {}) };
  }

  @Delete('consents/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(
    Role.CITIZEN,
    Role.FAMILY_CAREGIVER,
    Role.GUEST,
    Role.ADMIN,
    Role.PROVIDER_STAFF,
    Role.PLATFORM_COORDINATOR,
  )
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Withdraw a consent grant' })
  async revoke(@CurrentUser() user: AuthenticatedPrincipal, @Param('id') id: string) {
    return { data: await this.privacy.revokeConsent(user.uid, id) };
  }

  @Post('erasure')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(
    Role.CITIZEN,
    Role.FAMILY_CAREGIVER,
    Role.GUEST,
    Role.ADMIN,
    Role.PROVIDER_STAFF,
    Role.PLATFORM_COORDINATOR,
  )
  @ApiBearerAuth()
  @ApiOperation({ summary: 'DPDP — request erasure / account deactivation' })
  async erasure(@CurrentUser() user: AuthenticatedPrincipal, @Body() body: ErasureDto) {
    if (body?.confirm !== true) {
      return {
        data: {
          status: 'confirmation_required',
          message: 'Send { "confirm": true } to anonymize your personal data and deactivate the account.',
        },
      };
    }
    return { data: await this.privacy.requestErasure(user.uid, body.reason) };
  }

  @Get('retention')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin — view retention policy configuration' })
  async retention() {
    return { data: await this.privacy.getRetentionPolicy() };
  }
}
