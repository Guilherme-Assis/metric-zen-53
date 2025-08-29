import { supabase } from "@/integrations/supabase/client";

export type CompanyKpis = {
    month: string
    clients_entered: number
    clients_left: number
    clients_balance: number
    entries_cash: number
    exits_churn: number
    net_mrr: number
    avg_ticket: number
    active_contracts: number
    goal_amount: number
    goal_pct: number | null
    goal_gap: number
}

export type FunnelReturn = {
    month: string
    invested: number
    entries: number
    saldo: number
    ltv_total: number
    roas: number | null
}

export const companyService = {
    async getKpis(monthISO: string) {
        const { data, error } = await supabase.rpc('get_company_kpis', { p_month: monthISO })
        if (error) throw error
        return data as CompanyKpis
    },

    async getFunnel(monthISO: string) {
        const { data, error } = await supabase.rpc('get_funnel_return', { p_month: monthISO })
        if (error) throw error
        return data as FunnelReturn
    },

    // série mensal para gráficos (se você criou a view monthly_company_metrics)
    async getMonthlySeries() {
        const { data, error } = await supabase
            .from('monthly_company_metrics')
            .select('month, clients_entered, clients_left, entries_cash, exits_churn, net_mrr, avg_ticket, goal_amount, goal_pct, goal_gap')
            .order('month', { ascending: true })
        if (error) throw error
        // parse numérico (a view retornou tudo como texto pois veio de JSONB -> text)
        return (data ?? []).map((r: any) => ({
            month: r.month,
            clients_entered: Number(r.clients_entered ?? 0),
            clients_left: Number(r.clients_left ?? 0),
            entries_cash: Number(r.entries_cash ?? 0),
            exits_churn: Number(r.exits_churn ?? 0),
            net_mrr: Number(r.net_mrr ?? 0),
            avg_ticket: Number(r.avg_ticket ?? 0),
            goal_amount: Number(r.goal_amount ?? 0),
            goal_pct: r.goal_pct != null ? Number(r.goal_pct) : null,
            goal_gap: Number(r.goal_gap ?? 0),
        }))
    }
};