import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/supabase';
import { formatCurrency, formatPercentage } from '@/utils/formatters';
import { format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { MetricCard } from './MetricCard';

interface ComparisonSectionProps {
  clientId: string;
  currentMonth: string;
  currentMetrics?: {
    entries: number;
    exits: number;
    net: number;
    avg_ticket: number;
    sales_count: number;
  };
}

export function ComparisonSection({ clientId, currentMonth, currentMetrics }: ComparisonSectionProps) {
  const previousMonth = format(subMonths(new Date(currentMonth), 1), 'yyyy-MM-01');
  
  const { data: previousMetrics } = useQuery({
    queryKey: ['dashboard-metrics', clientId, previousMonth],
    queryFn: () => dashboardService.getDashboardMetrics(clientId, previousMonth),
    enabled: !!clientId
  });

  const getChange = (current: number, previous: number) => {
    if (previous === 0) return { value: 0, type: 'neutral' as const, formatted: '0%' };
    
    const change = ((current - previous) / previous) * 100;
    const type = change > 0 ? 'positive' as const : change < 0 ? 'negative' as const : 'neutral' as const;
    
    return {
      value: change,
      type,
      formatted: `${change > 0 ? '+' : ''}${change.toFixed(1)}%`
    };
  };

  if (!currentMetrics || !previousMetrics) {
    return (
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Comparação com Mês Anterior
        </h2>
        <div className="card-glass p-6 rounded-xl text-center">
          <p className="text-foreground-muted">Carregando comparação...</p>
        </div>
      </div>
    );
  }

  const currentMonthName = format(new Date(currentMonth), 'MMMM yyyy', { locale: ptBR });
  const previousMonthName = format(new Date(previousMonth), 'MMMM yyyy', { locale: ptBR });

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-foreground">
          Comparação: {currentMonthName} vs {previousMonthName}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard
          title="Entradas"
          value={formatCurrency(currentMetrics.entries)}
          icon={TrendingUp}
          variant="success"
          change={getChange(currentMetrics.entries, previousMetrics.entries)}
        />
        
        <MetricCard
          title="Saídas"
          value={formatCurrency(currentMetrics.exits)}
          icon={TrendingDown}
          variant="destructive"
          change={getChange(currentMetrics.exits, previousMetrics.exits)}
        />
        
        <MetricCard
          title="Saldo Líquido"
          value={formatCurrency(currentMetrics.net)}
          icon={currentMetrics.net >= 0 ? TrendingUp : TrendingDown}
          variant={currentMetrics.net >= 0 ? 'success' : 'destructive'}
          change={getChange(currentMetrics.net, previousMetrics.net)}
        />
        
        <MetricCard
          title="Ticket Médio"
          value={formatCurrency(currentMetrics.avg_ticket)}
          icon={TrendingUp}
          variant="primary"
          change={getChange(currentMetrics.avg_ticket, previousMetrics.avg_ticket)}
        />
        
        <MetricCard
          title="Qtd. Vendas"
          value={currentMetrics.sales_count.toString()}
          icon={TrendingUp}
          variant="primary"
          change={getChange(currentMetrics.sales_count, previousMetrics.sales_count)}
        />

        <div className="card-glass p-4 rounded-xl">
          <h3 className="text-sm text-foreground-muted mb-2">Resumo da Performance</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground-muted">Mês Anterior:</span>
              <span className="text-foreground">{formatCurrency(previousMetrics.net)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground-muted">Mês Atual:</span>
              <span className="text-foreground">{formatCurrency(currentMetrics.net)}</span>
            </div>
            <div className="border-t border-border pt-2 flex items-center justify-between">
              <span className="text-foreground-muted font-medium">Variação:</span>
              <span className={`font-semibold ${
                currentMetrics.net > previousMetrics.net 
                  ? 'text-success' 
                  : currentMetrics.net < previousMetrics.net 
                    ? 'text-destructive' 
                    : 'text-foreground-muted'
              }`}>
                {formatCurrency(currentMetrics.net - previousMetrics.net)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}