import { AuthService } from './auth.service';

describe('AuthService (unit)', () => {
  it('verifies token via provider and audits login', async () => {
    const provider = {
      verifyToken: jest.fn().mockResolvedValue({ uid: 'u1', role: 'CITIZEN' }),
    };
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const service = new AuthService(provider as never, audit as never);
    const principal = await service.login('tok');
    expect(principal.uid).toBe('u1');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'LOGIN', entityId: 'u1' }),
    );
  });
});
