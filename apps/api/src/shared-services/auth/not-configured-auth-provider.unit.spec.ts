import { ServiceUnavailableException } from '@nestjs/common';
import { NotConfiguredAuthProvider } from './not-configured-auth-provider';

describe('NotConfiguredAuthProvider', () => {
  it('fails loudly', async () => {
    await expect(new NotConfiguredAuthProvider().verifyToken()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
