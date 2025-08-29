import {
    ResponsiveContainer,
    LineChart, Line,
    BarChart, Bar,
    AreaChart, Area,
    CartesianGrid, XAxis, YAxis, Tooltip, Legend
} from "recharts";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { formatCurrency } from "@/utils/formatters";

type SeriesRow = {
    month: string;             // "YYYY-MM-01"
    clients_entered: number;
    clients_left: number;
    // se sua view já trouxer, ótimo; senão calculamos em runtime
    clients_balance?: number;
    entries_cash: number;
    exits_churn: number;       // positivo no DB
    net_mrr: number;
    goal_amount: number;
};

type RoasRow = {
    month: string;
    roas: number | null;
    invested: number;
    entries: number;
};

const axisColor = "hsl(var(--foreground-muted))";
const gridColor = "hsl(var(--border))";
const colorPrimary   = "hsl(var(--primary))";
const colorSuccess   = "hsl(var(--success))";
const colorDestr     = "hsl(var(--destructive))";
const colorPrimary20 = "hsl(var(--primary) / 0.2)";
const colorSuccess20 = "hsl(var(--success) / 0.2)";
const colorDestr20   = "hsl(var(--destructive) / 0.2)";

function monthTick(iso: string) {
    const d = new Date(iso);
    const m = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
    return `${m}/${String(d.getFullYear()).slice(-2)}`;
}

export function CompanyChartsSection({
                                         series,
                                         roasSeries,
                                     }: {
    series: SeriesRow[];
    roasSeries: RoasRow[];
}) {
    const withBalance = (series ?? []).map((r) => ({
        ...r,
        clients_balance:
            typeof r.clients_balance === "number"
                ? r.clients_balance
                : (Number(r.clients_entered ?? 0) - Number(r.clients_left ?? 0)),
    }));

    // churn negativo só para visual empilhado
    const stacked = withBalance.map((r) => ({
        ...r,
        exits_churn_neg: -Math.abs(Number(r.exits_churn ?? 0)),
    }));

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Evolução de clientes (Área para casar com seu ChartsSection) */}
            <ChartCard title="Evolução de Clientes (Entradas, Saídas, Saldo)">
                <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={withBalance}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                        <XAxis dataKey="month" tickFormatter={monthTick} stroke={axisColor} fontSize={12} />
                        <YAxis stroke={axisColor} fontSize={12} />
                        <Tooltip
                            labelFormatter={(l) =>
                                new Date(l as string).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
                            }
                        />
                        <Legend />
                        <Area type="monotone" dataKey="clients_entered" name="Entradas" stroke={colorSuccess} fill={colorSuccess20} />
                        <Area type="monotone" dataKey="clients_left"    name="Saídas"   stroke={colorDestr}   fill={colorDestr20} />
                        <Line type="monotone" dataKey="clients_balance" name="Saldo"    stroke={colorPrimary} strokeWidth={3} dot={false} />
                    </AreaChart>
                </ResponsiveContainer>
            </ChartCard>

            {/* Entradas vs Perda (MRR) empilhado + Saldo (linha) */}
            <ChartCard title="Entradas vs Perda (MRR) • Saldo (linha)">
                <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={stacked}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                        <XAxis dataKey="month" tickFormatter={monthTick} stroke={axisColor} fontSize={12} />
                        <YAxis stroke={axisColor} fontSize={12} />
                        <Tooltip
                            formatter={(val: any) => formatCurrency(Number(val))}
                            labelFormatter={(l) =>
                                new Date(l as string).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
                            }
                        />
                        <Legend />
                        <Bar dataKey="entries_cash"    name="Entradas"   stackId="mrr" fill={colorSuccess}   radius={[6,6,0,0]} />
                        <Bar dataKey="exits_churn_neg" name="Perda MRR"  stackId="mrr" fill={colorDestr}     radius={[6,6,0,0]} />
                        <Line type="monotone" dataKey="net_mrr" name="Saldo (MRR)" stroke={colorPrimary} strokeWidth={3} dot={false} />
                    </BarChart>
                </ResponsiveContainer>
            </ChartCard>

            {/* Meta vs Realizado */}
            <ChartCard title="Meta vs Realizado (Caixa)">
                <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={withBalance}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                        <XAxis dataKey="month" tickFormatter={monthTick} stroke={axisColor} fontSize={12} />
                        <YAxis stroke={axisColor} fontSize={12} />
                        <Tooltip formatter={(val: any) => formatCurrency(Number(val))} />
                        <Legend />
                        <Bar dataKey="goal_amount"  name="Meta"      fill={colorPrimary} radius={[6,6,0,0]} />
                        <Bar dataKey="entries_cash" name="Realizado" fill={colorSuccess} radius={[6,6,0,0]} />
                    </BarChart>
                </ResponsiveContainer>
            </ChartCard>

            {/* ROAS */}
            <ChartCard title="ROAS (Return on Ad Spend)">
                <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={roasSeries}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                        <XAxis dataKey="month" tickFormatter={monthTick} stroke={axisColor} fontSize={12} />
                        <YAxis stroke={axisColor} fontSize={12} />
                        <Tooltip
                            formatter={(val: any) => (val == null ? "—" : `${val}x`)}
                            labelFormatter={(l) =>
                                new Date(l as string).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
                            }
                        />
                        <Legend />
                        <Line type="monotone" dataKey="roas" name="ROAS" stroke={colorPrimary} strokeWidth={3} dot={{ r: 3, fill: colorPrimary }} />
                    </LineChart>
                </ResponsiveContainer>
            </ChartCard>
        </div>
    );
}