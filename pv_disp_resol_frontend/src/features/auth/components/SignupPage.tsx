import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, ArrowRight, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAuth } from '@/hooks';
import { signupUser, clearError } from '@/features/auth';
import { Button, Input } from '@/components/ui';
import { ROUTES } from '@/config/constants';

interface SignupFormValues {
  name: string;
  email: string;
  password: string;
  confirm_password: string;
}

const PasswordStrength = ({ password }: { password: string }) => {
  const checks = [
    { label: '8+ characters', pass: password.length >= 8 },
    { label: 'Uppercase letter', pass: /[A-Z]/.test(password) },
    { label: 'Number', pass: /\d/.test(password) },
  ];
  return (
    <div className="flex gap-3 mt-2">
      {checks.map((c) => (
        <div key={c.label} className="flex items-center gap-1">
          <Check size={11} className={c.pass ? 'text-green-500' : 'text-surface-300'} />
          <span className={`text-[11px] ${c.pass ? 'text-green-600' : 'text-surface-400'}`}>{c.label}</span>
        </div>
      ))}
    </div>
  );
};

const SignupPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupFormValues>();

  const password = watch('password', '');

  const onSubmit = async (values: SignupFormValues) => {
    dispatch(clearError());
    const result = await dispatch(signupUser(values));
    if (signupUser.fulfilled.match(result)) {
      toast.success('Account created! Welcome aboard.');
      navigate(ROUTES.DASHBOARD);
    } else {
      const msg = (result.payload as { message?: string })?.message ?? 'Registration failed';
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-7">
      <div>
        <h2 className="font-display text-3xl font-bold text-surface-900">Create account</h2>
        <p className="text-surface-400 text-sm mt-2">
          Join PaisaVasool to start resolving disputes efficiently.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label="Full Name"
          type="text"
          placeholder="Jane Doe"
          autoComplete="name"
          error={errors.name?.message}
          {...register('name', {
            required: 'Name is required',
            minLength: { value: 2, message: 'Name must be at least 2 characters' },
            maxLength: { value: 100, message: 'Name is too long' },
          })}
        />

        <Input
          label="Work Email"
          type="email"
          placeholder="jane@company.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email', {
            required: 'Email is required',
            pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' },
          })}
        />

        {/* Password */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-surface-700">Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Min. 8 characters"
              autoComplete="new-password"
              className={`input-base pr-11 ${errors.password ? 'border-red-400 focus:ring-red-400' : ''}`}
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 8, message: 'Minimum 8 characters' },
                maxLength: { value: 128, message: 'Password is too long' },
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
          {password && <PasswordStrength password={password} />}
        </div>

        {/* Confirm password */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-surface-700">Confirm Password</label>
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              placeholder="Repeat your password"
              autoComplete="new-password"
              className={`input-base pr-11 ${errors.confirm_password ? 'border-red-400 focus:ring-red-400' : ''}`}
              {...register('confirm_password', {
                required: 'Please confirm your password',
                validate: (val) => val === password || 'Passwords do not match',
              })}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
              onClick={() => setShowConfirm(!showConfirm)}
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.confirm_password && (
            <p className="text-xs text-red-500">{errors.confirm_password.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full mt-2" size="lg" isLoading={isLoading}>
          Create Account
          <ArrowRight size={16} />
        </Button>
      </form>

      <p className="text-center text-sm text-surface-500">
        Already have an account?{' '}
        <Link to={ROUTES.LOGIN} className="text-brand-600 font-medium hover:text-brand-700 transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  );
};

export default SignupPage;
