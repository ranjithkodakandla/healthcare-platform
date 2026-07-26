import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

  it('ConsoleShell opens and closes the navigation drawer', async () => {
    render(
      <ConsoleShell>
        <div>Page</div>
      </ConsoleShell>,
    );
    fireEvent.click(await screen.findByLabelText(/Open navigation menu/i));
    expect(await screen.findByLabelText(/Close navigation/i)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/Close menu/i));
    await waitFor(() => {
      expect(screen.queryByLabelText(/Close navigation/i)).not.toBeInTheDocument();
    });
  });

  it('ConsoleShell closes drawer on Escape', async () => {
    render(
      <ConsoleShell>
        <div>Page</div>
      </ConsoleShell>,
    );
    fireEvent.click(await screen.findByLabelText(/Open navigation menu/i));
    expect(await screen.findByRole('dialog', { name: /Console navigation/i })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /Console navigation/i })).not.toBeInTheDocument();
    });
  });
});

