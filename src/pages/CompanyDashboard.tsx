import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { formatCurrency } from "@/utils/formatters";
import { companyService } from "@/services/company.service";
import { CompanyChartsSection } from "@/components/dashboard/CompanyChartsSection";
import { addMonths, subMonths } from "date-fns";

/* =========================
   Tipos e utils locais
   ========================= */
type SeriesRow = {
    month: string;             // "YYYY-MM-01"
    clients_entered: number;
    clients_left: number;
    clients_balance?: number;
    entries_cash: number;
    exits_churn: number;
    net_mrr: number;
    avg_ticket?: number;
    goal_amount: number;
    goal_pct?: number | null;
    goal_gap?: number;
    active_contracts?: number;
    // opcional — se existir na sua view, habilita ticket médio ponderado:
    sales_count?: number;
};

type FunnelRow = {
    month: string;
    invested: number;
    entries: number;
    saldo: number;
    ltv_total: number;
    roas: number | null;
};

type Preset = "current" | "last" | "3m" | "6m" | "12m" | "custom";

/* helpers */
const toMonthISO = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;

const parseISO = (iso: string) => new Date(iso);

function between(iso: string, fromISO: string, toISO: string) {
    return iso >= fromISO && iso <= toISO;
}

function avg(arr: number[]) {
    if (!arr.length) return 0;
    return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function sum(arr: number[]) {
    return arr.reduce((s, v) => s + v, 0);
}

function pctChange(current: number, prev: number) {
    if (prev === 0) return current === 0 ? 0 : 100;
    return ((current - prev) / prev) * 100;
}

function humanMonthPt(iso: string) {
    return new Date(iso).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function countMonthsInclusive(fromISO: string, toISO: string) {
    const f = parseISO(fromISO);
    const t = parseISO(toISO);
    return (t.getFullYear() - f.getFullYear()) * 12 + (t.getMonth() - f.getMonth()) + 1;
}

/** Calcula o range a partir de um preset e um mês âncora (to) */
function rangeFromPreset(preset: Preset, anchorToIso: string) {
    const to = new Date(anchorToIso);
    to.setDate(1);
    switch (preset) {
        case "current": return { from: toMonthISO(to), to: toMonthISO(to) };
        case "last": {
            const last = subMonths(to, 1);
            return { from: toMonthISO(last), to: toMonthISO(last) };
        }
        case "3m": return { from: toMonthISO(addMonths(to, -2)), to: toMonthISO(to) };
        case "6m": return { from: toMonthISO(addMonths(to, -5)), to: toMonthISO(to) };
        case "12m": return { from: toMonthISO(addMonths(to, -11)), to: toMonthISO(to) };
        default: return null;
    }
}

/* =========================
   Componente principal
   ========================= */
export default function CompanyDashboard() {
    const [params, setParams] = useSearchParams();

    // --- mês “âncora” (badges/headers e também default da âncora dos gráficos)
    const initialMonthISO = useMemo(() => {
        const urlMonth = params.get("month");
        if (urlMonth) return urlMonth;
        return toMonthISO(new Date());
    }, [params]);
    const [monthISO, setMonthISO] = useState(initialMonthISO);
    const humanMonth = useMemo(() => humanMonthPt(monthISO), [monthISO]);

    // --- preset do período dos gráficos / agregações
    const initialPreset = (params.get("preset") as Preset) || "12m";
    const [preset, setPreset] = useState<Preset>(initialPreset);

    // âncora do range (mês final dos gráficos) quando preset != custom
    const initialAnchor = useMemo(
        () => params.get("anchor") || monthISO,
        // ancorar inicialmente no mês selecionado
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    );
    const [anchorISO, setAnchorISO] = useState(initialAnchor);

    // range custom (quando preset === "custom")
    const now = useMemo(() => {
        const d = new Date();
        d.setDate(1);
        return d;
    }, []);
    const defaultCustomTo = toMonthISO(now);
    const defaultCustomFrom = toMonthISO(addMonths(now, -11));

    const [customFromISO, setCustomFromISO] = useState(params.get("from") || defaultCustomFrom);
    const [customToISO, setCustomToISO] = useState(params.get("to") || defaultCustomTo);

    // === Deriva from/to sem setState (evita loops) ===
    const { fromISO, toISO } = useMemo(() => {
        if (preset === "custom") {
            return { fromISO: customFromISO, toISO: customToISO };
        }
        const r = rangeFromPreset(preset, anchorISO) ?? { from: customFromISO, to: customToISO };
        return { fromISO: r.from, toISO: r.to };
    }, [preset, anchorISO, customFromISO, customToISO]);

    // Sincroniza a URL (apenas refletindo estados/derivados; não altera estado)
    useEffect(() => {
        const next = new URLSearchParams();
        next.set("month", monthISO);
        next.set("preset", preset);
        next.set("anchor", anchorISO);
        next.set("from", fromISO);
        next.set("to", toISO);
        setParams(next);
    }, [monthISO, preset, anchorISO, fromISO, toISO, setParams]);

    // Quando mudar o mês selecionado e NÃO for custom, movemos a âncora dos gráficos junto
    useEffect(() => {
        if (preset !== "custom") {
            if (anchorISO !== monthISO) setAnchorISO(monthISO);
        }
    }, [monthISO, preset, anchorISO]);

    // ======================
    // Queries base
    // ======================
    // Série mensal (fonte de verdade para agregar KPIs por período)
    const { data: series = [], isLoading: loadingSeries } = useQuery({
        queryKey: ["company-series"],
        queryFn: () => companyService.getMonthlySeries(),
    });

    // Série de funil/ROAS por mês
    const { data: roasSeries = [], isLoading: loadingRoas } = useQuery({
        queryKey: ["company-roas-series", series?.[0]?.month, series?.[series.length - 1]?.month],
        enabled: (series as SeriesRow[]).length > 0,
        queryFn: async () => {
            const funnels = await Promise.all((series as SeriesRow[]).map((row) => companyService.getFunnel(row.month)));
            return funnels.map((f) => ({
                month: f.month,
                roas: f.roas ?? null,
                invested: f.invested ?? 0,
                entries: f.entries ?? 0,
                saldo: f.saldo ?? 0,
                ltv_total: f.ltv_total ?? 0,
            })) as FunnelRow[];
        },
    });

    const isLoadingAll = loadingSeries || loadingRoas;

    // ======================
    // Filtragem por período
    // ======================
    const seriesFiltered = useMemo(
        () => (series as SeriesRow[]).filter((r) => between(r.month, fromISO, toISO)),
        [series, fromISO, toISO]
    );

    const roasFiltered = useMemo(
        () => (roasSeries as FunnelRow[]).filter((r) => between(r.month, fromISO, toISO)),
        [roasSeries, fromISO, toISO]
    );

    // ======================
    // Agregações para BADGES (período filtrado)
    // ======================
    const kpisAgg = useMemo(() => {
        const s = seriesFiltered;

        const clients_entered = sum(s.map((r) => r.clients_entered ?? 0));
        const clients_left    = sum(s.map((r) => r.clients_left ?? 0));
        const clients_balance = sum(s.map((r) => r.clients_balance ?? 0));

        const entries_cash = sum(s.map((r) => r.entries_cash ?? 0));
        const exits_churn  = sum(s.map((r) => r.exits_churn ?? 0));
        const net_mrr      = sum(s.map((r) => r.net_mrr ?? 0));

        // avg_ticket — preferir ponderado se existir sales_count
        const totalSalesCount = sum(s.map((r) => r.sales_count ?? 0));
        let avg_ticket: number;
        if (totalSalesCount > 0) {
            avg_ticket = entries_cash / totalSalesCount;
        } else {
            // fallback: média simples dos avg_ticket mensais
            const validTickets = s.map((r) => r.avg_ticket ?? 0).filter((v) => v > 0);
            avg_ticket = validTickets.length ? avg(validTickets) : 0;
        }

        // goal_amount — somatório do período; % meta = entradas / metas; gap = metas - entradas
        const goal_amount = sum(s.map((r) => r.goal_amount ?? 0));
        const goal_pct = goal_amount > 0 ? (entries_cash / goal_amount) * 100 : null;
        const goal_gap = Math.max(goal_amount - entries_cash, 0);

        // active_contracts — usar o último mês do range (mais próximo de toISO)
        const lastRow = [...s].sort((a, b) => (a.month < b.month ? -1 : 1)).at(-1) || null;
        const active_contracts = lastRow?.active_contracts ?? 0;

        return {
            clients_entered,
            clients_left,
            clients_balance,
            entries_cash,
            exits_churn,
            net_mrr,
            avg_ticket,
            goal_amount,
            goal_pct,
            goal_gap,
            active_contracts,
        };
    }, [seriesFiltered]);

    // ======================
    // Agregações do FUNIL (período filtrado)
    // ======================
    const funnelAgg = useMemo(() => {
        const f = roasFiltered;
        const invested  = sum(f.map((r) => r.invested ?? 0));
        const entries   = sum(f.map((r) => r.entries ?? 0));
        const saldo     = sum(f.map((r) => r.saldo ?? 0));
        const ltv_total = sum(f.map((r) => r.ltv_total ?? 0));
        const roas = invested > 0 ? entries / invested : null;

        return { invested, entries, saldo, ltv_total, roas };
    }, [roasFiltered]);

    // ======================
    // Comparações: janela atual vs janela anterior do MESMO TAMANHO
    // ======================
    const windowSize = useMemo(() => countMonthsInclusive(fromISO, toISO), [fromISO, toISO]);

    const prevWindow = useMemo(() => {
        // janela anterior termina 1 mês antes de fromISO e tem o mesmo tamanho
        const prevTo = toMonthISO(subMonths(parseISO(fromISO), 1));
        const prevFrom = toMonthISO(addMonths(parseISO(prevTo), -(windowSize - 1)));
        return { prevFrom, prevTo };
    }, [fromISO, windowSize]);

    const seriesPrev = useMemo(
        () => (series as SeriesRow[]).filter((r) => between(r.month, prevWindow.prevFrom, prevWindow.prevTo)),
        [series, prevWindow]
    );

    const compAgg = useMemo(() => {
        // Comparar entradas e net entre períodos
        const curEntries = sum(seriesFiltered.map((r) => r.entries_cash ?? 0));
        const prevEntries = sum(seriesPrev.map((r) => r.entries_cash ?? 0));

        const curNet = sum(seriesFiltered.map((r) => r.net_mrr ?? 0));
        const prevNet = sum(seriesPrev.map((r) => r.net_mrr ?? 0));

        return {
            labelPrev: `${humanMonthPt(prevWindow.prevFrom)} – ${humanMonthPt(prevWindow.prevTo)}`,
            curEntries,
            prevEntries,
            deltaEntries: curEntries - prevEntries,
            pctEntries: pctChange(curEntries, prevEntries),

            curNet,
            prevNet,
            deltaNet: curNet - prevNet,
            pctNet: pctChange(curNet, prevNet),
            avg3Entries: avg(seriesFiltered.slice(-3).map((r) => r.entries_cash)),
            avg6Entries: avg(seriesFiltered.slice(-6).map((r) => r.entries_cash)),
            avg12Entries: avg(seriesFiltered.slice(-12).map((r) => r.entries_cash)),
            avg3Net: avg(seriesFiltered.slice(-3).map((r) => r.net_mrr)),
            avg6Net: avg(seriesFiltered.slice(-6).map((r) => r.net_mrr)),
            avg12Net: avg(seriesFiltered.slice(-12).map((r) => r.net_mrr)),
        };
    }, [seriesFiltered, seriesPrev, prevWindow]);

    // ======================
    // Handlers
    // ======================
    const handleMonthChange = (val: string) => {
        if (!val) return;
        const [y, m] = val.split("-");
        const newISO = `${y}-${m}-01`;
        setMonthISO(newISO);
        if (preset !== "custom") setAnchorISO(newISO);
    };

    const handlePreset = (p: Preset) => {
        setPreset(p);
        if (p !== "custom") {
            setAnchorISO((iso) => iso || monthISO);
        }
    };

    const goToCurrentMonth = () => {
        const iso = toMonthISO(new Date());
        setMonthISO(iso);
        if (preset !== "custom") setAnchorISO(iso);
    };

    // ======================
    // Render
    // ======================
    return (
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">Dashboard da Empresa • {humanMonth}</h1>
                        <p className="text-sm text-foreground-muted">
                            Período dos gráficos & KPIs agregados:{" "}
                            {new Date(fromISO).toLocaleDateString("pt-BR", { month: "short", year: "numeric" }).replace(".", "")}
                            {" – "}
                            {new Date(toISO).toLocaleDateString("pt-BR", { month: "short", year: "numeric" }).replace(".", "")}
                            {" "}({windowSize} {windowSize > 1 ? "meses" : "mês"})
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Mês de referência (ajusta âncora quando preset != custom) */}
                        <Input
                            type="month"
                            value={monthISO.slice(0, 7)}
                            onChange={(e) => handleMonthChange(e.target.value)}
                            className="w-[160px]"
                        />
                        <Button variant="outline" onClick={goToCurrentMonth}>Mês atual</Button>

                        {/* Presets (período dos gráficos + agregações) */}
                        <div className="flex gap-1">
                            <PresetButton label="Atual"  active={preset === "current"} onClick={() => handlePreset("current")} />
                            <PresetButton label="Último"  active={preset === "last"}    onClick={() => handlePreset("last")} />
                            <PresetButton label="3m"      active={preset === "3m"}      onClick={() => handlePreset("3m")} />
                            <PresetButton label="6m"      active={preset === "6m"}      onClick={() => handlePreset("6m")} />
                            <PresetButton label="12m"     active={preset === "12m"}     onClick={() => handlePreset("12m")} />
                            <PresetButton label="Custom"  active={preset === "custom"}  onClick={() => handlePreset("custom")} />
                        </div>

                        {/* Range customizado */}
                        {preset === "custom" && (
                            <div className="flex items-center gap-2">
                                <Input
                                    type="month"
                                    value={customFromISO.slice(0, 7)}
                                    onChange={(e) => setCustomFromISO(`${e.target.value}-01`)}
                                    className="w-[140px]"
                                />
                                <span className="text-foreground-muted">—</span>
                                <Input
                                    type="month"
                                    value={customToISO.slice(0, 7)}
                                    onChange={(e) => {
                                        const iso = `${e.target.value}-01`;
                                        setCustomToISO(iso);
                                        // opcional: sincronizar mês âncora com fim do range
                                        setMonthISO(iso);
                                    }}
                                    className="w-[140px]"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* ===== Sessão 1: BADGES (agregadas pelo período filtrado) ===== */}
                <div className="card-glass rounded-xl p-6">
                    {isLoadingAll ? (
                        <div className="flex items-center justify-center py-10">
                            <LoadingSpinner size="lg" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                            <Badge label="Entrada de clientes" value={kpisAgg.clients_entered} />
                            <Badge label="Saída de clientes" value={kpisAgg.clients_left} />
                            <Badge label="Saldo de clientes" value={kpisAgg.clients_balance} />

                            <Badge label="Entrada (R$)" value={formatCurrency(kpisAgg.entries_cash)} />
                            <Badge label="Saídas (R$)" value={formatCurrency(kpisAgg.exits_churn)} />
                            <Badge label="Saldo (R$)" value={formatCurrency(kpisAgg.net_mrr)} />

                            <Badge label="Ticket médio (R$)" value={formatCurrency(kpisAgg.avg_ticket ?? 0)} />
                            <Badge label="Contratos ativos" value={kpisAgg.active_contracts ?? 0} />

                            <Badge label="Meta (R$)" value={formatCurrency(kpisAgg.goal_amount)} />
                            <Badge label="% da meta" value={kpisAgg.goal_pct != null ? `${kpisAgg.goal_pct.toFixed(1)}%` : "—"} />
                            <Badge label="Falta pra meta" value={formatCurrency(kpisAgg.goal_gap ?? 0)} />
                        </div>
                    )}
                </div>

                {/* ===== Sessão 2: Retorno Funil (agregado pelo período) ===== */}
                <div className="card-glass rounded-xl p-6">
                    <h2 className="text-lg font-semibold mb-4">Retorno Funil</h2>
                    {isLoadingAll ? (
                        <div className="flex items-center justify-center py-10">
                            <LoadingSpinner size="lg" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                            <Badge label="Valor investido (aquisição)" value={formatCurrency(funnelAgg.invested)} />
                            <Badge label="Entrada (R$)" value={formatCurrency(funnelAgg.entries)} />
                            <Badge label="Saldo (R$)" value={formatCurrency(funnelAgg.saldo)} />
                            <Badge label="Entrada total LTV (R$)" value={formatCurrency(funnelAgg.ltv_total)} />
                            <Badge label="ROAS" value={funnelAgg.roas != null ? `${funnelAgg.roas.toFixed(2)}x` : "—"} />
                        </div>
                    )}
                </div>

                {/* ===== Sessão 3: Comparações (janela atual vs janela anterior do mesmo tamanho) ===== */}
                <div className="card-glass rounded-xl p-6">
                    <h2 className="text-lg font-semibold mb-4">Comparativos</h2>

                    {isLoadingAll ? (
                        <div className="flex items-center justify-center py-8">
                            <LoadingSpinner size="lg" />
                        </div>
                    ) : seriesFiltered.length === 0 ? (
                        <div className="text-foreground-muted">Sem dados no período selecionado.</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Entradas */}
                            <CompareBlock
                                title={`Entradas (R$) • vs ${compAgg.labelPrev}`}
                                current={compAgg.curEntries}
                                previous={compAgg.prevEntries}
                                deltaAbs={compAgg.deltaEntries}
                                deltaPct={compAgg.pctEntries}
                                avg3={compAgg.avg3Entries}
                                avg6={compAgg.avg6Entries}
                                avg12={compAgg.avg12Entries}
                            />

                            {/* Saldo (MRR líquido) */}
                            <CompareBlock
                                title={`Saldo (R$) • vs ${compAgg.labelPrev}`}
                                current={compAgg.curNet}
                                previous={compAgg.prevNet}
                                deltaAbs={compAgg.deltaNet}
                                deltaPct={compAgg.pctNet}
                                avg3={compAgg.avg3Net}
                                avg6={compAgg.avg6Net}
                                avg12={compAgg.avg12Net}
                            />
                        </div>
                    )}
                </div>

                {/* ===== Gráficos (refletem o range selecionado) ===== */}
                {isLoadingAll ? (
                    <div className="card-glass rounded-xl p-10 grid place-items-center">
                        <LoadingSpinner size="lg" />
                    </div>
                ) : (
                    <CompanyChartsSection
                        series={seriesFiltered as any}
                        roasSeries={roasFiltered as any}
                    />
                )}
            </div>
        </div>
    );
}

/* =========================
   Subcomponentes visuais
   ========================= */

function PresetButton({
                          label,
                          active,
                          onClick,
                      }: {
    label: string;
    active?: boolean;
    onClick: () => void;
}) {
    return (
        <Button
            variant={active ? "default" : "outline"}
            size="sm"
            onClick={onClick}
            className={active ? "" : "text-foreground-muted"}
        >
            {label}
        </Button>
    );
}

function Badge({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="rounded-lg border border-border bg-[hsl(var(--secondary))]/50 px-3 py-2 flex flex-col gap-0.5">
            <span className="text-[11px] uppercase tracking-wide text-foreground-muted">{label}</span>
            <span className="text-base font-semibold text-foreground">{value}</span>
        </div>
    );
}

function CompareBlock({
                          title,
                          current,
                          previous,
                          deltaAbs,
                          deltaPct,
                          avg3,
                          avg6,
                          avg12,
                      }: {
    title: string;
    current: number;
    previous: number;
    deltaAbs: number;
    deltaPct: number;
    avg3: number;
    avg6: number;
    avg12: number;
}) {
    const pill = (v: number) =>
        v > 0 ? "text-success" : v < 0 ? "text-destructive" : "text-foreground-muted";

    return (
        <div className="rounded-xl border border-border p-4 bg-[hsl(var(--secondary))]/30">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                <span className={`text-xs font-medium ${pill(deltaAbs)}`}>
          {deltaAbs >= 0 ? "▲" : "▼"} {formatCurrency(Math.abs(deltaAbs))} ({isFinite(deltaPct) ? `${deltaPct.toFixed(1)}%` : "—"})
        </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                    <div className="text-foreground-muted">Período atual</div>
                    <div className="text-foreground font-semibold">{formatCurrency(current)}</div>
                </div>
                <div className="space-y-1">
                    <div className="text-foreground-muted">Período anterior</div>
                    <div className="text-foreground font-semibold">{formatCurrency(previous)}</div>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-4">
                <SmallStat label="Média 3m (fim)" value={formatCurrency(avg3)} />
                <SmallStat label="Média 6m (fim)" value={formatCurrency(avg6)} />
                <SmallStat label="Média 12m (fim)" value={formatCurrency(avg12)} />
            </div>
        </div>
    );
}

function SmallStat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border border-border bg-[hsl(var(--secondary))]/40 px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide text-foreground-muted">{label}</div>
            <div className="text-sm font-semibold text-foreground">{value}</div>
        </div>
    );
}