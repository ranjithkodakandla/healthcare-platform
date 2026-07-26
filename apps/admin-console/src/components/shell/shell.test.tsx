import { render, screen } from '@testing-library/react';
import { ConsoleShell } from './ConsoleShell';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('admin shell', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('admin_token', 'test-token');
    localStorage.setItem(
      'admin_profile',
      JSON.stringify({
        uid: 'u1',
        email: 'ranjith@sahyak.test',
        displayName: 'Ranjith',
        roleLabel: 'Console Administrator',
      }),
    );
  });

  it('renders sidebar and topbar', () => {
    render(
      <>
        <Sidebar />
        <TopBar title="Ops" screenId="A-02" />
      </>,
    );
    expect(screen.getByText('Operations Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Ops')).toBeInTheDocument();
    expect(screen.getByText('A-02')).toBeInTheDocument();
    expect(screen.getByText('Ranjith')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign out/i })).toBeInTheDocument();
  });

  it('ConsoleShell exposes mobile menu control', async () => {
    render(
      <ConsoleShell>
        <div>Page</div>
      </ConsoleShell>,
    );
    expect(await screen.findByLabelText(/Open navigation menu/i)).toBeInTheDocument();
    expect(screen.getByText('Page')).toBeInTheDocument();
  });
});

