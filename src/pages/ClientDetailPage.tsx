import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Calendar, TrendingUp, DollarSign, Target, Users, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { MetricCardSkeleton } from '@/components/dashboard/MetricCardSkeleton';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { DetailModal } from '@/components/dashboard/DetailModal';
import { ChartsSection } from '@/components/dashboard/ChartsSection';
import { ComparisonSection } from '@/components/dashboard/ComparisonSection';
import { YearlyTable } from '@/components/dashboard/YearlyTable';
import { clientsService, dashboardService } from '@/services/supabase';
import { formatCurrency, formatDate, formatPercentage } from '@/utils/formatters';
import { format, addMonths, subMonths } from 'date-fns';

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM-01'));
  const [detailModal, setDetailModal] = useState<{
    open: boolean;
    title: string;
    value: string | number;
    details: any;
  }>({ open: false, title: '', value: '', details: {} });

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
    const newMonth = format(subMonths(new Date(selectedMonth), 1), 'yyyy-MM-01');
    setSelectedMonth(newMonth);
  };

  const handleNextMonth = () => {
    const newMonth = format(addMonths(new Date(selectedMonth), 1), 'yyyy-MM-01');
    setSelectedMonth(newMonth);
  };

  const showMetricDetail = (title: string, value: string | number, details: any) => {
    setDetailModal({ open: true, title, value, details });
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
              <div 
                className="cursor-pointer transition-transform hover:scale-105"
                onClick={() => showMetricDetail(
                  "Tempo como Cliente",
                  `${Math.floor((new Date().getTime() - new Date(client.started_at).getTime()) / (1000 * 60 * 60 * 24 * 30))} meses`,
                  {
                    description: "Mostra há quantos meses este cliente está ativo no sistema.",
                    formula: "Data Atual - Data de Início do Cliente",
                    explanation: "Clientes com mais tempo tendem a ter maior valor de vida útil (LTV) e são importantes para a estabilidade do negócio."
                  }
                )}
              >
                <MetricCard
                  title="Tempo como Cliente"
                  value={`${Math.floor((new Date().getTime() - new Date(client.started_at).getTime()) / (1000 * 60 * 60 * 24 * 30))} meses`}
                  icon={Users}
                  variant="default"
                />
              </div>
              <div 
                className="cursor-pointer transition-transform hover:scale-105"
                onClick={() => showMetricDetail(
                  "Mês de Adesão",
                  formatDate(client.started_at),
                  {
                    description: "Data em que o cliente iniciou o relacionamento comercial.",
                    explanation: "Importante para entender sazonalidade e campanhas que trouxeram este cliente."
                  }
                )}
              >
                <MetricCard
                  title="Mês de Adesão"
                  value={formatDate(client.started_at)}
                  icon={Calendar}
                  variant="default"
                />
              </div>
              <div 
                className="cursor-pointer transition-transform hover:scale-105"
                onClick={() => showMetricDetail(
                  "Status do Cliente",
                  client.is_active ? 'Ativo' : 'Inativo',
                  {
                    description: "Indica se o cliente está atualmente ativo ou inativo no sistema.",
                    explanation: "Clientes ativos contribuem para a receita corrente. Clientes inativos podem indicar oportunidades de reativação."
                  }
                )}
              >
                <MetricCard
                  title="Status"
                  value={client.is_active ? 'Ativo' : 'Inativo'}
                  icon={Users}
                  variant={client.is_active ? 'success' : 'destructive'}
                />
              </div>
            </div>

            {/* Financial Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div 
                className="cursor-pointer transition-transform hover:scale-105"
                onClick={() => showMetricDetail(
                  "Entradas do Mês",
                  formatCurrency(metrics.entries),
                  {
                    description: "Total de vendas/receitas registradas no mês selecionado.",
                    formula: "Soma de todas as vendas do mês",
                    explanation: "Representa todo o dinheiro que entrou através de vendas. É o principal indicador de performance comercial."
                  }
                )}
              >
                <MetricCard
                  title="Entradas do Mês"
                  value={formatCurrency(metrics.entries)}
                  icon={TrendingUp}
                  variant="success"
                />
              </div>
              <div 
                className="cursor-pointer transition-transform hover:scale-105"
                onClick={() => showMetricDetail(
                  "Saídas do Mês",
                  formatCurrency(metrics.exits),
                  {
                    description: "Total de despesas/custos registrados no mês selecionado.",
                    formula: "Soma de todas as despesas do mês",
                    explanation: "Representa todos os gastos operacionais. Controlar as saídas é fundamental para manter a rentabilidade."
                  }
                )}
              >
                <MetricCard
                  title="Saídas do Mês"
                  value={formatCurrency(metrics.exits)}
                  icon={DollarSign}
                  variant="destructive"
                />
              </div>
              <div 
                className="cursor-pointer transition-transform hover:scale-105"
                onClick={() => showMetricDetail(
                  "Saldo do Mês",
                  formatCurrency(metrics.net),
                  {
                    description: "Resultado líquido do mês (Entradas - Saídas).",
                    formula: "Entradas - Saídas",
                    breakdown: [
                      { label: "Entradas", value: metrics.entries },
                      { label: "Saídas", value: metrics.exits }
                    ],
                    explanation: "O saldo líquido mostra se o mês foi lucrativo. Valores positivos indicam lucro, negativos indicam prejuízo."
                  }
                )}
              >
                <MetricCard
                  title="Saldo do Mês"
                  value={formatCurrency(metrics.net)}
                  icon={DollarSign}
                  variant={metrics.net >= 0 ? 'success' : 'destructive'}
                />
              </div>
            </div>

            {/* Performance Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div 
                className="cursor-pointer transition-transform hover:scale-105"
                onClick={() => showMetricDetail(
                  "Ticket Médio",
                  formatCurrency(metrics.avg_ticket),
                  {
                    description: "Valor médio por venda realizada no mês.",
                    formula: "Total de Vendas ÷ Quantidade de Vendas",
                    breakdown: [
                      { label: "Total de Vendas", value: metrics.entries },
                      { label: "Quantidade de Vendas", value: metrics.sales_count }
                    ],
                    explanation: "O ticket médio ajuda a entender o valor típico de cada transação. Aumentar o ticket médio é uma estratégia para crescer a receita."
                  }
                )}
              >
                <MetricCard
                  title="Ticket Médio"
                  value={formatCurrency(metrics.avg_ticket)}
                  icon={ShoppingCart}
                  variant="primary"
                />
              </div>
              <div 
                className="cursor-pointer transition-transform hover:scale-105"
                onClick={() => showMetricDetail(
                  "Quantidade de Vendas",
                  metrics.sales_count.toString(),
                  {
                    description: "Número total de transações/vendas realizadas no mês.",
                    explanation: "A quantidade de vendas mostra a atividade comercial. Combinado com o ticket médio, determina a receita total."
                  }
                )}
              >
                <MetricCard
                  title="Quantidade de Vendas"
                  value={metrics.sales_count}
                  icon={ShoppingCart}
                  variant="primary"
                />
              </div>
              <div 
                className="cursor-pointer transition-transform hover:scale-105"
                onClick={() => showMetricDetail(
                  "Meta do Mês",
                  formatCurrency(metrics.goal_amount),
                  {
                    description: `Meta estabelecida para o mês. Status: ${metrics.goal_status}`,
                    formula: `${metrics.goal_pct?.toFixed(1) || 0}% da meta atingida`,
                    breakdown: [
                      { label: "Meta estabelecida", value: metrics.goal_amount },
                      { label: "Valor atingido", value: metrics.entries }
                    ],
                    explanation: "As metas ajudam a direcionar esforços e medir performance. Atingir as metas consistentemente indica um negócio saudável."
                  }
                )}
              >
                <MetricCard
                  title={`Meta (${metrics.goal_pct ? formatPercentage(metrics.goal_pct) : '0%'})`}
                  value={formatCurrency(metrics.goal_amount)}
                  icon={Target}
                  variant={metrics.goal_status === 'Atingida' ? 'success' : 'warning'}
                />
              </div>
            </div>
          </>
        ) : null}

        {/* Charts Section */}
        <ChartsSection
          selectedMonth={selectedMonth}
          sales={sales}
          expenses={expenses}
          expensesByCategory={expensesByCategory}
          metrics={metrics}
        />

        {/* Comparison Section */}
        <ComparisonSection
          clientId={id!}
          currentMonth={selectedMonth}
          currentMetrics={metrics}
        />

        {/* Yearly Table */}
        <YearlyTable
          clientId={id!}
          currentYear={new Date(selectedMonth).getFullYear()}
        />

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

        {/* Detail Modal */}
        <DetailModal
          open={detailModal.open}
          onOpenChange={(open) => setDetailModal(prev => ({ ...prev, open }))}
          title={detailModal.title}
          value={detailModal.value}
          details={detailModal.details}
        />
      </div>
    </div>
  );
}