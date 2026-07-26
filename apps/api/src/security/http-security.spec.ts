import { applyHttpSecurity } from './http-security';

describe('applyHttpSecurity', () => {
  it('registers helmet middleware on the Nest app', () => {
    const use = jest.fn();
    applyHttpSecurity({ use } as never);
    expect(use).toHaveBeenCalledTimes(1);
    expect(typeof use.mock.calls[0][0]).toBe('function');
  });
});
