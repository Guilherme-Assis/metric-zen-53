import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";

export type ClientCRM = {
    id: string;
    name: string;
    started_at: string | null;
    ended_at: string | null;
    // campos de CRM (adicione essas colunas em clients se ainda não existirem)
    owner_name: string | null;
    owner_phone: string | null;
    owner_email: string | null;
    specialist_name: string | null;
    payment_amount: number | null;
    payment_day: number | null; // 1..28/30/31
    renewal_date: string | null; // ISO date
};

export type RevenuePoint = { month: string; total: number };

export const crmService = {
    async getClientCRM(id: string): Promise<ClientCRM | null> {
        const { data, error } = await supabase
            .from("clients")
            .select(
                "id, name, started_at, ended_at, owner_name, owner_phone, owner_email, specialist_name, payment_amount, payment_day, renewal_date"
            )
            .eq("id", id)
            .maybeSingle();

        if (error) throw error;
        return data as ClientCRM | null;
    },

    async updateClientCRM(id: string, payload: Partial<ClientCRM>): Promise<void> {
        const { error } = await supabase
            .from("clients")
            .update(payload)
            .eq("id", id);
        if (error) throw error;
    },

    // Receita total (lifetime): soma da tabela sales por client_id
    async getTotalRevenue(id: string): Promise<number> {
        const { data, error } = await supabase
            .from("sales")
            .select("amount")
            .eq("client_id", id);

        if (error) throw error;
        const total = (data ?? []).reduce((s, r: any) => s + Number(r.amount || 0), 0);
        return total;
    },

    // Série mensal de receita (últimos 12 meses encerrando no mês atual)
    async getRevenueSeriesLast12(id: string): Promise<RevenuePoint[]> {
        const points: RevenuePoint[] = [];
        const end = new Date(); // mês corrente
        for (let i = 11; i >= 0; i--) {
            const base = subMonths(end, i);
            const from = startOfMonth(base);
            const to = endOfMonth(base);
            const { data, error } = await supabase
                .from("sales")
                .select("amount, occurred_at")
                .eq("client_id", id)
                .gte("occurred_at", format(from, "yyyy-MM-dd"))
                .lte("occurred_at", format(to, "yyyy-MM-dd"));

            if (error) throw error;
            const total = (data ?? []).reduce((s, r: any) => s + Number(r.amount || 0), 0);
            points.push({
                month: format(from, "yyyy-MM-01"),
                total,
            });
        }
        return points;
    },

    // (Opcional) Notas do cliente
    async listNotes(clientId: string) {
        const { data, error } = await supabase
            .from("client_notes")
            .select("*")
            .eq("client_id", clientId)
            .order("created_at", { ascending: false });
        if (error) throw error;
        return data || [];
    },

    async addNote(clientId: string, content: string) {
        const { error } = await supabase
            .from("client_notes")
            .insert({ client_id: clientId, content });
        if (error) throw error;
    },
};