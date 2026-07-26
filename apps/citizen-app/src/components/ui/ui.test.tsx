import { render, screen } from '@testing-library/react';
import { Button } from './Button';
import { Badge } from './Badge';
import { Card } from './Card';
import { BackHeader } from './BackHeader';
import { FilterChip } from './FilterChip';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('citizen UI atoms', () => {
  it('renders Button variants and sizes', () => {
    render(
      <>
        <Button>Primary</Button>
        <Button variant="emergency" size="lg" fullWidth>
          Emergency
        </Button>
        <Button variant="outline" size="sm">
          Outline
        </Button>
        <Button variant="ghost" size="pill">
          Ghost
        </Button>
      </>,
    );
    expect(screen.getByText('Primary')).toBeInTheDocument();
    expect(screen.getByText('Emergency')).toBeInTheDocument();
  });

  it('renders Badge Card BackHeader FilterChip', () => {
    render(
      <>
        <Badge>Ok</Badge>
        <Card>Card body</Card>
        <BackHeader title="Title" />
        <FilterChip label="ICU" active onClick={() => undefined} />
        <FilterChip label="General" active={false} onClick={() => undefined} />
      </>,
    );
    expect(screen.getByText('Ok')).toBeInTheDocument();
    expect(screen.getByText('Card body')).toBeInTheDocument();
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('ICU')).toBeInTheDocument();
  });
});
