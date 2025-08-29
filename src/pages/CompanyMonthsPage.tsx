import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Calendar, Users } from "lucide-react";
import { companyService } from "@/services/company.service";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils/formatters";

type Row = {
    month: string;            // "YYYY-MM-01"
    clients_entered: number;
    clients_left: number;
    entries_cash: number;
    exits_churn: number;
    net_mrr: number;
    avg_ticket: number;
    goal_amount: number;
    goal_pct: number | null;
    goal_gap: number;
};

export default function CompanyMonthsPage() {
    const navigate = useNavigate();
    const [search, setSearch] = useState("");

    // Série mensal (para listagem de meses e pegar o "último" mês)
    const { data: series = [], isLoading, error } = useQuery({
        queryKey: ["company-series"],
        queryFn: () => companyService.getMonthlySeries(),
    });

    const latest: Row | undefined = useMemo(
        () => (series.length ? series[series.length - 1] : undefined),
        [series]
    );

    // KPIs do mês mais recente (para as badges iniciais)
    const { data: kpisLatest } = useQuery({
        queryKey: ["company-kpis-latest", latest?.month],
        queryFn: () => companyService.getKpis(latest!.month),
        enabled: !!latest?.month,
    });

    // FUNIL do mês mais recente (para a sessão "Retorno Funil")
    const { data: funnelLatest } = useQuery({
        queryKey: ["company-funnel-latest", latest?.month],
        queryFn: () => companyService.getFunnel(latest!.month),
        enabled: !!latest?.month,
    });

    const humanMonth = (iso: string) =>
        new Date(iso).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

    const filtered = useMemo(() => {
        if (!search.trim()) return series as Row[];
        const s = search.toLowerCase();
        return (series as Row[]).filter((r) => {
            const m = humanMonth(r.month).toLowerCase();
            return m.includes(s) || r.month.startsWith(search);
        });
    }, [series, search]);

    const handleRowClick = (m: string) => navigate(`/company?month=${m}`);

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-foreground mb-2">
                        Visão Mensal da Empresa
                    </h1>
                    <p className="text-foreground-muted">
                        KPIs consolidados mês a mês com acesso ao detalhamento.
                    </p>
                </div>

                {/* ===== Sessão inicial: BADGES (sem título) ===== */}
                <div className="card-glass rounded-xl p-6 mb-6">
                    {(!kpisLatest || !latest) ? (
                        <div className="flex items-center justify-center py-8">
                            <LoadingSpinner />
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2 text-foreground-muted">
                                    <Calendar className="w-4 h-4" />
                                    <span>Mês mais recente: <b className="text-foreground">{humanMonth(latest.month)}</b></span>
                                </div>
                                <div className="flex gap-2">
                                    <Link to={`/company?month=${latest.month}`}>
                                        <Button size="sm">Abrir dashboard do mês</Button>
                                    </Link>
                                </div>
                            </div>

                            {/* Grid de badges */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                                <Badge label="Entrada de clientes" value={kpisLatest.clients_entered} />
                                <Badge label="Saída de clientes" value={kpisLatest.clients_left} />
                                <Badge label="Saldo de clientes" value={kpisLatest.clients_balance} />

                                <Badge label="Entrada do mês (R$)" value={formatCurrency(kpisLatest.entries_cash)} />
                                <Badge label="Saídas do mês (R$)" value={formatCurrency(kpisLatest.exits_churn)} />
                                <Badge label="Saldo do mês (R$)" value={formatCurrency(kpisLatest.net_mrr)} />

                                <Badge label="Ticket médio (R$)" value={formatCurrency(kpisLatest.avg_ticket)} />

                                <Badge label="Meta do mês" value={formatCurrency(kpisLatest.goal_amount)} />
                                <Badge label="% da meta" value={kpisLatest.goal_pct != null ? `${kpisLatest.goal_pct}%` : "—"} />
                                <Badge label="Falta pra meta" value={formatCurrency(kpisLatest.goal_gap)} />
                            </div>
                        </>
                    )}
                </div>

                {/* ===== Sessão 2: Retorno Funil ===== */}
                <div className="card-glass rounded-xl p-6 mb-6">
                    <h2 className="text-lg font-semibold mb-4">Retorno Funil</h2>
                    {!funnelLatest ? (
                        <div className="flex items-center justify-center py-8">
                            <LoadingSpinner />
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                            <Badge label="Valor investido (aquisição)" value={formatCurrency(funnelLatest.invested)} />
                            <Badge label="Entrada do mês (R$)" value={formatCurrency(funnelLatest.entries)} />
                            <Badge label="Saldo do mês" value={formatCurrency(funnelLatest.saldo)} />
                            <Badge label="Entrada total LTV (R$)" value={formatCurrency(funnelLatest.ltv_total)} />
                            <Badge label="ROAS Mês" value={funnelLatest.roas != null ? `${funnelLatest.roas}x` : "—"} />
                        </div>
                    )}
                </div>

                {/* ===== Filtros + Ações ===== */}
                <div className="card-glass p-6 rounded-xl mb-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Input
                                placeholder="Filtrar por mês (ex.: 2025-08 ou 'ago')"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setSearch("")} size="sm">
                                Limpar
                            </Button>
                            <Link to="/company">
                                <Button size="sm">Ir ao Dashboard</Button>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* ===== Tabela de meses ===== */}
                <div className="card-glass rounded-xl overflow-hidden">
                    {isLoading ? (
                        <div className="flex items-center justify-center p-8">
                            <LoadingSpinner size="lg" />
                        </div>
                    ) : error ? (
                        <div className="p-8 text-center">
                            <p className="text-destructive">Erro ao carregar dados</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="p-8 text-center">
                            <Users className="w-12 h-12 text-foreground-muted mx-auto mb-4" />
                            <p className="text-foreground-muted">Nenhum mês encontrado</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="border-b border-border">
                                <tr>
                                    <th className="text-left p-4 font-medium text-foreground-muted">Mês</th>
                                    <th className="text-left p-4 font-medium text-foreground-muted">Entradas (R$)</th>
                                    <th className="text-left p-4 font-medium text-foreground-muted">Perda MRR (R$)</th>
                                    <th className="text-left p-4 font-medium text-foreground-muted">Saldo MRR (R$)</th>
                                    <th className="text-left p-4 font-medium text-foreground-muted">Clientes (+/−)</th>
                                    <th className="text-left p-4 font-medium text-foreground-muted">Meta (R$)</th>
                                    <th className="text-left p-4 font-medium text-foreground-muted">% Meta</th>
                                    <th className="text-left p-4 font-medium text-foreground-muted">Falta p/ Meta</th>
                                </tr>
                                </thead>
                                <tbody>
                                {filtered.map((row: Row) => (
                                    <tr
                                        key={row.month}
                                        className="border-b border-border hover:bg-card-hover transition-colors cursor-pointer"
                                        onClick={() => handleRowClick(row.month)}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleRowClick(row.month)}
                                    >
                                        <td className="p-4 font-medium">{humanMonth(row.month)}</td>
                                        <td className="p-4 text-foreground">{formatCurrency(row.entries_cash)}</td>
                                        <td className="p-4 text-foreground">{formatCurrency(row.exits_churn)}</td>
                                        <td className="p-4 text-foreground">{formatCurrency(row.net_mrr)}</td>
                                        <td className="p-4 text-foreground">+{row.clients_entered} / −{row.clients_left}</td>
                                        <td className="p-4 text-foreground">{formatCurrency(row.goal_amount)}</td>
                                        <td className="p-4 text-foreground">{row.goal_pct != null ? `${row.goal_pct}%` : "—"}</td>
                                        <td className="p-4 text-foreground">{formatCurrency(row.goal_gap)}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/** Badge compacta e premium */
function Badge({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="rounded-lg border border-border bg-[hsl(var(--secondary))]/50 px-3 py-2 flex flex-col gap-0.5">
            <span className="text-[11px] uppercase tracking-wide text-foreground-muted">{label}</span>
            <span className="text-base font-semibold text-foreground">{value}</span>
        </div>
    );
}