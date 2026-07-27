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
    await providerApi.users.invite('hosp-1', { name: 'A', email: 'a@b.c', role: 'HOSPITAL_ADMISSIONS_STAFF' });
    await providerApi.config.get('hosp-1');
    await providerApi.audit.list('hosp-1');

    // In-house department CRUD (hospital admin full add/update/view/delete)
    await providerApi.fleet.create('hosp-1', { vehicleReg: 'KA-02' });
    await providerApi.fleet.remove('hosp-1', 'd1');
    await providerApi.pharmacy.removeItem('hosp-1', 's1');
    await providerApi.blood.stock('hosp-1');
    await providerApi.blood.createStock('hosp-1', { bloodGroup: 'O+', unitsAvailable: 10 });
    await providerApi.blood.updateStock('hosp-1', 'bs1', 5);
    await providerApi.blood.removeStock('hosp-1', 'bs1');
    await providerApi.doctors.list('hosp-1');
    await providerApi.doctors.create('hosp-1', { name: 'Dr. X', specialty: 'ENT' });
    await providerApi.doctors.update('hosp-1', 'd1', { name: 'Dr. Y' });
    await providerApi.doctors.remove('hosp-1', 'd1');
    await providerApi.diagnostics.list('hosp-1');
    await providerApi.diagnostics.create('hosp-1', { testName: 'MRI', priceInr: 4000 });
    await providerApi.diagnostics.update('hosp-1', 'o1', { priceInr: 3500 });
    await providerApi.diagnostics.remove('hosp-1', 'o1');

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'err',
    }) as never;
    await expect(providerApi.dashboard.get('hosp-1')).rejects.toBeInstanceOf(ApiError);
  });
});
