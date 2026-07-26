import { AdminOpsController } from './admin-ops.controller';

describe('AdminOpsController (unit)', () => {
  const user = { uid: 'admin-1' };
  const ops = {
    listTickets: jest.fn().mockResolvedValue([{ id: 't1' }]),
    getTicket: jest.fn().mockResolvedValue({ id: 't1' }),
    createTicket: jest.fn().mockResolvedValue({ id: 't1' }),
    updateTicket: jest.fn().mockResolvedValue({ id: 't1' }),
    listIssues: jest.fn().mockResolvedValue([]),
    updateIssueStatus: jest.fn().mockResolvedValue({ id: 'i1' }),
    getMonitoringSnapshot: jest.fn().mockResolvedValue({}),
    listFeatureFlags: jest.fn().mockResolvedValue([]),
    toggleFeatureFlag: jest.fn().mockResolvedValue({}),
    listConfig: jest.fn().mockResolvedValue([]),
    searchAudit: jest.fn().mockResolvedValue([]),
    listCitizenFlags: jest.fn().mockResolvedValue([]),
    updateCitizenFlag: jest.fn().mockResolvedValue({}),
    getSlaAndAnalyticsSnapshot: jest.fn().mockResolvedValue({
      definitions: [],
      compliance30d: [],
      rollup: {},
      generatedAt: 'now',
    }),
    listKnowledgeArticles: jest.fn().mockResolvedValue({ articles: [], categories: [] }),
    createKnowledgeArticle: jest.fn().mockResolvedValue({}),
    listWorkflows: jest.fn().mockReturnValue([]),
    listBroadcasts: jest.fn().mockResolvedValue([]),
    createBroadcast: jest.fn().mockResolvedValue({}),
    getAiOpsAssistant: jest.fn().mockResolvedValue({}),
    updateAiSuggestion: jest.fn().mockResolvedValue({}),
  };
  const consoleUsers = {
    requireConsoleRole: jest.fn().mockResolvedValue(undefined),
  };
  const controller = new AdminOpsController(ops as never, consoleUsers as never);

  it('covers ticket/issue/monitoring/governance/sla/kb/comms/ai routes', async () => {
    await controller.listTickets('CITIZEN', 'q', user as never);
    await controller.getTicket('t1', user as never);
    await controller.createTicket(
      { requester: 'r', requesterType: 'CITIZEN', subject: 's' },
      user as never,
    );
    await controller.updateTicket('t1', { status: 'OPEN' }, user as never);
    await controller.listIssues(user as never);
    await controller.updateIssue('i1', { status: 'OPEN' }, user as never);
    await controller.monitoring(user as never);
    await controller.listFlags(user as never);
    await controller.toggleFlag('k', { enabled: true }, user as never);
    await controller.listConfig(user as never);
    await controller.searchAudit('q', '10', user as never);
    await controller.searchAudit(undefined, undefined, user as never);
    await controller.listCitizenFlags(user as never);
    await controller.updateCitizenFlag('id', { status: 'CLEARED' }, user as never);
    await controller.slaSnapshot(user as never);
    await controller.analyticsSummary(user as never);
    await controller.listArticles(user as never);
    await controller.createArticle({ title: 't', category: 'c' }, user as never);
    await controller.listWorkflows(user as never);
    await controller.listBroadcasts(user as never);
    await controller.createBroadcast(
      { title: 't', body: 'b', audience: 'ALL', channels: ['PUSH'] },
      user as never,
    );
    await controller.aiOps(user as never);
    await controller.approveSuggestion('s1', user as never);
    await controller.dismissSuggestion('s1', user as never);
    expect(consoleUsers.requireConsoleRole).toHaveBeenCalled();
  });
});
