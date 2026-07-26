import { render, screen } from '@testing-library/react';
import { Button } from './Button';
import { Badge } from './Badge';
import { Card } from './Card';

describe('admin UI', () => {
  it('renders variants', () => {
    render(
      <>
        <Button variant="primary">Primary</Button>
        <Button variant="danger" size="sm">
          Danger
        </Button>
        <Badge>Flag</Badge>
        <Card>Card</Card>
      </>,
    );
    expect(screen.getByText('Primary')).toBeInTheDocument();
    expect(screen.getByText('Card')).toBeInTheDocument();
  });
});
