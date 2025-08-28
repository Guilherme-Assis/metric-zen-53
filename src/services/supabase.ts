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
  }
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

    // Group by category and sum amounts
    const grouped = (data || []).reduce((acc, expense) => {
      const category = expense.category || 'Outros';
      acc[category] = (acc[category] || 0) + Number(expense.amount);
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
  }
};