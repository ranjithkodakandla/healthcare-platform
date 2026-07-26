import { render, screen } from '@testing-library/react';
import { PortalShell } from './PortalShell';

jest.mock('next/navigation', () => ({
  usePathname: () => '/hospital/dashboard',
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('PortalShell', () => {
  it('renders sidebar and content', () => {
    render(
      <PortalShell portalName="Hospital" orgName="Apollo" userInitials="AP">
        <div>Page</div>
      </PortalShell>,
    );
    expect(screen.getByText('Page')).toBeInTheDocument();
    expect(screen.getByText('AP')).toBeInTheDocument();
    expect(screen.getByLabelText(/Open navigation menu/i)).toBeInTheDocument();
  });
});
