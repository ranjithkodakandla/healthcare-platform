import { render, screen } from '@testing-library/react';
import { Button } from './Button';
import { Badge } from './Badge';
import { Card, CardPadded } from './Card';

describe('provider UI', () => {
  it('renders atoms', () => {
    render(
      <>
        <Button>Go</Button>
        <Badge>Live</Badge>
        <Card>Body</Card>
        <CardPadded>Padded</CardPadded>
      </>,
    );
    expect(screen.getByText('Go')).toBeInTheDocument();
    expect(screen.getByText('Padded')).toBeInTheDocument();
  });
});
