import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ChartCardProps {
  title: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}

export function ChartCard({ title, children, className, actions }: ChartCardProps) {
  return (
    <div className={cn("card-glass p-6 rounded-xl", className)}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="min-h-[280px]">
        {children}
      </div>
    </div>
  );
}