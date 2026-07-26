import { render, screen } from '@testing-library/react';
import { ResponsiveTable, SplitPane, StatGrid } from './ResponsiveTable';

describe('responsive layout primitives', () => {
  it('renders StatGrid / SplitPane / ResponsiveTable', () => {
    render(
      <>
        <StatGrid>
          <div>A</div>
          <div>B</div>
        </StatGrid>
        <SplitPane left={<span>L</span>} right={<span>R</span>} />
        <ResponsiveTable>
          <table>
            <tbody>
              <tr>
                <td>cell</td>
              </tr>
            </tbody>
          </table>
        </ResponsiveTable>
      </>,
    );
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('L')).toBeInTheDocument();
    expect(screen.getByText('cell')).toBeInTheDocument();
  });
});
