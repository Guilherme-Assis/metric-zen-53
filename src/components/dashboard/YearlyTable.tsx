import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/supabase';
import { formatCurrency } from '@/utils/formatters';
import { format, eachMonthOfInterval, startOfYear, endOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChartCard } from './ChartCard';
import { Button } from '@/components/ui/button';
import { Calendar, Download } from 'lucide-react';

interface YearlyTableProps {
  clientId: string;
  currentYear: number;
}

export function YearlyTable({ clientId, currentYear }: YearlyTableProps) {
  const [selectedYear, setSelectedYear] = useState(currentYear);
  
  // Generate all months of the selected year
  const yearStart = startOfYear(new Date(selectedYear, 0, 1));
  const yearEnd = endOfYear(new Date(selectedYear, 0, 1));
  const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });

  // Fetch metrics for each month
  const monthlyQueries = months.map(month => {
    const monthISO = format(month, 'yyyy-MM-01');
    return useQuery({
      queryKey: ['yearly-metrics', clientId, monthISO],
      queryFn: () => dashboardService.getDashboardMetrics(clientId, monthISO),
      enabled: !!clientId
    });
  });

  const allLoaded = monthlyQueries.every(query => !query.isLoading);
  const monthlyData = monthlyQueries.map((query, index) => ({
    month: months[index],
    monthISO: format(months[index], 'yyyy-MM-01'),
    data: query.data,
    isLoading: query.isLoading
  }));

  // Calculate totals
  const totals = monthlyData.reduce(
    (acc, { data }) => {
      if (data) {
        acc.entries += data.entries || 0;
        acc.exits += data.exits || 0;
        acc.net += data.net || 0;
        acc.salesCount += data.sales_count || 0;
        acc.months += 1;
      }
      return acc;
    },
    { entries: 0, exits: 0, net: 0, salesCount: 0, months: 0 }
  );

  const avgTicket = totals.months > 0 && totals.salesCount > 0 
    ? totals.entries / totals.salesCount 
    : 0;

  return (
    <ChartCard 
      title={`Resumo Anual - ${selectedYear}`}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedYear(prev => prev - 1)}
          >
            {selectedYear - 1}
          </Button>
          <span className="text-foreground font-semibold px-3">
            {selectedYear}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedYear(prev => prev + 1)}
            disabled={selectedYear >= new Date().getFullYear()}
          >
            {selectedYear + 1}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card-glass p-4 rounded-lg">
            <p className="text-sm text-foreground-muted">Total Entradas</p>
            <p className="text-xl font-bold text-success">{formatCurrency(totals.entries)}</p>
          </div>
          <div className="card-glass p-4 rounded-lg">
            <p className="text-sm text-foreground-muted">Total Saídas</p>
            <p className="text-xl font-bold text-destructive">{formatCurrency(totals.exits)}</p>
          </div>
          <div className="card-glass p-4 rounded-lg">
            <p className="text-sm text-foreground-muted">Saldo Anual</p>
            <p className={`text-xl font-bold ${totals.net >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(totals.net)}
            </p>
          </div>
          <div className="card-glass p-4 rounded-lg">
            <p className="text-sm text-foreground-muted">Ticket Médio</p>
            <p className="text-xl font-bold text-primary">{formatCurrency(avgTicket)}</p>
          </div>
        </div>

        {/* Monthly Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr>
                <th className="text-left p-3 text-foreground-muted font-medium">Mês</th>
                <th className="text-right p-3 text-foreground-muted font-medium">Entradas</th>
                <th className="text-right p-3 text-foreground-muted font-medium">Saídas</th>
                <th className="text-right p-3 text-foreground-muted font-medium">Saldo</th>
                <th className="text-right p-3 text-foreground-muted font-medium">Vendas</th>
                <th className="text-right p-3 text-foreground-muted font-medium">Ticket Médio</th>
              </tr>
            </thead>
            <tbody>
              {monthlyData.map(({ month, data, isLoading }, index) => (
                <tr key={index} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="p-3 text-foreground font-medium">
                    {format(month, 'MMMM', { locale: ptBR })}
                  </td>
                  <td className="p-3 text-right text-success">
                    {isLoading ? '...' : formatCurrency(data?.entries || 0)}
                  </td>
                  <td className="p-3 text-right text-destructive">
                    {isLoading ? '...' : formatCurrency(data?.exits || 0)}
                  </td>
                  <td className={`p-3 text-right font-medium ${
                    !data ? 'text-foreground-muted' : 
                    data.net >= 0 ? 'text-success' : 'text-destructive'
                  }`}>
                    {isLoading ? '...' : formatCurrency(data?.net || 0)}
                  </td>
                  <td className="p-3 text-right text-foreground">
                    {isLoading ? '...' : (data?.sales_count || 0)}
                  </td>
                  <td className="p-3 text-right text-primary">
                    {isLoading ? '...' : formatCurrency(data?.avg_ticket || 0)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-border bg-muted/20">
              <tr>
                <td className="p-3 text-foreground font-bold">TOTAL</td>
                <td className="p-3 text-right font-bold text-success">
                  {formatCurrency(totals.entries)}
                </td>
                <td className="p-3 text-right font-bold text-destructive">
                  {formatCurrency(totals.exits)}
                </td>
                <td className={`p-3 text-right font-bold ${
                  totals.net >= 0 ? 'text-success' : 'text-destructive'
                }`}>
                  {formatCurrency(totals.net)}
                </td>
                <td className="p-3 text-right font-bold text-foreground">
                  {totals.salesCount}
                </td>
                <td className="p-3 text-right font-bold text-primary">
                  {formatCurrency(avgTicket)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </ChartCard>
  );
}