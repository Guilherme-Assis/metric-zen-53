import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: {
    value: number;
    type: 'positive' | 'negative' | 'neutral';
    formatted: string;
  };
  className?: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'destructive';
}

export function MetricCard({ 
  title, 
  value, 
  icon: Icon, 
  change, 
  className,
  variant = 'default'
}: MetricCardProps) {
  const variantStyles = {
    default: 'metric-card',
    primary: 'metric-card border-primary/20 bg-gradient-to-br from-primary/5 to-transparent',
    success: 'metric-card border-success/20 bg-gradient-to-br from-success/5 to-transparent',
    warning: 'metric-card border-warning/20 bg-gradient-to-br from-warning/5 to-transparent',
    destructive: 'metric-card border-destructive/20 bg-gradient-to-br from-destructive/5 to-transparent'
  };

  return (
    <div className={cn(variantStyles[variant], className, "group")}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="metric-label mb-2">{title}</p>
          <p className="metric-value">{value}</p>
          {change && (
            <div className={cn(
              "metric-change mt-2",
              change.type === 'positive' && "positive",
              change.type === 'negative' && "negative",
              change.type === 'neutral' && "text-foreground-muted"
            )}>
              <span className="font-medium">{change.formatted}</span>
              <span className="text-xs opacity-75">vs anterior</span>
            </div>
          )}
        </div>
        <div className={cn(
          "p-3 rounded-xl transition-all duration-300 group-hover:scale-110",
          variant === 'primary' && "bg-primary/10 text-primary",
          variant === 'success' && "bg-success/10 text-success",
          variant === 'warning' && "bg-warning/10 text-warning",
          variant === 'destructive' && "bg-destructive/10 text-destructive",
          variant === 'default' && "bg-muted text-foreground-muted"
        )}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}