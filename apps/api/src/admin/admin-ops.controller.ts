import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConsoleRole, Role } from '@sahayak/shared-constants';
import { AuthGuard } from '../shared-services/auth/auth.guard';
import { RolesGuard } from '../shared-services/auth/roles.guard';
import { Roles } from '../shared-services/auth/roles.decorator';
import { CurrentUser } from '../shared-services/auth/current-user.decorator';
import { AuthenticatedPrincipal } from '../shared-services/auth/auth-provider.interface';
import { ConsoleUserService } from './console-user.service';
import { AdminOpsService } from './admin-ops.service';

// A-03/A-06/A-07/A-09/A-10/A-11/A-13/A-14/A-15/A-16/A-17/A-18/A-19 — Admin ops surfaces.
@ApiTags('admin-ops')
@ApiBearerAuth()
@Controller('v1/admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminOpsController {
  constructor(
    private readonly ops: AdminOpsService,
    private readonly consoleUsers: ConsoleUserService,
  ) {}

  // ── Support tickets (A-06 / A-07) ──────────────────────────────────────────

  @Get('support/tickets')
  @ApiOperation({ summary: 'A-06/A-19: Support ticket queue (optional requesterType filter)' })
  async listTickets(
    @Query('requesterType') requesterType: string | undefined,
    @Query('q') q: string | undefined,
    @CurrentUser() user: AuthenticatedPrincipal,
  ) {
    await this.requireSupport(user.uid);
    const data = await this.ops.listTickets({ requesterType, q });
    return { data, meta: { count: data.length, requesterType: requesterType ?? null } };
  }

  @Get('support/tickets/:id')
  @ApiOperation({ summary: 'A-07: Support ticket detail' })
  async getTicket(@Param('id') id: string, @CurrentUser() user: AuthenticatedPrincipal) {
    await this.requireSupport(user.uid);
    return { data: await this.ops.getTicket(id), meta: {} };
  }

  @Post('support/tickets')
  @ApiOperation({ summary: 'A-06: Create support ticket' })
  async createTicket(
    @Body() body: { requester: string; requesterType: 'CITIZEN' | 'PROVIDER'; entityRef?: string; subject: string; priority?: string; body?: string },
    @CurrentUser() user: AuthenticatedPrincipal,
  ) {
    await this.requireSupport(user.uid);
    const data = await this.ops.createTicket({ ...body, actor: user.uid });
    return { data, meta: {} };
  }

  @Patch('support/tickets/:id')
  @ApiOperation({ summary: 'A-07: Update ticket status/assignment/notes' })
  async updateTicket(
    @Param('id') id: string,
    @Body() body: { status?: string; priority?: string; assignedAgent?: string; internalNotes?: string },
    @CurrentUser() user: AuthenticatedPrincipal,
  ) {
    await this.requireSupport(user.uid);
    const data = await this.ops.updateTicket(id, { ...body, actor: user.uid });
    return { data, meta: {} };
  }

  // ── Issues board (A-09) ────────────────────────────────────────────────────

  @Get('issues')
  @ApiOperation({ summary: 'A-09: Platform issue board' })
  async listIssues(@CurrentUser() user: AuthenticatedPrincipal) {
    await this.requireOps(user.uid);
    const data = await this.ops.listIssues();
    return { data, meta: { count: data.length } };
  }

  @Patch('issues/:id')
  @ApiOperation({ summary: 'A-09: Move issue across Kanban columns' })
  async updateIssue(
    @Param('id') id: string,
    @Body() body: { status: string },
    @CurrentUser() user: AuthenticatedPrincipal,
  ) {
    await this.requireOps(user.uid);
    const data = await this.ops.updateIssueStatus(id, body.status, user.uid);
    return { data, meta: {} };
  }

  // ── Monitoring (A-14) ──────────────────────────────────────────────────────

  @Get('monitoring')
  @ApiOperation({ summary: 'A-14: Platform monitoring snapshot' })
  async monitoring(@CurrentUser() user: AuthenticatedPrincipal) {
    await this.requireOps(user.uid);
    return { data: await this.ops.getMonitoringSnapshot(), meta: {} };
  }

  // ── Governance (A-18) ──────────────────────────────────────────────────────

  @Get('feature-flags')
  @ApiOperation({ summary: 'A-18: Feature flags list' })
  async listFlags(@CurrentUser() user: AuthenticatedPrincipal) {
    await this.requireAdminOrCompliance(user.uid);
    const data = await this.ops.listFeatureFlags();
    return { data, meta: { count: data.length } };
  }

  @Patch('feature-flags/:key')
  @ApiOperation({ summary: 'A-18: Toggle feature flag' })
  async toggleFlag(
    @Param('key') key: string,
    @Body() body: { enabled: boolean },
    @CurrentUser() user: AuthenticatedPrincipal,
  ) {
    await this.consoleUsers.requireConsoleRole(user.uid, [ConsoleRole.CONSOLE_ADMINISTRATOR]);
    const data = await this.ops.toggleFeatureFlag(key, body.enabled, user.uid);
    return { data, meta: {} };
  }

  @Get('config')
  @ApiOperation({ summary: 'A-18: Platform configuration groups' })
  async listConfig(@CurrentUser() user: AuthenticatedPrincipal) {
    await this.requireAdminOrCompliance(user.uid);
    return { data: await this.ops.listConfig(), meta: {} };
  }

  @Get('audit')
  @ApiOperation({ summary: 'A-18: Audit log search' })
  async searchAudit(
    @Query('q') q: string | undefined,
    @Query('limit') limit: string | undefined,
    @CurrentUser() user: AuthenticatedPrincipal,
  ) {
    await this.requireAdminOrCompliance(user.uid);
    const data = await this.ops.searchAudit(q, limit ? Number(limit) : 50);
    return { data, meta: { count: data.length, q: q ?? null } };
  }

  // ── A-03 Citizen onboarding ────────────────────────────────────────────────

  @Get('citizen-onboarding/queue')
  @ApiOperation({ summary: 'A-03: Citizen onboarding / flagged accounts queue' })
  async listCitizenFlags(@CurrentUser() user: AuthenticatedPrincipal) {
    await this.requireSupport(user.uid);
    const data = await this.ops.listCitizenFlags();
    return { data, meta: { count: data.length } };
  }

  @Patch('citizen-onboarding/queue/:id')
  @ApiOperation({ summary: 'A-03: Update citizen onboarding flag status' })
  async updateCitizenFlag(
    @Param('id') id: string,
    @Body() body: { status: string; notes?: string; resolution?: string },
    @CurrentUser() user: AuthenticatedPrincipal,
  ) {
    await this.requireSupport(user.uid);
    const data = await this.ops.updateCitizenFlag(
      id,
      body.status,
      user.uid,
      body.notes,
      body.resolution,
    );
    return { data, meta: {} };
  }

  @Post('support/tickets/:id/case-access')
  @ApiOperation({ summary: 'A-07/G5: Access linked case timeline with justification' })
  async ticketCaseAccess(
    @Param('id') id: string,
    @Body() body: { justification: string },
    @CurrentUser() user: AuthenticatedPrincipal,
  ) {
    await this.requireSupport(user.uid);
    const data = await this.ops.getTicketCaseContext(id, body.justification, user.uid);
    return { data, meta: {} };
  }

  // ── A-10 / A-15 SLA + Analytics ────────────────────────────────────────────

  @Get('sla/snapshot')
  @ApiOperation({ summary: 'A-10: SLA monitoring snapshot' })
  async slaSnapshot(@CurrentUser() user: AuthenticatedPrincipal) {
    await this.requireOps(user.uid);
    const snap = await this.ops.getSlaAndAnalyticsSnapshot();
    return {
      data: { definitions: snap.definitions, compliance30d: snap.compliance30d, generatedAt: snap.generatedAt },
      meta: {},
    };
  }

  @Get('analytics/summary')
  @ApiOperation({ summary: 'A-15: Analytics rollup + compliance breakdown' })
  async analyticsSummary(@CurrentUser() user: AuthenticatedPrincipal) {
    await this.requireOps(user.uid);
    const snap = await this.ops.getSlaAndAnalyticsSnapshot();
    return {
      data: { rollup: snap.rollup, breakdown: snap.compliance30d, generatedAt: snap.generatedAt },
      meta: {},
    };
  }

  // ── A-11 Knowledge Base ────────────────────────────────────────────────────

  @Get('knowledge-base/articles')
  @ApiOperation({ summary: 'A-11: Knowledge base articles' })
  async listArticles(@CurrentUser() user: AuthenticatedPrincipal) {
    await this.requireSupport(user.uid);
    const { articles, categories } = await this.ops.listKnowledgeArticles();
    return { data: articles, meta: { count: articles.length, categories } };
  }

  @Post('knowledge-base/articles')
  @ApiOperation({ summary: 'A-11: Create knowledge article' })
  async createArticle(
    @Body() body: { title: string; category: string; body?: string; note?: string },
    @CurrentUser() user: AuthenticatedPrincipal,
  ) {
    await this.requireSupport(user.uid);
    const data = await this.ops.createKnowledgeArticle({ ...body, actor: user.uid });
    return { data, meta: {} };
  }

  // ── A-13 Workflows ─────────────────────────────────────────────────────────

  @Get('workflows')
  @ApiOperation({ summary: 'A-13: Workflow catalog (Provider Onboarding immutable)' })
  async listWorkflows(@CurrentUser() user: AuthenticatedPrincipal) {
    await this.requireAdminOrCompliance(user.uid);
    const data = this.ops.listWorkflows();
    return { data, meta: { count: data.length } };
  }

  // ── A-16 Communications ────────────────────────────────────────────────────

  @Get('communications/broadcasts')
  @ApiOperation({ summary: 'A-16: Broadcast history' })
  async listBroadcasts(@CurrentUser() user: AuthenticatedPrincipal) {
    await this.requireOps(user.uid);
    const data = await this.ops.listBroadcasts();
    return { data, meta: { count: data.length } };
  }

  @Post('communications/broadcasts')
  @ApiOperation({ summary: 'A-16: Create broadcast (draft or sent; fan-out stubbed)' })
  async createBroadcast(
    @Body() body: { title: string; body: string; audience: string; channels: string[]; status?: string },
    @CurrentUser() user: AuthenticatedPrincipal,
  ) {
    await this.requireOps(user.uid);
    const data = await this.ops.createBroadcast({ ...body, actor: user.uid });
    return { data, meta: {} };
  }

  // ── A-17 AI Ops Assistant ──────────────────────────────────────────────────

  @Get('ai/ops-assistant')
  @ApiOperation({ summary: 'A-17: AI operations assistant snapshot' })
  async aiOps(@CurrentUser() user: AuthenticatedPrincipal) {
    await this.requireOps(user.uid);
    return { data: await this.ops.getAiOpsAssistant(), meta: {} };
  }

  @Post('ai/suggestions/:id/approve')
  @ApiOperation({ summary: 'A-17: Approve AI suggestion' })
  async approveSuggestion(@Param('id') id: string, @CurrentUser() user: AuthenticatedPrincipal) {
    await this.requireOps(user.uid);
    return { data: await this.ops.updateAiSuggestion(id, 'APPROVED', user.uid), meta: {} };
  }

  @Post('ai/suggestions/:id/dismiss')
  @ApiOperation({ summary: 'A-17: Dismiss AI suggestion' })
  async dismissSuggestion(@Param('id') id: string, @CurrentUser() user: AuthenticatedPrincipal) {
    await this.requireOps(user.uid);
    return { data: await this.ops.updateAiSuggestion(id, 'DISMISSED', user.uid), meta: {} };
  }

  // ── Provider directory (admin oversight) ───────────────────────────────────

  @Get('providers/search')
  @ApiOperation({ summary: 'Search live providers / hospital registry' })
  async searchProviders(@Query('q') q: string | undefined, @CurrentUser() user: AuthenticatedPrincipal) {
    await this.requireOps(user.uid);
    const data = await this.ops.searchProviders(q);
    return { data, meta: { count: data.length, q: q ?? null } };
  }

  @Get('providers/:orgId')
  @ApiOperation({ summary: 'Provider org detail for admin oversight (audited)' })
  async getProviderOrg(@Param('orgId') orgId: string, @CurrentUser() user: AuthenticatedPrincipal) {
    await this.requireOps(user.uid);
    return { data: await this.ops.getProviderOrg(orgId, user.uid), meta: {} };
  }

  // ── Role helpers ───────────────────────────────────────────────────────────

  private requireSupport(uid: string) {
    return this.consoleUsers.requireConsoleRole(uid, [
      ConsoleRole.SUPPORT_AGENT,
      ConsoleRole.CUSTOMER_SUCCESS_MANAGER,
      ConsoleRole.CONSOLE_ADMINISTRATOR,
      ConsoleRole.TRUST_SAFETY_ANALYST,
    ]);
  }

  private requireOps(uid: string) {
    return this.consoleUsers.requireConsoleRole(uid, [
      ConsoleRole.PLATFORM_OPERATIONS_ENGINEER,
      ConsoleRole.CONSOLE_ADMINISTRATOR,
      ConsoleRole.TRUST_SAFETY_ANALYST,
    ]);
  }

  private requireAdminOrCompliance(uid: string) {
    return this.consoleUsers.requireConsoleRole(uid, [
      ConsoleRole.CONSOLE_ADMINISTRATOR,
      ConsoleRole.COMPLIANCE_OFFICER,
      ConsoleRole.PLATFORM_OPERATIONS_ENGINEER,
    ]);
  }
}
