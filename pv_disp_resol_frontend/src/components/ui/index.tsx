// ─── Button ───────────────────────────────────────────────────────────────────
import { ButtonHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary', size = 'md', isLoading, children, className, disabled, ...props
}, ref) => (
  <button
    ref={ref}
    disabled={disabled || isLoading}
    className={clsx(
      'inline-flex items-center justify-center gap-2 font-body font-medium rounded-xl transition-all duration-150',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      {
        'px-3 py-1.5 text-sm': size === 'sm',
        'px-5 py-2.5 text-sm': size === 'md',
        'px-6 py-3 text-base': size === 'lg',
      },
      {
        'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 focus-visible:ring-brand-400': variant === 'primary',
        'bg-surface-100 text-surface-800 hover:bg-surface-200 active:bg-surface-300 focus-visible:ring-surface-400': variant === 'secondary',
        'text-surface-700 hover:bg-surface-100 focus-visible:ring-surface-300': variant === 'ghost',
        'bg-red-500 text-white hover:bg-red-600 focus-visible:ring-red-400': variant === 'danger',
      },
      className
    )}
    {...props}
  >
    {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
    {children}
  </button>
));
Button.displayName = 'Button';

// ─── Input ────────────────────────────────────────────────────────────────────
import { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label, error, hint, className, id, ...props
}, ref) => {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-surface-700">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={clsx(
          'input-base',
          error && 'border-red-400 focus:ring-red-400',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="text-xs text-surface-400">{hint}</p>}
    </div>
  );
});
Input.displayName = 'Input';

// ─── Badge ────────────────────────────────────────────────────────────────────
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  className?: string;
}

export const Badge = ({ children, variant = 'default', className }: BadgeProps) => (
  <span className={clsx(
    'badge',
    {
      'bg-surface-100 text-surface-600': variant === 'default',
      'bg-green-50 text-green-700': variant === 'success',
      'bg-amber-50 text-amber-700': variant === 'warning',
      'bg-red-50 text-red-700': variant === 'danger',
      'bg-blue-50 text-blue-700': variant === 'info',
      'bg-purple-50 text-purple-700': variant === 'purple',
    },
    className
  )}>
    {children}
  </span>
);
