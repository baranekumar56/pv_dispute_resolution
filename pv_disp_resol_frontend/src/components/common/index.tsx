import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

// ─── Spinner ──────────────────────────────────────────────────────────────────
export const LoadingSpinner = ({ className }: { className?: string }) => (
  <Loader2 className={clsx('animate-spin text-brand-500', className ?? 'w-5 h-5')} />
);

// ─── Full-screen loading ──────────────────────────────────────────────────────
export const LoadingScreen = () => (
  <div className="fixed inset-0 bg-surface-50 flex items-center justify-center z-50">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center shadow-glow">
        <LoadingSpinner className="w-5 h-5 text-white" />
      </div>
      <p className="text-sm text-surface-400 font-mono">Loading...</p>
    </div>
  </div>
);

// ─── Page Header ──────────────────────────────────────────────────────────────
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const PageHeader = ({ title, subtitle, action }: PageHeaderProps) => (
  <div className="flex items-start justify-between mb-6">
    <div>
      <h1 className="text-2xl font-display font-bold text-surface-900">{title}</h1>
      {subtitle && <p className="text-sm text-surface-400 mt-1">{subtitle}</p>}
    </div>
    {action && <div className="ml-4">{action}</div>}
  </div>
);

// ─── Empty State ──────────────────────────────────────────────────────────────
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState = ({ icon, title, description, action }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    {icon && <div className="mb-4 text-surface-300">{icon}</div>}
    <h3 className="font-display font-semibold text-surface-700 mb-1">{title}</h3>
    {description && <p className="text-sm text-surface-400 max-w-xs">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export default LoadingScreen;
