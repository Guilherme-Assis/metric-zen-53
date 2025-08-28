import { useMemo } from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ChartCard } from './ChartCard';
import { formatCurrency } from '@/utils/formatters';
import { format, eachDayOfInterval, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ChartsSectionProps {
  selectedMonth: string;
  sales: Array<{ occurred_at: string; amount: number }>;
  expenses: Array<{ occurred_at: string; amount: number; category?: string }>;
  expensesByCategory: Array<{ category: string; total: number }>;
  metrics?: {
    entries: number;
    exits: number;
    goal_amount: number;
    goal_pct?: number;
  };
}

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#84cc16', '#f97316'];

export function ChartsSection({ selectedMonth, sales, expenses, expensesByCategory, metrics }: ChartsSectionProps) {
  // Prepare daily data for line chart
  const dailyData = useMemo(() => {
    const monthStart = startOfMonth(new Date(selectedMonth));
    const monthEnd = endOfMonth(new Date(selectedMonth));
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayNum = format(day, 'd');
      
      const daySales = sales
        .filter(sale => sale.occurred_at === dayStr)
        .reduce((sum, sale) => sum + Number(sale.amount), 0);
      
      const dayExpenses = expenses
        .filter(expense => expense.occurred_at === dayStr)
        .reduce((sum, expense) => sum + Number(expense.amount), 0);

      return {
        day: dayNum,
        fullDate: dayStr,
        entradas: daySales,
        saidas: dayExpenses,
        liquido: daySales - dayExpenses
      };
    });
  }, [selectedMonth, sales, expenses]);

  // Prepare category data for pie chart
  const categoryData = useMemo(() => {
    return expensesByCategory.map((item, index) => ({
      name: item.category,
      value: Number(item.total),
      color: COLORS[index % COLORS.length]
    }));
  }, [expensesByCategory]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="card-glass p-3 rounded-lg shadow-lg">
          <p className="text-foreground-muted text-sm mb-2">Dia {label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const CategoryTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="card-glass p-3 rounded-lg shadow-lg">
          <p className="text-foreground font-medium">{data.payload.name}</p>
          <p className="text-primary">{formatCurrency(data.value)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Daily Entries vs Exits */}
      <ChartCard title="Entradas vs Saídas Diárias">
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={dailyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="day" 
              stroke="hsl(var(--foreground-muted))"
              fontSize={12}
            />
            <YAxis 
              stroke="hsl(var(--foreground-muted))"
              fontSize={12}
              tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="entradas"
              stackId="1"
              stroke="hsl(var(--success))"
              fill="hsl(var(--success) / 0.2)"
              name="Entradas"
            />
            <Area
              type="monotone"
              dataKey="saidas"
              stackId="2"
              stroke="hsl(var(--destructive))"
              fill="hsl(var(--destructive) / 0.2)"
              name="Saídas"
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Expenses by Category */}
      <ChartCard title="Despesas por Categoria">
        {categoryData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CategoryTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-foreground-muted">
            Nenhuma despesa registrada neste mês
          </div>
        )}
        {categoryData.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {categoryData.map((item, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-foreground-muted truncate">{item.name}</span>
              </div>
            ))}
          </div>
        )}
      </ChartCard>

      {/* Goal Progress */}
      {metrics && (
        <ChartCard title="Progresso da Meta">
          <div className="flex flex-col items-center justify-center h-full">
            <div className="relative w-32 h-32 mb-4">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="hsl(var(--muted))"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="hsl(var(--primary))"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 56}`}
                  strokeDashoffset={`${2 * Math.PI * 56 * (1 - (metrics.goal_pct || 0) / 100)}`}
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-foreground">
                  {(metrics.goal_pct || 0).toFixed(0)}%
                </span>
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm text-foreground-muted mb-1">Meta do Mês</p>
              <p className="text-lg font-semibold text-foreground">
                {formatCurrency(metrics.goal_amount)}
              </p>
              <p className="text-sm text-success">
                {formatCurrency(metrics.entries)} atingido
              </p>
            </div>
          </div>
        </ChartCard>
      )}

      {/* Monthly Trend */}
      <ChartCard title="Tendência Líquida">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={dailyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="day" 
              stroke="hsl(var(--foreground-muted))"
              fontSize={12}
            />
            <YAxis 
              stroke="hsl(var(--foreground-muted))"
              fontSize={12}
              tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="liquido"
              stroke="hsl(var(--primary))"
              strokeWidth={3}
              dot={{ r: 4, fill: "hsl(var(--primary))" }}
              name="Saldo Líquido"
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}