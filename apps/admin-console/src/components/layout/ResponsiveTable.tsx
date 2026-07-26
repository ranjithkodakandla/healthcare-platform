import { cn } from '@/lib/utils';

interface ResponsiveTableProps {
  children: React.ReactNode;
  minWidth?: number;
  className?: string;
}

/** Contained H-scroll for dense admin tables below 1280px (UX Spec §9). */
export function ResponsiveTable({
  children,
  minWidth = 880,
  className,
}: ResponsiveTableProps) {
  return (
    <div className={cn('data-scroll', className)}>
      <div style={{ minWidth }}>{children}</div>
    </div>
  );
}

export function StatGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn('stat-grid', className)}>{children}</div>;
}
