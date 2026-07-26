import { render, screen, waitFor } from '@testing-library/react';
import { PortalGuard } from './PortalGuard';
import { saveSession, clearSession } from '@/lib/api';

const replace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
}));

describe('PortalGuard', () => {
  beforeEach(() => {
    localStorage.clear();
    replace.mockClear();
  });

  it('redirects to /login when there is no session', async () => {
    render(
      <PortalGuard expected="HOSPITAL">
        <div>Secret</div>
      </PortalGuard>,
    );
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
    expect(screen.queryByText('Secret')).not.toBeInTheDocument();
  });

  it('renders children when the session providerType matches', async () => {
    saveSession({ orgId: 'hosp-1', token: 't', role: 'PROVIDER_STAFF', providerType: 'HOSPITAL' });
    render(
      <PortalGuard expected="HOSPITAL">
        <div>Secret</div>
      </PortalGuard>,
    );
    await waitFor(() => expect(screen.getByText('Secret')).toBeInTheDocument());
    expect(replace).not.toHaveBeenCalled();
  });

  it('shows a Not authorized screen when the session providerType does not match', async () => {
    saveSession({ orgId: 'hosp-1', token: 't', role: 'PROVIDER_STAFF', providerType: 'HOSPITAL' });
    render(
      <PortalGuard expected="INSURER">
        <div>Secret</div>
      </PortalGuard>,
    );
    await waitFor(() => expect(screen.getByText(/Not authorized/i)).toBeInTheDocument());
    expect(screen.queryByText('Secret')).not.toBeInTheDocument();

    clearSession();
  });
});
