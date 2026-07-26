import { ProviderSecondaryController } from './provider-secondary.controller';

describe('ProviderSecondaryController (unit)', () => {
  it('delegates fleet/pharmacy/blood endpoints', async () => {
    const secondary = {
      getFleet: jest.fn().mockResolvedValue([{ id: 'd1' }]),
      updateFleetStatus: jest.fn().mockResolvedValue({}),
      getPharmacyStock: jest.fn().mockResolvedValue([]),
      updatePharmacyStock: jest.fn().mockResolvedValue([{ id: 's1' }]),
      getBloodPreAlerts: jest.fn().mockResolvedValue({ aiPreAlerts: [{}], explicitRequests: [] }),
      acknowledgeBloodAlert: jest.fn().mockResolvedValue({}),
    };
    const c = new ProviderSecondaryController(secondary as never);
    const user = { uid: 'u1' };
    await c.getFleet('p1');
    await c.updateFleetStatus('p1', 'd1', { fleetStatus: 'AVAILABLE' }, user);
    await c.getPharmacyStock('p1', 'insulin');
    await c.updatePharmacyStock('p1', { updates: [{ medicineName: 'X', stockCount: 1 }] }, user);
    await c.updatePharmacyStock('p1', { updates: undefined as never }, user);
    await c.getBloodPreAlerts('p1');
    await c.acknowledgeBloodAlert('p1', 'a1', user);
    expect(secondary.getFleet).toHaveBeenCalledWith('p1');
  });
});
