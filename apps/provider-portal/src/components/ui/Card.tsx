import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn('bg-white rounded-[12px] border', className)}
      style={{ borderColor: '#E7EBEC' }}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardPadded({ className, children, ...props }: CardProps) {
  return (
    <Card className={cn('p-[18px]', className)} {...props}>
      {children}
    </Card>
  );
}
