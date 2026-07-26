import { render, screen } from '@testing-library/react';
import { MobileShell } from './MobileShell';
import { BottomNav } from './BottomNav';

jest.mock('next/navigation', () => ({
  usePathname: () => '/home',
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('citizen shell', () => {
  it('renders MobileShell and BottomNav', () => {
    render(
      <MobileShell bg="#fff" noPad>
        <div>content</div>
        <BottomNav />
      </MobileShell>,
    );
    expect(screen.getByText('content')).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Cases')).toBeInTheDocument();
  });
});
