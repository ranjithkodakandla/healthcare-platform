import {
  ApiError,
  clearSession,
  getSession,
  providerApi,
  saveSession,
} from './api';

describe('provider api', () => {
  beforeEach(() => {
    localStorage.clear();
    saveSession({ orgId: 'hosp-1', token: 'tok', role: 'PROVIDER_STAFF', providerType: 'HOSPITAL' });
  });

  it('session helpers and ApiError flags', () => {
    expect(getSession()).toEqual({
      hospitalId: 'hosp-1',
      token: 'tok',
      role: 'PROVIDER_STAFF',
      providerType: 'HOSPITAL',
    });
    clearSession();
    expect(getSession()).toBeNull();
    const err = new ApiError(401, 'x');
    expect(err.isUnauthorized).toBe(true);
    expect(new ApiError(403, 'x').isForbidden).toBe(true);
  });

  it('covers providerApi endpoints', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            holdId: 'h1',
            caseId: 'c1',
            category: 'ICU',
            requiresSecondaryAck: true,
            status: 'PENDING',
            expiresAt: 't',
            heldAt: 't',
          },
        ],
        meta: { hospitalId: 'hosp-1', count: 1 },
      }),
      text: async () => '',
    }) as never;
    saveSession({ orgId: 'hosp-1', token: 'tok', role: 'PROVIDER_STAFF', providerType: 'HOSPITAL' });
    await providerApi.dashboard.get('hosp-1');
    await providerApi.beds.get('hosp-1');
    await providerApi.beds.update('hosp-1', [{ category: 'ICU', availableCount: 1 }]);
    await providerApi.fleet.list('hosp-1');
    await providerApi.fleet.updateStatus('hosp-1', 'd1', 'AVAILABLE');
    await providerApi.pharmacy.stock('hosp-1', 'ins');
    await providerApi.pharmacy.stock('hosp-1');
    await providerApi.pharmacy.updateStock('hosp-1', [{ medicineName: 'X', stockCount: 1 }]);
    await providerApi.blood.preAlerts('hosp-1');
    await providerApi.blood.acknowledge('hosp-1', 'a1');
    const queue = await providerApi.queue.getIncoming('hosp-1');
    expect(queue.data[0].holdStatus).toBe('PENDING');
    await providerApi.queue.confirmHold('hosp-1', 'h1');
    await providerApi.queue.declineHold('hosp-1', 'h1', 'full');
    await providerApi.queue.clinicalAck('hosp-1', 'h1', 'HOSPITAL_CLINICAL_LEAD');

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'err',
    }) as never;
    await expect(providerApi.dashboard.get('hosp-1')).rejects.toBeInstanceOf(ApiError);
  });
});
