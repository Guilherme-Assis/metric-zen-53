import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
  className?: string;
}

export function StatusBadge({ 
  status, 
  activeLabel = 'Ativo', 
  inactiveLabel = 'Inativo',
  className 
}: StatusBadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-all",
      status 
        ? "bg-success/10 text-success border border-success/20" 
        : "bg-destructive/10 text-destructive border border-destructive/20",
      className
    )}>
      <span className={cn(
        "w-1.5 h-1.5 rounded-full mr-1.5",
        status ? "bg-success" : "bg-destructive"
      )}></span>
      {status ? activeLabel : inactiveLabel}
    </span>
  );
}