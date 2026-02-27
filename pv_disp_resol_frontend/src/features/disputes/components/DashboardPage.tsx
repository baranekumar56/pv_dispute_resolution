import { useState, useMemo } from 'react';
import { Search, Filter, TrendingUp, Clock, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { useUser } from '@/hooks';
import { Badge } from '@/components/ui';
import { PageHeader, EmptyState } from '@/components/common';
import { MOCK_TICKETS } from '../services/mockData';
import { Ticket, TicketStatus, TicketPriority } from '@/types';
import { formatDate, formatCurrency } from '@/utils';
import { TICKET_STATUS_LABELS, TICKET_PRIORITY_LABELS } from '@/config/constants';

// ─── Priority + Status badge helpers ─────────────────────────────────────────
const statusVariant = (s: TicketStatus) => ({
  open:         'info',
  in_progress:  'warning',
  pending_docs: 'purple',
  resolved:     'success',
  closed:       'default',
} as const)[s] ?? 'default';

const priorityVariant = (p: TicketPriority) => ({
  low:      'default',
  medium:   'info',
  high:     'warning',
  critical: 'danger',
} as const)[p] ?? 'default';

// ─── Stat card ────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string;
}) => (
  <div className="card p-5 flex items-start gap-4 animate-fade-in">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
      <Icon size={18} className="text-white" />
    </div>
    <div>
      <p className="text-xs text-surface-400 font-medium uppercase tracking-wide">{label}</p>
      <p className="font-display text-2xl font-bold text-surface-900 leading-none mt-1">{value}</p>
      {sub && <p className="text-xs text-surface-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

// ─── Ticket row ───────────────────────────────────────────────────────────────
const TicketRow = ({ ticket }: { ticket: Ticket }) => (
  <tr className="group hover:bg-surface-50 transition-colors duration-100 cursor-pointer">
    <td className="px-5 py-3.5">
      <span className="font-mono text-xs text-surface-400">{ticket.id}</span>
    </td>
    <td className="px-5 py-3.5 max-w-xs">
      <p className="text-sm font-medium text-surface-900 truncate">{ticket.title}</p>
      <p className="text-xs text-surface-400 truncate mt-0.5">{ticket.merchant}</p>
    </td>
    <td className="px-5 py-3.5">
      <Badge variant={statusVariant(ticket.status)}>
        {TICKET_STATUS_LABELS[ticket.status]}
      </Badge>
    </td>
    <td className="px-5 py-3.5">
      <Badge variant={priorityVariant(ticket.priority)}>
        {TICKET_PRIORITY_LABELS[ticket.priority]}
      </Badge>
    </td>
    <td className="px-5 py-3.5 text-sm font-medium text-surface-800">
      {formatCurrency(ticket.amount)}
    </td>
    <td className="px-5 py-3.5 text-sm text-surface-400">
      {formatDate(ticket.due_date)}
    </td>
  </tr>
);

// ─── Dashboard Page ───────────────────────────────────────────────────────────
const DashboardPage = () => {
  const user = useUser();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const tickets = MOCK_TICKETS;

  const stats = useMemo(() => ({
    total:       tickets.length,
    open:        tickets.filter((t) => t.status === 'open').length,
    inProgress:  tickets.filter((t) => t.status === 'in_progress').length,
    resolved:    tickets.filter((t) => t.status === 'resolved').length,
    totalValue:  tickets.reduce((acc, t) => acc + t.amount, 0),
  }), [tickets]);

  const filtered = useMemo(() => tickets.filter((t) => {
    const matchSearch = !search ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase()) ||
      t.merchant.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchSearch && matchStatus;
  }), [tickets, search, statusFilter]);

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <PageHeader
        title={`Welcome back, ${user?.name?.split(' ')[0] ?? 'Associate'} 👋`}
        subtitle="Here's a summary of your assigned dispute tickets."
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={FileText}      label="Total Tickets"  value={stats.total}       color="bg-brand-500" />
        <StatCard icon={AlertCircle}   label="Open"           value={stats.open}         color="bg-red-500" sub="Needs attention" />
        <StatCard icon={Clock}         label="In Progress"    value={stats.inProgress}   color="bg-amber-500" />
        <StatCard icon={CheckCircle2}  label="Resolved"       value={stats.resolved}     color="bg-green-500" />
      </div>

      {/* Total value banner */}
      <div className="card px-5 py-4 mb-6 flex items-center gap-3 bg-gradient-to-r from-brand-600 to-brand-700 border-0">
        <TrendingUp size={18} className="text-brand-200" />
        <span className="text-sm text-brand-100">Total dispute value under management:</span>
        <span className="font-display font-bold text-white text-lg">
          {formatCurrency(stats.totalValue)}
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-300" />
          <input
            className="input-base pl-9 py-2 text-sm"
            placeholder="Search tickets, merchants…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-surface-400" />
          <select
            className="input-base py-2 text-sm w-auto pr-8"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            {Object.entries(TICKET_STATUS_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
        <span className="text-xs text-surface-400 ml-auto">
          {filtered.length} of {tickets.length} tickets
        </span>
      </div>

      {/* Tickets table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100">
                {['Ticket ID', 'Title / Merchant', 'Status', 'Priority', 'Amount', 'Due Date'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {filtered.length > 0 ? (
                filtered.map((t) => <TicketRow key={t.id} ticket={t} />)
              ) : (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      title="No tickets found"
                      description="Try adjusting your search or filters."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
