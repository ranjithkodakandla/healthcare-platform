import { citizenApi, getCurrentPosition, getOrCreateDeviceId, privacyApi } from './api';
import { saveCitizenToken } from './token';

describe('citizenApi', () => {
  beforeEach(() => {
    localStorage.clear();
    saveCitizenToken('tok');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function mockOk(data: unknown) {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => data,
      text: async () => '',
    }) as never;
  }

  it('GET/POST happy paths and auth header', async () => {
    mockOk({ data: [], meta: {} });
    await citizenApi.beds.search({ lat: 1, lng: 2, freshOnly: true, category: 'ICU' });
    await citizenApi.beds.hospitalSummary('h1');
    await citizenApi.hospitals.nearby({ lat: 1, lng: 2 });
    await citizenApi.hospitals.profile('h1', { lat: 1, lng: 2 });
    await citizenApi.cases.getTimeline('c1');
    await citizenApi.ambulances.search({ lat: 1, lng: 2 });
    await citizenApi.ambulances.getRequestByCaseId('c1');
    await citizenApi.doctors.search({ specialty: 'Cardio' });
    await citizenApi.pharmacies.search({ medicine: 'Insulin' });
    await citizenApi.bloodBanks.search({ bloodGroup: 'O+' });
    await citizenApi.diagnostics.search({ q: 'cbc' });
    await citizenApi.cancerCenters.search({ modality: 'Radiation' });
    await citizenApi.insurance.getPreAuth('c1');
    await citizenApi.insurance.getPreAuth();
    expect((global.fetch as jest.Mock).mock.calls[0][1].headers.Authorization).toBe('Bearer tok');

    mockOk({ data: { id: 'c1' }, meta: {} });
    await citizenApi.cases.createGuest({
      deviceId: 'd',
      location: {},
      triage: { isConscious: true, isBreathing: true, hasVisibleBleeding: false },
    });
    await citizenApi.ambulances.createRequest({ caseId: 'c1', pickupLat: 1, pickupLng: 2 });
  });

  it('throws on non-ok responses', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'err',
    }) as never;
    await expect(citizenApi.beds.search({})).rejects.toThrow(/API/);
    await expect(
      citizenApi.cases.createGuest({
        deviceId: 'd',
        location: {},
        triage: { isConscious: true, isBreathing: true, hasVisibleBleeding: false },
      }),
    ).rejects.toThrow(/API POST/);
  });

  it('privacyApi covers DPDP client paths', async () => {
    mockOk({
      data: {
        privacyPolicyVersion: '1.0.0',
        termsVersion: '1.0.0',
        summary: 's',
        emergencyNote: 'e',
        contact: 'privacy@sahayak.in',
      },
    });
    await privacyApi.notices();
    mockOk({ data: { subjectId: 'u1' } });
    await privacyApi.me();
    await privacyApi.export();
    mockOk({ data: [] });
    await privacyApi.consents();
    mockOk({ data: { accepted: [] } });
    await privacyApi.accept({ privacyPolicy: true, terms: true });
    mockOk({ data: { id: 'c1' } });
    await privacyApi.revoke('c1');
    mockOk({ data: { status: 'completed' } });
    await privacyApi.erasure(true, 'test');

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'err',
    }) as never;
    await expect(privacyApi.revoke('x')).rejects.toThrow(/API DELETE/);
  });

  it('device id and geolocation helpers', async () => {
    const id1 = getOrCreateDeviceId();
    const id2 = getOrCreateDeviceId();
    expect(id1).toBe(id2);
    expect(id1.startsWith('dev-')).toBe(true);

    const geo = {
      getCurrentPosition: jest.fn((ok: PositionCallback) =>
        ok({ coords: { latitude: 1, longitude: 2 } } as GeolocationPosition),
      ),
    };
    Object.defineProperty(navigator, 'geolocation', { value: geo, configurable: true });
    await expect(getCurrentPosition()).resolves.toBeTruthy();

    Object.defineProperty(navigator, 'geolocation', { value: undefined, configurable: true });
    await expect(getCurrentPosition()).rejects.toThrow(/Geolocation/);
  });
});
