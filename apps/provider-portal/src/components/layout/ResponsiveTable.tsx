import { cn } from '@/lib/utils';

interface ResponsiveTableProps {
  children: React.ReactNode;
  /** Minimum width before horizontal scroll kicks in */
  minWidth?: number;
  className?: string;
}

/** Contained horizontal scroll for dense enterprise tables/grids (UX Spec §9). */
export function ResponsiveTable({
  children,
  minWidth = 760,
  className,
}: ResponsiveTableProps) {
  return (
    <div className={cn('data-scroll', className)}>
      <div style={{ minWidth }}>{children}</div>
    </div>
  );
}

interface StatGridProps {
  children: React.ReactNode;
  className?: string;
}

/** 1 → 2 → 4 column stat cards across phone / tablet / desktop. */
export function StatGrid({ children, className }: StatGridProps) {
  return <div className={cn('stat-grid', className)}>{children}</div>;
}

interface SplitPaneProps {
  left: React.ReactNode;
  right: React.ReactNode;
  className?: string;
  /** CSS grid template on desktop, e.g. "1.3fr 1fr" */
  desktopColumns?: string;
}

/** Stacks below 1024px; side-by-side on desktop. */
export function SplitPane({
  left,
  right,
  className,
  desktopColumns = '1.2fr 1fr',
}: SplitPaneProps) {
  return (
    <div
      className={cn('split-pane', className)}
      style={{ ['--split-cols' as string]: desktopColumns }}
    >
      <div className="min-w-0">{left}</div>
      <div className="min-w-0">{right}</div>
    </div>
  );
}
