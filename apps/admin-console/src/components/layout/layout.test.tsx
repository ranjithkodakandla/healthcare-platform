import { render, screen } from '@testing-library/react';
import { ResponsiveTable, StatGrid } from './ResponsiveTable';

describe('admin responsive layout primitives', () => {
  it('renders table scroll wrapper', () => {
    render(
      <StatGrid>
        <ResponsiveTable>
          <table>
            <tbody>
              <tr>
                <td>row</td>
              </tr>
            </tbody>
          </table>
        </ResponsiveTable>
      </StatGrid>,
    );
    expect(screen.getByText('row')).toBeInTheDocument();
  });
});
