import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, Users, UserCheck, UserX } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { clientsService } from '@/services/supabase';
import { formatDate } from '@/utils/formatters';
import type { ClientFilters } from '@/types/dashboard';

export default function ClientsPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<ClientFilters>({
    search: '',
    status: 'all'
  });

  const { data: clients = [], isLoading, error } = useQuery({
    queryKey: ['clients', filters],
    queryFn: () => clientsService.listClients(filters)
  });

  const handleClientClick = (clientId: string) => {
    navigate(`/clients/${clientId}`);
  };

  const activeCount = clients.filter(c => c.is_active).length;
  const inactiveCount = clients.filter(c => !c.is_active).length;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Dashboard de Clientes
          </h1>
          <p className="text-foreground-muted">
            Gerencie e monitore todos os seus clientes
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="metric-card">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 text-primary rounded-xl">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="metric-label">Total de Clientes</p>
                <p className="metric-value">{clients.length}</p>
              </div>
            </div>
          </div>
          
          <div className="metric-card">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-success/10 text-success rounded-xl">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="metric-label">Clientes Ativos</p>
                <p className="metric-value">{activeCount}</p>
              </div>
            </div>
          </div>
          
          <div className="metric-card">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-destructive/10 text-destructive rounded-xl">
                <UserX className="w-6 h-6" />
              </div>
              <div>
                <p className="metric-label">Clientes Inativos</p>
                <p className="metric-value">{inactiveCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card-glass p-6 rounded-xl mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground-muted w-4 h-4" />
              <Input
                placeholder="Buscar por nome do cliente..."
                value={filters.search || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                variant={filters.status === 'all' ? 'default' : 'outline'}
                onClick={() => setFilters(prev => ({ ...prev, status: 'all' }))}
                size="sm"
              >
                Todos
              </Button>
              <Button
                variant={filters.status === 'active' ? 'default' : 'outline'}
                onClick={() => setFilters(prev => ({ ...prev, status: 'active' }))}
                size="sm"
              >
                Ativos
              </Button>
              <Button
                variant={filters.status === 'inactive' ? 'default' : 'outline'}
                onClick={() => setFilters(prev => ({ ...prev, status: 'inactive' }))}
                size="sm"
              >
                Inativos
              </Button>
            </div>
          </div>
        </div>

        {/* Clients Grid */}
        <div className="card-glass rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-destructive">Erro ao carregar clientes</p>
            </div>
          ) : clients.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-12 h-12 text-foreground-muted mx-auto mb-4" />
              <p className="text-foreground-muted">Nenhum cliente encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border">
                  <tr>
                    <th className="text-left p-4 font-medium text-foreground-muted">Cliente</th>
                    <th className="text-left p-4 font-medium text-foreground-muted">Status</th>
                    <th className="text-left p-4 font-medium text-foreground-muted">Data de Início</th>
                    <th className="text-left p-4 font-medium text-foreground-muted">Data de Fim</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => (
                    <tr 
                      key={client.id}
                      className="border-b border-border hover:bg-card-hover transition-colors cursor-pointer"
                      onClick={() => handleClientClick(client.id)}
                    >
                      <td className="p-4">
                        <div className="font-medium text-foreground">{client.name}</div>
                      </td>
                      <td className="p-4">
                        <StatusBadge status={client.is_active || false} />
                      </td>
                      <td className="p-4 text-foreground-muted">
                        {formatDate(client.started_at)}
                      </td>
                      <td className="p-4 text-foreground-muted">
                        {client.ended_at ? formatDate(client.ended_at) : '-'}
                      </td>
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