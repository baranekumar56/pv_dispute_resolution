import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAuth } from '@/hooks';
import { loginUser, clearError } from '@/features/auth';
import { Button, Input } from '@/components/ui';
import { ROUTES } from '@/config/constants';

interface LoginFormValues {
  email: string;
  password: string;
}

const LoginPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>();

  const onSubmit = async (values: LoginFormValues) => {
    dispatch(clearError());
    const result = await dispatch(loginUser(values));
    if (loginUser.fulfilled.match(result)) {
      toast.success('Welcome back!');
      navigate(ROUTES.DASHBOARD);
    } else {
      const msg = (result.payload as { message?: string })?.message ?? 'Invalid credentials';
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-3xl font-bold text-surface-900">Sign in</h2>
        <p className="text-surface-400 text-sm mt-2">
          Enter your credentials to access your workspace.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <Input
          label="Email"
          type="email"
          placeholder="you@company.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email', {
            required: 'Email is required',
            pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' },
          })}
        />

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-surface-700">Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="current-password"
              className={`input-base pr-11 ${errors.password ? 'border-red-400 focus:ring-red-400' : ''}`}
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 8, message: 'Password must be at least 8 characters' },
              })}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
        </div>

        <Button
          type="submit"
          className="w-full"
          size="lg"
          isLoading={isLoading}
        >
          Sign in
          <ArrowRight size={16} />
        </Button>
      </form>

      <p className="text-center text-sm text-surface-500">
        Don't have an account?{' '}
        <Link to={ROUTES.SIGNUP} className="text-brand-600 font-medium hover:text-brand-700 transition-colors">
          Create account
        </Link>
      </p>

      {/* Demo credentials hint */}
      <div className="rounded-xl bg-brand-50 border border-brand-100 px-4 py-3">
        <p className="text-xs text-brand-600 font-mono">
          <span className="font-semibold">Dev hint:</span> Use any registered account credentials.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
