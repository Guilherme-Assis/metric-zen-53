export interface Client {
  id: string;
  name: string;
  started_at: string;
  ended_at?: string;
  is_active?: boolean;
  created_at?: string;
}

export interface Sale {
  id: string;
  client_id: string;
  occurred_at: string;
  amount: number;
  description?: string;
  created_at?: string;
}

export interface Expense {
  id: string;
  client_id: string;
  occurred_at: string;
  amount: number;
  category?: string;
  description?: string;
  created_at?: string;
}

export interface Goal {
  id: string;
  client_id: string;
  month: string;
  goal_amount: number;
}

export interface DashboardMetrics {
  month: string;
  clients_entered: number;
  clients_left: number;
  clients_balance: number;
  entries: number;
  exits: number;
  net: number;
  avg_ticket: number;
  sales_count: number;
  goal_amount: number;
  goal_pct: number | null;
  goal_status: string;
}

export interface ExpenseByCategory {
  category: string;
  total: number;
}

export interface ClientFilters {
  search?: string;
  status?: 'all' | 'active' | 'inactive';
}