import { supabase } from "@/integrations/supabase/client";
import type {
  Client,
  Sale,
  Expense,
  Goal,
  DashboardMetrics,
  ExpenseByCategory,
  ClientFilters
} from "@/types/dashboard";
import { format, startOfMonth, endOfMonth } from "date-fns";

/** util pra garantir yyyy-MM-dd */
const toISODate = (d: Date | string) => {
  const dt = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return null;
  return format(dt, "yyyy-MM-dd");
};

export const clientsService = {
  async listClients(filters: ClientFilters = {}): Promise<Client[]> {
    let query = supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

    if (filters.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }

    if (filters.status === 'active') {
      query = query.eq('is_active', true);
    } else if (filters.status === 'inactive') {
      query = query.eq('is_active', false);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getClient(id: string): Promise<Client | null> {
    const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .maybeSingle();

    if (error) throw error;
    return data;
  },

  /** <<< NOVO: cria cliente >>> */
  async createClient(payload: { name: string; started_at: string | null; ended_at: string | null }): Promise<Client> {
    // normaliza datas pro formato yyyy-MM-dd
    const started = payload.started_at ? toISODate(payload.started_at) : null;
    const ended   = payload.ended_at ? toISODate(payload.ended_at) : null;

    const { data, error } = await supabase
        .from('clients')
        .insert({
          name: payload.name.trim(),
          started_at: started,
          ended_at: ended, // is_active é coluna gerada no banco — NÃO enviar aqui
        })
        .select('*')
        .single();

    if (error) throw error;
    return data as Client;
  },
};

export const dashboardService = {
  async getDashboardMetrics(clientId: string, monthISO: string): Promise<DashboardMetrics> {
    const { data, error } = await supabase
        .rpc('get_dashboard_metrics', {
          p_client_id: clientId,
          p_month: monthISO
        });

    if (error) throw error;
    return data as unknown as DashboardMetrics;
  },

  async getSalesByMonth(clientId: string, monthISO: string): Promise<Sale[]> {
    const monthStart = startOfMonth(new Date(monthISO));
    const monthEnd = endOfMonth(new Date(monthISO));

    const { data, error } = await supabase
        .from('sales')
        .select('*')
        .eq('client_id', clientId)
        .gte('occurred_at', format(monthStart, 'yyyy-MM-dd'))
        .lte('occurred_at', format(monthEnd, 'yyyy-MM-dd'))
        .order('occurred_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getExpensesByMonth(clientId: string, monthISO: string): Promise<Expense[]> {
    const monthStart = startOfMonth(new Date(monthISO));
    const monthEnd = endOfMonth(new Date(monthISO));

    const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('client_id', clientId)
        .gte('occurred_at', format(monthStart, 'yyyy-MM-dd'))
        .lte('occurred_at', format(monthEnd, 'yyyy-MM-dd'))
        .order('occurred_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getExpensesByCategory(clientId: string, monthISO: string): Promise<ExpenseByCategory[]> {
    const monthStart = startOfMonth(new Date(monthISO));
    const monthEnd = endOfMonth(new Date(monthISO));

    const { data, error } = await supabase
        .from('expenses')
        .select('category, amount')
        .eq('client_id', clientId)
        .gte('occurred_at', format(monthStart, 'yyyy-MM-dd'))
        .lte('occurred_at', format(monthEnd, 'yyyy-MM-dd'))
        .not('category', 'is', null);

    if (error) throw error;

    // Group by category e soma
    const grouped = (data || []).reduce((acc, expense) => {
      const category = (expense as any).category || 'Outros';
      acc[category] = (acc[category] || 0) + Number((expense as any).amount);
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped).map(([category, total]) => ({
      category,
      total
    }));
  },

  async getGoalForMonth(clientId: string, monthISO: string): Promise<Goal | null> {
    const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('client_id', clientId)
        .eq('month', monthISO)
        .maybeSingle();

    if (error) throw error;
    return data;
  },

  /* opcional — prontos pro formulário de input de dados */

  async createSale(input: { client_id: string; amount: number; occurred_at: string }) {
    const { data, error } = await supabase
        .from('sales')
        .insert({
          client_id: input.client_id,
          amount: Number(input.amount),
          occurred_at: toISODate(input.occurred_at),
        })
        .select('*')
        .single();
    if (error) throw error;
    return data as Sale;
  },

  async createExpense(input: { client_id: string; amount: number; occurred_at: string; category?: string | null }) {
    const { data, error } = await supabase
        .from('expenses')
        .insert({
          client_id: input.client_id,
          amount: Number(input.amount),
          occurred_at: toISODate(input.occurred_at),
          category: input.category ?? null,
        })
        .select('*')
        .single();
    if (error) throw error;
    return data as Expense;
  },

  async upsertGoal(input: { client_id: string; month: string; amount: number }) {
    // month deve ser 'yyyy-MM-01'
    const { data, error } = await supabase
        .from('goals')
        .upsert({
          client_id: input.client_id,
          month: input.month,
          amount: Number(input.amount),
        }, { onConflict: 'client_id,month' })
        .select('*')
        .single();
    if (error) throw error;
    return data as Goal;
  },
};