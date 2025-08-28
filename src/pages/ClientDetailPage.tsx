import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Calendar, TrendingUp, DollarSign, Target, Users, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { MetricCardSkeleton } from '@/components/dashboard/MetricCardSkeleton';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { clientsService, dashboardService } from '@/services/supabase';
import { formatCurrency, formatDate, formatPercentage } from '@/utils/formatters';
import { format, addMonths, subMonths } from 'date-fns';

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM-01'));

  // Fetch client data
  const { data: client, isLoading: loadingClient } = useQuery({
    queryKey: ['client', id],
    queryFn: () => clientsService.getClient(id!),
    enabled: !!id
  });

  // Fetch dashboard metrics
  const { data: metrics, isLoading: loadingMetrics } = useQuery({
    queryKey: ['dashboard-metrics', id, selectedMonth],
    queryFn: () => dashboardService.getDashboardMetrics(id!, selectedMonth),
    enabled: !!id
  });

  // Fetch additional data
  const { data: sales = [] } = useQuery({
    queryKey: ['sales', id, selectedMonth],
    queryFn: () => dashboardService.getSalesByMonth(id!, selectedMonth),
    enabled: !!id
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses', id, selectedMonth],
    queryFn: () => dashboardService.getExpensesByMonth(id!, selectedMonth),
    enabled: !!id
  });

  const { data: expensesByCategory = [] } = useQuery({
    queryKey: ['expenses-by-category', id, selectedMonth],
    queryFn: () => dashboardService.getExpensesByCategory(id!, selectedMonth),
    enabled: !!id
  });

  const handlePreviousMonth = () => {
    setSelectedMonth(prev => format(subMonths(new Date(prev), 1), 'yyyy-MM-01'));
  };

  const handleNextMonth = () => {
    setSelectedMonth(prev => format(addMonths(new Date(prev), 1), 'yyyy-MM-01'));
  };

  const monthDisplay = format(new Date(selectedMonth), 'MMMM yyyy');

  if (loadingClient) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">Cliente não encontrado</p>
          <Button onClick={() => navigate('/clients')}>Voltar para Clientes</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/clients')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground">{client.name}</h1>
            <p className="text-foreground-muted">
              Cliente desde {formatDate(client.started_at)}
            </p>
          </div>
        </div>

        {/* Month Navigation */}
        <div className="card-glass p-4 rounded-xl mb-8">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={handlePreviousMonth}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Mês Anterior
            </Button>
            
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-foreground-muted" />
              <span className="text-lg font-semibold text-foreground capitalize">
                {monthDisplay}
              </span>
            </div>
            
            <Button variant="outline" size="sm" onClick={handleNextMonth}>
              Próximo Mês
              <Calendar className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>

        {/* Metrics Grid */}
        {loadingMetrics ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {Array.from({ length: 9 }).map((_, i) => (
              <MetricCardSkeleton key={i} />
            ))}
          </div>
        ) : metrics ? (
          <>
            {/* Client Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <MetricCard
                title="Tempo como Cliente"
                value={`${Math.floor((new Date().getTime() - new Date(client.started_at).getTime()) / (1000 * 60 * 60 * 24 * 30))} meses`}
                icon={Users}
                variant="default"
              />
              <MetricCard
                title="Mês de Adesão"
                value={formatDate(client.started_at)}
                icon={Calendar}
                variant="default"
              />
              <MetricCard
                title="Status"
                value={client.is_active ? 'Ativo' : 'Inativo'}
                icon={Users}
                variant={client.is_active ? 'success' : 'destructive'}
              />
            </div>

            {/* Financial Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <MetricCard
                title="Entradas do Mês"
                value={formatCurrency(metrics.entries)}
                icon={TrendingUp}
                variant="success"
              />
              <MetricCard
                title="Saídas do Mês"
                value={formatCurrency(metrics.exits)}
                icon={DollarSign}
                variant="destructive"
              />
              <MetricCard
                title="Saldo do Mês"
                value={formatCurrency(metrics.net)}
                icon={DollarSign}
                variant={metrics.net >= 0 ? 'success' : 'destructive'}
              />
            </div>

            {/* Performance Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <MetricCard
                title="Ticket Médio"
                value={formatCurrency(metrics.avg_ticket)}
                icon={ShoppingCart}
                variant="primary"
              />
              <MetricCard
                title="Quantidade de Vendas"
                value={metrics.sales_count}
                icon={ShoppingCart}
                variant="primary"
              />
              <MetricCard
                title={`Meta (${metrics.goal_pct ? formatPercentage(metrics.goal_pct) : '0%'})`}
                value={formatCurrency(metrics.goal_amount)}
                icon={Target}
                variant={metrics.goal_status === 'Atingida' ? 'success' : 'warning'}
              />
            </div>
          </>
        ) : null}

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ChartCard title="Vendas vs Despesas">
            <div className="flex items-center justify-center h-full text-foreground-muted">
              Gráfico em desenvolvimento
            </div>
          </ChartCard>
          
          <ChartCard title="Despesas por Categoria">
            <div className="space-y-4">
              {expensesByCategory.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-foreground">{item.category}</span>
                  <span className="font-semibold text-foreground">{formatCurrency(item.total)}</span>
                </div>
              ))}
              {expensesByCategory.length === 0 && (
                <div className="text-center text-foreground-muted py-8">
                  Nenhuma despesa registrada neste mês
                </div>
              )}
            </div>
          </ChartCard>
        </div>

        {/* Data Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales Table */}
          <ChartCard title="Receitas do Mês">
            <div className="overflow-x-auto">
              {sales.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="border-b border-border">
                    <tr>
                      <th className="text-left p-2 text-foreground-muted">Data</th>
                      <th className="text-right p-2 text-foreground-muted">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.slice(0, 10).map((sale) => (
                      <tr key={sale.id} className="border-b border-border/50">
                        <td className="p-2 text-foreground">{formatDate(sale.occurred_at)}</td>
                        <td className="p-2 text-right font-medium text-success">
                          {formatCurrency(sale.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center text-foreground-muted py-8">
                  Nenhuma receita registrada neste mês
                </div>
              )}
            </div>
          </ChartCard>

          {/* Expenses Table */}
          <ChartCard title="Despesas do Mês">
            <div className="overflow-x-auto">
              {expenses.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="border-b border-border">
                    <tr>
                      <th className="text-left p-2 text-foreground-muted">Data</th>
                      <th className="text-left p-2 text-foreground-muted">Categoria</th>
                      <th className="text-right p-2 text-foreground-muted">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.slice(0, 10).map((expense) => (
                      <tr key={expense.id} className="border-b border-border/50">
                        <td className="p-2 text-foreground">{formatDate(expense.occurred_at)}</td>
                        <td className="p-2 text-foreground-muted">{expense.category || 'Outros'}</td>
                        <td className="p-2 text-right font-medium text-destructive">
                          {formatCurrency(expense.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center text-foreground-muted py-8">
                  Nenhuma despesa registrada neste mês
                </div>
              )}
            </div>
          </ChartCard>
        </div>
      </div>
    </div>
  );
}