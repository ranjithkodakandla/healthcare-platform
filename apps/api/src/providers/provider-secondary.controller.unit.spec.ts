import { ProviderSecondaryController } from './provider-secondary.controller';

describe('ProviderSecondaryController (unit)', () => {
  it('delegates fleet/pharmacy/blood endpoints', async () => {
    const secondary = {
      getFleet: jest.fn().mockResolvedValue([{ id: 'd1' }]),
      updateFleetStatus: jest.fn().mockResolvedValue({}),
      createDriver: jest.fn().mockResolvedValue({ id: 'd2' }),
      deleteDriver: jest.fn().mockResolvedValue(undefined),
      getPharmacyStock: jest.fn().mockResolvedValue([]),
      updatePharmacyStock: jest.fn().mockResolvedValue([{ id: 's1' }]),
      deletePharmacyItem: jest.fn().mockResolvedValue(undefined),
      getBloodStock: jest.fn().mockResolvedValue([{ id: 'bs1' }]),
      createBloodStock: jest.fn().mockResolvedValue({ id: 'bs1' }),
      updateBloodStock: jest.fn().mockResolvedValue({ id: 'bs1', unitsAvailable: 5 }),
      deleteBloodStock: jest.fn().mockResolvedValue(undefined),
      getBloodPreAlerts: jest.fn().mockResolvedValue({ aiPreAlerts: [{}], explicitRequests: [] }),
      acknowledgeBloodAlert: jest.fn().mockResolvedValue({}),
    };
    const c = new ProviderSecondaryController(secondary as never);
    const user = { uid: 'u1' };
    await c.getFleet('p1');
    await c.updateFleetStatus('p1', 'd1', { fleetStatus: 'AVAILABLE' }, user);
    await c.createDriver('p1', { vehicleReg: 'KA-02' }, user);
    await c.deleteDriver('p1', 'd1', user);
    await c.getPharmacyStock('p1', 'insulin');
    await c.updatePharmacyStock('p1', { updates: [{ medicineName: 'X', stockCount: 1 }] }, user);
    await c.updatePharmacyStock('p1', { updates: undefined as never }, user);
    await c.deletePharmacyItem('p1', 's1', user);
    await c.getBloodStock('p1');
    await c.createBloodStock('p1', { bloodGroup: 'O+', unitsAvailable: 10 }, user);
    await c.updateBloodStock('p1', 'bs1', { unitsAvailable: 5 }, user);
    await c.deleteBloodStock('p1', 'bs1', user);
    await c.getBloodPreAlerts('p1');
    await c.acknowledgeBloodAlert('p1', 'a1', user);
    expect(secondary.getFleet).toHaveBeenCalledWith('p1');
  });
});
