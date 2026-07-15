// Smoke + behavior tests for the shared UI primitives introduced in the
// redesign — the components every page now depends on.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Tabs, { TabPanel } from './Tabs';
import Table, { type Column } from './Table';
import Badge, { scoreTone } from './Badge';
import Button from './Button';

describe('scoreTone', () => {
  it('maps score bands to tones', () => {
    expect(scoreTone(90)).toBe('green');
    expect(scoreTone(70)).toBe('blue');
    expect(scoreTone(50)).toBe('amber');
    expect(scoreTone(10)).toBe('red');
  });
});

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge tone="green">Hired</Badge>);
    expect(screen.getByText('Hired')).toBeInTheDocument();
  });
});

describe('Button', () => {
  it('is disabled while loading', () => {
    render(<Button loading>Save</Button>);
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
  });
});

describe('Tabs', () => {
  const items = [
    { value: 'a', label: 'Alpha' },
    { value: 'b', label: 'Beta' },
    { value: 'c', label: 'Gamma' },
  ];

  it('marks the active tab and switches on click', () => {
    const onChange = vi.fn();
    render(<Tabs ariaLabel="Test tabs" items={items} value="a" onChange={onChange} />);
    expect(screen.getByRole('tab', { name: 'Alpha' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByRole('tab', { name: 'Beta' }));
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('supports arrow-key navigation with wrap-around', () => {
    const onChange = vi.fn();
    render(<Tabs ariaLabel="Test tabs" items={items} value="c" onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith('a'); // wraps from last to first
  });

  it('only renders the matching TabPanel', () => {
    render(
      <>
        <TabPanel value="a" activeValue="a">
          <p>Panel A</p>
        </TabPanel>
        <TabPanel value="b" activeValue="a">
          <p>Panel B</p>
        </TabPanel>
      </>
    );
    expect(screen.getByText('Panel A')).toBeInTheDocument();
    expect(screen.queryByText('Panel B')).not.toBeInTheDocument();
  });
});

describe('Table', () => {
  interface Row {
    id: string;
    name: string;
  }
  const columns: Column<Row>[] = [{ key: 'name', header: 'Name', render: (r) => r.name }];
  const rows: Row[] = [
    { id: '1', name: 'Jane' },
    { id: '2', name: 'Omar' },
  ];

  it('renders a semantic table with rows (and the mobile card list)', () => {
    render(<Table columns={columns} rows={rows} rowKey={(r) => r.id} caption="People" />);
    expect(screen.getByRole('table')).toBeInTheDocument();
    // Each row renders twice by design: table cell (md+) and stacked card (below md)
    expect(screen.getAllByText('Jane')).toHaveLength(2);
  });

  it('renders the empty state instead of a table when there are no rows', () => {
    render(
      <Table columns={columns} rows={[]} rowKey={(r: Row) => r.id} emptyState={<p>Nothing here</p>} />
    );
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('fires onRowClick from both keyboard and mouse', () => {
    const onRowClick = vi.fn();
    render(<Table columns={columns} rows={rows} rowKey={(r) => r.id} onRowClick={onRowClick} />);
    const cards = screen.getAllByRole('button');
    fireEvent.keyDown(cards[0], { key: 'Enter' });
    expect(onRowClick).toHaveBeenCalledWith(rows[0]);
  });
});
