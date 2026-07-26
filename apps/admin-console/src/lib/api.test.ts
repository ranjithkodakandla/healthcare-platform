import { adminApi, ApiError, getAdminToken, ROLE_LABEL, saveAdminToken, STAGE_LABEL } from './api';

describe('adminApi', () => {
  beforeEach(() => {
    localStorage.clear();
    saveAdminToken('tok');
  });

  it('token helpers labels and ApiError', () => {
    expect(getAdminToken()).toBe('tok');
    expect(STAGE_LABEL.APPLICATION_INTAKE).toBeTruthy();
    expect(ROLE_LABEL.CONSOLE_ADMINISTRATOR).toBeTruthy();
    expect(new ApiError(401, 'x').isUnauthorized).toBe(true);
  });

  it('covers adminApi surface', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], meta: { count: 0 } }),
      text: async () => '',
    }) as never;

    await adminApi.platform.stats();
    await adminApi.platform.onboardingQueue();
    await adminApi.providers.approveStage('a', 'APPLICATION_INTAKE', 'r', 'n');
    await adminApi.users.list();
    await adminApi.users.create('a@b.c', 'SUPPORT_AGENT');
    await adminApi.support.listTickets({ requesterType: 'CITIZEN', q: 'x' });
    await adminApi.support.listTickets();
    await adminApi.support.getTicket('t1');
    await adminApi.support.createTicket({
      requester: 'r',
      requesterType: 'CITIZEN',
      subject: 's',
    });
    await adminApi.support.updateTicket('t1', { status: 'OPEN' });
    await adminApi.issues.list();
    await adminApi.issues.updateStatus('i1', 'OPEN');
    await adminApi.monitoring.snapshot();
    await adminApi.governance.flags();
    await adminApi.governance.toggleFlag('k', true);
    await adminApi.governance.config();
    await adminApi.governance.audit('q');
    await adminApi.governance.audit();
    await adminApi.citizenOnboarding.list();
    await adminApi.citizenOnboarding.update('id', 'CLEARED', 'n');
    await adminApi.sla.snapshot();
    await adminApi.analytics.summary();
    await adminApi.knowledgeBase.list();
    await adminApi.knowledgeBase.create({ title: 't', category: 'c' });
    await adminApi.workflows.list();
    await adminApi.communications.list();
    await adminApi.communications.create({
      title: 't',
      body: 'b',
      audience: 'ALL',
      channels: ['PUSH'],
    });
    await adminApi.ai.opsAssistant();
    await adminApi.ai.approveSuggestion('s1');
    await adminApi.ai.dismissSuggestion('s1');

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'err',
    }) as never;
    await expect(adminApi.platform.stats()).rejects.toBeInstanceOf(ApiError);
  });
});
