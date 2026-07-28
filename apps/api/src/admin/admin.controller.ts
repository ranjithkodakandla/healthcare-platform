import { Body, Controller, Get, Header, Param, Patch, Post, Res, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ConsoleRole, OnboardingStage, Role } from '@sahayak/shared-constants';
import { AuthGuard } from '../shared-services/auth/auth.guard';
import { RolesGuard } from '../shared-services/auth/roles.guard';
import { Roles } from '../shared-services/auth/roles.decorator';
import { CurrentUser } from '../shared-services/auth/current-user.decorator';
import { AuthenticatedPrincipal } from '../shared-services/auth/auth-provider.interface';
import { ProviderOnboardingService } from './provider-onboarding.service';
import { ConsoleUserService } from './console-user.service';
import { CreateProviderApplicationDto } from './dto/create-provider-application.dto';
import { CompleteStageDto } from './dto/complete-stage.dto';
import { CreateConsoleUserDto } from './dto/create-console-user.dto';
import { RejectApplicationDto } from './dto/reject-application.dto';
import { UpdateConsoleUserDto } from './dto/update-console-user.dto';

// G4/G9 minimal onboarding slice. `Role.ADMIN` (RolesGuard) gates "is this an
// authenticated Console user at all"; the finer-grained `ConsoleRole` check inside
// each handler (via ConsoleUserService.requireConsoleRole) gates the specific action,
// per I7's ABAC-layered-on-RBAC guidance. Cannot be live-verified end-to-end until
// Phase 2's Firebase login is unblocked (DL-007) — these routes are reachable and
// correctly guarded in code, but no real bearer token exists yet to drive them with.
@ApiTags('admin')
@Controller('v1/admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(
    private readonly onboarding: ProviderOnboardingService,
    private readonly consoleUsers: ConsoleUserService,
  ) {}

  @Post('provider-applications')
  async createApplication(
    @Body() body: CreateProviderApplicationDto,
    @CurrentUser() user: AuthenticatedPrincipal,
  ) {
    await this.consoleUsers.requireConsoleRole(user.uid, [
      ConsoleRole.PROVIDER_ONBOARDING_SPECIALIST,
      ConsoleRole.CONSOLE_ADMINISTRATOR,
    ]);

    const application = await this.onboarding.createApplication({
      providerType: body.providerType,
      legalName: body.legalName,
      actor: user.uid,
      orgId: body.orgId,
      portalEmail: body.portalEmail,
      portalPassword: body.portalPassword,
      city: body.city,
    });

    return { data: application, meta: {}, errors: [] };
  }

  @Get('provider-applications/:id')
  async getApplication(@Param('id') id: string, @CurrentUser() user: AuthenticatedPrincipal) {
    await this.consoleUsers.requireConsoleRole(user.uid, [
      ConsoleRole.PROVIDER_ONBOARDING_SPECIALIST,
      ConsoleRole.CONSOLE_ADMINISTRATOR,
      ConsoleRole.COMPLIANCE_OFFICER,
    ]);

    const application = await this.onboarding.getApplication(id);
    const nextStage = this.onboarding.nextPendingStage(application.stages);
    const portalLive = await this.onboarding.isPortalLive(id);
    const documents = this.onboarding.listVerificationDocuments(application);
    const checklist = this.onboarding.credentialChecklist(application.providerType);
    return {
      data: {
        ...application,
        currentStage: application.status,
        nextStage,
        portalLive,
        documents,
        checklist,
      },
      meta: {},
      errors: [],
    };
  }

  @Get('provider-applications/:id/documents/:docKey')
  @Header('Content-Type', 'application/pdf')
  async downloadDocument(
    @Param('id') id: string,
    @Param('docKey') docKey: string,
    @CurrentUser() user: AuthenticatedPrincipal,
    @Res() res: Response,
  ) {
    await this.consoleUsers.requireConsoleRole(user.uid, [
      ConsoleRole.PROVIDER_ONBOARDING_SPECIALIST,
      ConsoleRole.CONSOLE_ADMINISTRATOR,
      ConsoleRole.COMPLIANCE_OFFICER,
    ]);
    const { filename, body } = await this.onboarding.getVerificationDocument(id, docKey);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(body);
  }

  @Post('provider-applications/:id/stages/:stage/approve')
  async approveStage(
    @Param('id') id: string,
    @Param('stage') stage: OnboardingStage,
    @Body() body: CompleteStageDto,
    @CurrentUser() user: AuthenticatedPrincipal,
  ) {
    await this.consoleUsers.requireConsoleRole(user.uid, [
      ConsoleRole.PROVIDER_ONBOARDING_SPECIALIST,
      ConsoleRole.CONSOLE_ADMINISTRATOR,
    ]);

    await this.onboarding.completeStage({
      applicationId: id,
      stage,
      reviewerId: body.reviewerId || user.uid,
      notes: body.notes,
      checklistComplete: body.checklistComplete,
    });

    const application = await this.onboarding.getApplication(id);
    const portalLive = await this.onboarding.isPortalLive(id);
    const nextStage = this.onboarding.nextPendingStage(application.stages);

    return { data: { application: { ...application, nextStage }, portalLive }, meta: {}, errors: [] };
  }

  @Post('provider-applications/:id/reject')
  async rejectApplication(
    @Param('id') id: string,
    @Body() body: RejectApplicationDto,
    @CurrentUser() user: AuthenticatedPrincipal,
  ) {
    await this.consoleUsers.requireConsoleRole(user.uid, [
      ConsoleRole.PROVIDER_ONBOARDING_SPECIALIST,
      ConsoleRole.CONSOLE_ADMINISTRATOR,
    ]);

    const application = await this.onboarding.rejectApplication({
      applicationId: id,
      reviewerId: user.uid,
      notes: body.notes,
    });

    return { data: application, meta: {}, errors: [] };
  }

  // Re-stamps a provisioned provider's Firebase custom claims (role/orgId/providerType)
  // without resetting their password. Fixes accounts provisioned before `providerType`
  // was required by the portal login flow, or any other claims drift.
  @Post('provider-applications/:id/resync-portal-claims')
  async resyncPortalClaims(@Param('id') id: string, @CurrentUser() user: AuthenticatedPrincipal) {
    await this.consoleUsers.requireConsoleRole(user.uid, [
      ConsoleRole.PROVIDER_ONBOARDING_SPECIALIST,
      ConsoleRole.CONSOLE_ADMINISTRATOR,
    ]);

    const result = await this.onboarding.resyncPortalClaims(id, user.uid);
    return { data: result, meta: {}, errors: [] };
  }

  @Get('console-users')
  async listConsoleUsers(@CurrentUser() user: AuthenticatedPrincipal) {
    await this.consoleUsers.requireConsoleRole(user.uid, [
      ConsoleRole.CONSOLE_ADMINISTRATOR,
      ConsoleRole.COMPLIANCE_OFFICER,
      ConsoleRole.TRUST_SAFETY_ANALYST,
    ]);

    const users = await this.consoleUsers.listConsoleUsers();
    return { data: users, meta: { count: users.length }, errors: [] };
  }

  @Post('console-users')
  async createConsoleUser(@Body() body: CreateConsoleUserDto, @CurrentUser() user: AuthenticatedPrincipal) {
    await this.consoleUsers.requireConsoleRole(user.uid, [ConsoleRole.CONSOLE_ADMINISTRATOR]);

    const created = await this.consoleUsers.createConsoleUser({
      email: body.email,
      role: body.role,
      password: body.password,
      actor: user.uid,
    });

    return { data: created, meta: {}, errors: [] };
  }

  // Re-stamps an existing console user's Firebase custom claims (`role: ADMIN` +
  // `consoleRole`) without resetting their password — the backfill path for
  // accounts created before claim-stamping existed (e.g. via direct DB insert).
  @Post('console-users/:id/resync-claims')
  async resyncConsoleClaims(@Param('id') id: string, @CurrentUser() user: AuthenticatedPrincipal) {
    await this.consoleUsers.requireConsoleRole(user.uid, [ConsoleRole.CONSOLE_ADMINISTRATOR]);
    const result = await this.consoleUsers.resyncConsoleClaims(id, user.uid);
    return { data: result, meta: {}, errors: [] };
  }

  @Patch('console-users/:id')
  async updateConsoleUser(
    @Param('id') id: string,
    @Body() body: UpdateConsoleUserDto,
    @CurrentUser() user: AuthenticatedPrincipal,
  ) {
    await this.consoleUsers.requireConsoleRole(user.uid, [ConsoleRole.CONSOLE_ADMINISTRATOR]);
    const updated = await this.consoleUsers.updateConsoleUser({
      id,
      role: body.role,
      status: body.status,
      actor: user.uid,
    });
    return { data: updated, meta: {}, errors: [] };
  }
}
