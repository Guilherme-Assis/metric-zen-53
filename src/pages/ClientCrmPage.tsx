// src/pages/ClientCrmPage.tsx
import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Calendar, Phone, Mail, UserRound, Edit, DollarSign, Briefcase, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { formatCurrency, formatDate } from "@/utils/formatters";
import { crmService } from "@/services/crm.service";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip } from "recharts";

/* ========= Modal para editar cadastro/comercial ========= */
function EditModal({
                       open,
                       onClose,
                       initial,
                       onSave,
                   }: {
    open: boolean;
    onClose: () => void;
    initial: any;
    onSave: (payload: any) => void;
}) {
    const [form, setForm] = useState(() => ({
        owner_name: initial?.owner_name || "",
        owner_phone: initial?.owner_phone || "",
        owner_email: initial?.owner_email || "",
        specialist_name: initial?.specialist_name || "",
        payment_amount: initial?.payment_amount ?? "",
        payment_day: initial?.payment_day ?? "",
        renewal_date: initial?.renewal_date ?? "",
    }));

    // Reidrata o form quando o modal abre ou quando o "initial" mudar
    useEffect(() => {
        if (!open) return;
        setForm({
            owner_name: initial?.owner_name || "",
            owner_phone: initial?.owner_phone || "",
            owner_email: initial?.owner_email || "",
            specialist_name: initial?.specialist_name || "",
            payment_amount: initial?.payment_amount ?? "",
            payment_day: initial?.payment_day ?? "",
            renewal_date: initial?.renewal_date ?? "",
        });
    }, [open, initial]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50">
            <div className="card-glass w-full max-w-2xl rounded-xl p-6">
                <h3 className="text-xl font-semibold mb-4">Editar informações do cliente</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs text-foreground-muted">Responsável (nome)</label>
                        <Input
                            value={form.owner_name}
                            onChange={(e) => setForm((f) => ({ ...f, owner_name: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="text-xs text-foreground-muted">Especialista responsável</label>
                        <Input
                            value={form.specialist_name}
                            onChange={(e) => setForm((f) => ({ ...f, specialist_name: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="text-xs text-foreground-muted">Telefone</label>
                        <Input
                            value={form.owner_phone}
                            onChange={(e) => setForm((f) => ({ ...f, owner_phone: e.target.value }))}
                            placeholder="(xx) xxxxx-xxxx"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-foreground-muted">E-mail</label>
                        <Input
                            type="email"
                            value={form.owner_email}
                            onChange={(e) => setForm((f) => ({ ...f, owner_email: e.target.value }))}
                        />
                    </div>

                    <div>
                        <label className="text-xs text-foreground-muted">Valor mensal (R$)</label>
                        <Input
                            type="number"
                            step="0.01"
                            value={form.payment_amount ?? ""}
                            onChange={(e) =>
                                setForm((f) => ({
                                    ...f,
                                    payment_amount: e.target.value === "" ? null : Number(e.target.value),
                                }))
                            }
                        />
                    </div>
                    <div>
                        <label className="text-xs text-foreground-muted">Dia de pagamento (1-31)</label>
                        <Input
                            type="number"
                            min={1}
                            max={31}
                            value={form.payment_day ?? ""}
                            onChange={(e) =>
                                setForm((f) => ({
                                    ...f,
                                    payment_day: e.target.value === "" ? null : Number(e.target.value),
                                }))
                            }
                        />
                    </div>
                    <div>
                        <label className="text-xs text-foreground-muted">Renovação/Vencimento do contrato</label>
                        <Input
                            type="date"
                            value={form.renewal_date ?? ""}
                            onChange={(e) => setForm((f) => ({ ...f, renewal_date: e.target.value || null }))}
                        />
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button onClick={() => onSave(form)}>Salvar</Button>
                </div>
            </div>
        </div>
    );
}

/* ========= Badge com tooltip informacional ========= */
function Badge({
                   label,
                   value,
                   info,
                   icon,
               }: {
    label: string;
    value: string | number;
    info?: string;
    icon?: React.ComponentType<any>;
}) {
    const Icon = icon;
    return (
        <div className="rounded-lg border border-border bg-[hsl(var(--secondary))]/50 px-3 py-2 flex flex-col gap-0.5">
            <div className="flex items-center gap-1">
                {Icon && <Icon className="h-3.5 w-3.5 text-foreground-muted" />}
                <span className="text-[11px] uppercase tracking-wide text-foreground-muted">{label}</span>
                {info && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 text-foreground-muted cursor-pointer" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs text-xs leading-snug">{info}</TooltipContent>
                    </Tooltip>
                )}
            </div>
            <span className="text-base font-semibold text-foreground">{value}</span>
        </div>
    );
}

export default function ClientCrmPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const qc = useQueryClient();
    const [openEdit, setOpenEdit] = useState(false);

    // ===== Queries (sempre no topo, antes de qualquer return) =====
    const { data: client, isLoading: loadingClient } = useQuery({
        queryKey: ["crm-client", id],
        queryFn: () => crmService.getClientCRM(id!),
        enabled: !!id,
    });

    const { data: totalRevenue = 0, isLoading: loadingTotal } = useQuery({
        queryKey: ["crm-total-revenue", id],
        queryFn: () => crmService.getTotalRevenue(id!),
        enabled: !!id,
    });

    const { data: revSeries = [], isLoading: loadingSeries } = useQuery({
        queryKey: ["crm-revenue-series", id],
        queryFn: () => crmService.getRevenueSeriesLast12(id!),
        enabled: !!id,
    });

    const mutUpdate = useMutation({
        mutationFn: (payload: Partial<any>) => crmService.updateClientCRM(id!, payload),
        onSuccess: async () => {
            await Promise.all([
                qc.invalidateQueries({ queryKey: ["crm-client", id] }),
                qc.invalidateQueries({ queryKey: ["crm-total-revenue", id] }),
                qc.invalidateQueries({ queryKey: ["crm-revenue-series", id] }),
            ]);
            setOpenEdit(false);
        },
    });

    // Próxima cobrança (useMemo no topo)
    const nextPaymentDate = useMemo(() => {
        if (!client?.payment_day) return null;
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const day = Math.min(client.payment_day, 28); // evita problemas com meses curtos
        const d = new Date(year, month, day);
        return d < now ? new Date(year, month + 1, day) : d;
    }, [client?.payment_day]);

    // Média mensal (12m) — MOVER para cima (antes dos returns)
    const monthlyAvg = useMemo(() => {
        const vals = (revSeries as any[]).map((p) => p.total);
        if (!vals.length) return 0;
        const sum = vals.reduce((s, v) => s + v, 0);
        return sum / vals.length;
    }, [revSeries]);

    // ===== Returns condicionais (depois de TODOS os hooks) =====
    if (loadingClient) {
        return (
            <div className="min-h-screen bg-background grid place-items-center">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    if (!client) {
        return (
            <div className="min-h-screen bg-background grid place-items-center">
                <div className="text-center">
                    <p className="text-destructive mb-4">Cliente não encontrado</p>
                    <Button onClick={() => navigate("/clients")}>Voltar</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Voltar
                        </Button>
                        <h1 className="text-2xl font-bold">{client.name} • CRM</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link to={`/clients/${client.id}`}>
                            <Button variant="outline" size="sm">Ver Performance</Button>
                        </Link>
                        <Button size="sm" onClick={() => setOpenEdit(true)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                        </Button>
                    </div>
                </div>

                {/* Cards principais */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Cadastro/Contato */}
                    <div className="card-glass p-6 rounded-xl">
                        <h3 className="text-lg font-semibold mb-4">Contato</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex items-center gap-2">
                                <UserRound className="w-4 h-4 text-foreground-muted" />
                                <span className="text-foreground-muted w-40">Responsável</span>
                                <span className="text-foreground">{client.owner_name || "—"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-foreground-muted" />
                                <span className="text-foreground-muted w-40">Telefone</span>
                                <span className="text-foreground">{client.owner_phone || "—"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-foreground-muted" />
                                <span className="text-foreground-muted w-40">E-mail</span>
                                <span className="text-foreground">{client.owner_email || "—"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Briefcase className="w-4 h-4 text-foreground-muted" />
                                <span className="text-foreground-muted w-40">Especialista</span>
                                <span className="text-foreground">{client.specialist_name || "—"}</span>
                            </div>
                        </div>
                    </div>

                    {/* Comercial */}
                    <div className="card-glass p-6 rounded-xl">
                        <h3 className="text-lg font-semibold mb-4">Condições Comerciais</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <Badge
                                label="Valor mensal"
                                value={client.payment_amount != null ? formatCurrency(client.payment_amount) : "—"}
                                icon={DollarSign}
                                info="Valor de recorrência mensal acordado em contrato."
                            />
                            <Badge
                                label="Dia de pagamento"
                                value={client.payment_day ?? "—"}
                                icon={Calendar}
                                info="Dia do mês para cobrança. Para meses curtos, ajustamos automaticamente."
                            />
                            <Badge
                                label="Próxima cobrança"
                                value={
                                    nextPaymentDate
                                        ? formatDate(nextPaymentDate.toISOString().slice(0, 10))
                                        : "—"
                                }
                                icon={Calendar}
                                info="Estimativa com base no dia de pagamento informado."
                            />
                            <Badge
                                label="Renovação/Vencimento"
                                value={client.renewal_date ? formatDate(client.renewal_date) : "—"}
                                icon={Calendar}
                                info="Data de renovação ou término do contrato atual."
                            />
                        </div>
                    </div>

                    {/* Datas & Receita */}
                    <div className="card-glass p-6 rounded-xl">
                        <h3 className="text-lg font-semibold mb-4">Resumo</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <Badge
                                label="Entrada"
                                value={client.started_at ? formatDate(client.started_at) : "—"}
                                info="Primeiro dia como cliente ativo."
                            />
                            <Badge
                                label="Status"
                                value={client.ended_at ? "Inativo" : "Ativo"}
                                info="Se existe data de fim, consideramos inativo."
                            />
                            <Badge
                                label="Receita acumulada"
                                value={loadingTotal ? "…" : formatCurrency(totalRevenue)}
                                info="Soma de todas as vendas (sales.amount) registradas para este cliente."
                            />
                            <Badge
                                label="Média mensal (12m)"
                                value={loadingSeries ? "…" : formatCurrency(monthlyAvg)}
                                info="Média simples dos últimos 12 meses de receita registrada."
                            />
                        </div>
                    </div>
                </div>

                {/* Gráfico de receita (12m) */}
                <ChartCard title="Receita Mensal (12 meses)">
                    {loadingSeries ? (
                        <div className="grid place-items-center h-[280px]">
                            <LoadingSpinner />
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={revSeries as any[]}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis
                                    dataKey="month"
                                    tickFormatter={(v) =>
                                        new Date(v)
                                            .toLocaleDateString("pt-BR", { month: "short" })
                                            .replace(".", "")
                                    }
                                    stroke="hsl(var(--foreground-muted))"
                                    fontSize={12}
                                />
                                <YAxis
                                    stroke="hsl(var(--foreground-muted))"
                                    fontSize={12}
                                    tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`}
                                />
                                <RTooltip
                                    content={({ active, payload, label }: any) =>
                                        active && payload?.length ? (
                                            <div className="card-glass p-3 rounded-lg text-sm">
                                                <div className="text-foreground-muted">
                                                    {new Date(label).toLocaleDateString("pt-BR", {
                                                        month: "long",
                                                        year: "numeric",
                                                    })}
                                                </div>
                                                <div className="font-medium">
                                                    {formatCurrency(payload[0].value)}
                                                </div>
                                            </div>
                                        ) : null
                                    }
                                />
                                <Bar dataKey="total" name="Receita" fill="hsl(var(--primary))" />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>

                {/* <NotesSection clientId={client.id} /> */}
            </div>

            <EditModal
                open={openEdit}
                onClose={() => setOpenEdit(false)}
                initial={client}
                onSave={(payload) => mutUpdate.mutate(payload)}
            />
        </div>
    );
}