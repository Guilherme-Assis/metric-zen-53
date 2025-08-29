import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { dashboardService } from "@/services/supabase";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    clientId: string;
    monthISO: string; // "yyyy-MM-01"
};

export function AddDataModal({ open, onOpenChange, clientId, monthISO }: Props) {
    const qc = useQueryClient();

    // datas padrão dentro do mês selecionado
    const defaultDate = useMemo(() => {
        const d = new Date(monthISO);
        // por padrão, use hoje se cair no mesmo mês; senão, use o dia 15
        const now = new Date();
        if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
            return format(now, "yyyy-MM-dd");
        }
        d.setDate(15);
        return format(d, "yyyy-MM-dd");
    }, [monthISO]);

    // ---- form Receita
    const [saleAmount, setSaleAmount] = useState<string>("");
    const [saleDate, setSaleDate] = useState<string>(defaultDate);

    const createSale = useMutation({
        mutationFn: async () => {
            const amount = Number(String(saleAmount).replace(",", "."));
            if (!amount || amount <= 0) throw new Error("Informe um valor válido para a receita.");
            return dashboardService.createSale({
                client_id: clientId,
                amount,
                occurred_at: saleDate,
            });
        },
        onSuccess: () => {
            toast.success("Receita registrada!");
            setSaleAmount("");
            setSaleDate(defaultDate);
            invalidateClientMonthQueries();
        },
        onError: (e: any) => {
            toast.error(e?.message || "Erro ao registrar receita.");
        },
    });

    // ---- form Despesa
    const [expenseAmount, setExpenseAmount] = useState<string>("");
    const [expenseDate, setExpenseDate] = useState<string>(defaultDate);
    const [expenseCategory, setExpenseCategory] = useState<string>("Marketing");

    const createExpense = useMutation({
        mutationFn: async () => {
            const amount = Number(String(expenseAmount).replace(",", "."));
            if (!amount || amount <= 0) throw new Error("Informe um valor válido para a despesa.");
            return dashboardService.createExpense({
                client_id: clientId,
                amount,
                occurred_at: expenseDate,
                category: expenseCategory || null,
            });
        },
        onSuccess: () => {
            toast.success("Despesa registrada!");
            setExpenseAmount("");
            setExpenseDate(defaultDate);
            invalidateClientMonthQueries();
        },
        onError: (e: any) => {
            toast.error(e?.message || "Erro ao registrar despesa.");
        },
    });

    // ---- form Meta
    const [goalAmount, setGoalAmount] = useState<string>("");
    const upsertGoal = useMutation({
        mutationFn: async () => {
            const amount = Number(String(goalAmount).replace(",", "."));
            if (!amount || amount <= 0) throw new Error("Informe um valor válido para a meta.");
            return dashboardService.upsertGoal({
                client_id: clientId,
                month: monthISO, // "yyyy-MM-01"
                amount,
            });
        },
        onSuccess: () => {
            toast.success("Meta salva!");
            setGoalAmount("");
            invalidateClientMonthQueries();
        },
        onError: (e: any) => {
            toast.error(e?.message || "Erro ao salvar meta.");
        },
    });

    function invalidateClientMonthQueries() {
        qc.invalidateQueries({ queryKey: ["dashboard-metrics", clientId, monthISO] });
        qc.invalidateQueries({ queryKey: ["sales", clientId, monthISO] });
        qc.invalidateQueries({ queryKey: ["expenses", clientId, monthISO] });
        qc.invalidateQueries({ queryKey: ["expenses-by-category", clientId, monthISO] });
        // se tiver seções comparativas/anuais que dependem disso:
        qc.invalidateQueries({ queryKey: ["yearly", clientId] });
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Adicionar Dados</DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="sale" className="w-full">
                    <TabsList className="grid grid-cols-3">
                        <TabsTrigger value="sale">Receita</TabsTrigger>
                        <TabsTrigger value="expense">Despesa</TabsTrigger>
                        <TabsTrigger value="goal">Meta do mês</TabsTrigger>
                    </TabsList>

                    {/* RECEITA */}
                    <TabsContent value="sale" className="mt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label className="text-foreground-muted text-sm">Data</Label>
                                <Input
                                    type="date"
                                    value={saleDate}
                                    onChange={(e) => setSaleDate(e.target.value)}
                                />
                            </div>
                            <div>
                                <Label className="text-foreground-muted text-sm">Valor (R$)</Label>
                                <Input
                                    inputMode="decimal"
                                    placeholder="0,00"
                                    value={saleAmount}
                                    onChange={(e) => setSaleAmount(e.target.value)}
                                />
                            </div>
                        </div>

                        <DialogFooter className="mt-6">
                            <Button variant="outline" onClick={() => onOpenChange(false)}>
                                Cancelar
                            </Button>
                            <Button onClick={() => createSale.mutate()} disabled={createSale.isPending}>
                                {createSale.isPending ? "Salvando..." : "Salvar receita"}
                            </Button>
                        </DialogFooter>
                    </TabsContent>

                    {/* DESPESA */}
                    <TabsContent value="expense" className="mt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label className="text-foreground-muted text-sm">Data</Label>
                                <Input
                                    type="date"
                                    value={expenseDate}
                                    onChange={(e) => setExpenseDate(e.target.value)}
                                />
                            </div>
                            <div>
                                <Label className="text-foreground-muted text-sm">Valor (R$)</Label>
                                <Input
                                    inputMode="decimal"
                                    placeholder="0,00"
                                    value={expenseAmount}
                                    onChange={(e) => setExpenseAmount(e.target.value)}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <Label className="text-foreground-muted text-sm">Categoria</Label>
                                <Input
                                    placeholder="Ex.: Marketing, Operacional, Taxas..."
                                    value={expenseCategory}
                                    onChange={(e) => setExpenseCategory(e.target.value)}
                                />
                            </div>
                        </div>

                        <DialogFooter className="mt-6">
                            <Button variant="outline" onClick={() => onOpenChange(false)}>
                                Cancelar
                            </Button>
                            <Button onClick={() => createExpense.mutate()} disabled={createExpense.isPending}>
                                {createExpense.isPending ? "Salvando..." : "Salvar despesa"}
                            </Button>
                        </DialogFooter>
                    </TabsContent>

                    {/* META */}
                    <TabsContent value="goal" className="mt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label className="text-foreground-muted text-sm">Mês</Label>
                                <Input type="month" value={monthISO.slice(0, 7)} disabled />
                            </div>
                            <div>
                                <Label className="text-foreground-muted text-sm">Meta (R$)</Label>
                                <Input
                                    inputMode="decimal"
                                    placeholder="0,00"
                                    value={goalAmount}
                                    onChange={(e) => setGoalAmount(e.target.value)}
                                />
                            </div>
                        </div>

                        <DialogFooter className="mt-6">
                            <Button variant="outline" onClick={() => onOpenChange(false)}>
                                Cancelar
                            </Button>
                            <Button onClick={() => upsertGoal.mutate()} disabled={upsertGoal.isPending}>
                                {upsertGoal.isPending ? "Salvando..." : "Salvar meta"}
                            </Button>
                        </DialogFooter>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}