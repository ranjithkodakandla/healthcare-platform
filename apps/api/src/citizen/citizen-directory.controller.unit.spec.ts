import { CitizenDirectoryController } from './citizen-directory.controller';

describe('CitizenDirectoryController (unit)', () => {
  it('forwards query params to directory service', async () => {
    const directory = {
      searchDoctors: jest.fn().mockResolvedValue([{}]),
      searchPharmacies: jest.fn().mockResolvedValue([]),
      searchBloodBanks: jest.fn().mockResolvedValue([]),
      searchDiagnostics: jest.fn().mockResolvedValue([]),
      searchCancerCenters: jest.fn().mockResolvedValue([]),
      getLatestPreAuth: jest.fn().mockResolvedValue({ status: 'PENDING' }),
    };
    const controller = new CitizenDirectoryController(directory as never);
    await controller.searchDoctors('cardio', 'q', '1', '2');
    await controller.searchDoctors();
    await controller.searchPharmacies('insulin', '1', '2');
    await controller.searchPharmacies();
    await controller.searchBloodBanks('O+', '1', '2');
    await controller.searchBloodBanks();
    await controller.searchDiagnostics('cbc', '1', '2');
    await controller.searchDiagnostics();
    await controller.searchCancer('radiation', '1', '2');
    await controller.searchCancer();
    await controller.getPreAuth('case-1');
    await controller.getPreAuth();
    expect(directory.searchDoctors).toHaveBeenCalled();
    expect(directory.getLatestPreAuth).toHaveBeenCalledWith('case-1');
  });
});
