import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
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
    return { data: application, meta: {}, errors: [] };
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
      reviewerId: body.reviewerId,
      notes: body.notes,
    });

    const application = await this.onboarding.getApplication(id);
    const portalLive = await this.onboarding.isPortalLive(id);

    return { data: { application, portalLive }, meta: {}, errors: [] };
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
      actor: user.uid,
    });

    return { data: created, meta: {}, errors: [] };
  }
}
