import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from '@/config/constants';
import { useIsAuthenticated } from '@/hooks';
import AuthLayout from '@/layouts/AuthLayout';
import DashboardLayout from '@/layouts/DashboardLayout';
import { LoadingScreen } from '@/components/common';

// Lazy-loaded pages
const LoginPage    = lazy(() => import('@/features/auth/components/LoginPage'));
const SignupPage   = lazy(() => import('@/features/auth/components/SignupPage'));
const DashboardPage = lazy(() => import('@/features/disputes/components/DashboardPage'));
const DocumentsPage = lazy(() => import('@/features/documents/components/DocumentsPage'));

// ─── Route Guards ─────────────────────────────────────────────────────────────
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useIsAuthenticated();
  return isAuthenticated ? <>{children}</> : <Navigate to={ROUTES.LOGIN} replace />;
};

const GuestRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useIsAuthenticated();
  return isAuthenticated ? <Navigate to={ROUTES.DASHBOARD} replace /> : <>{children}</>;
};

// ─── App Routes ───────────────────────────────────────────────────────────────
const AppRoutes = () => (
  <Suspense fallback={<LoadingScreen />}>
    <Routes>
      {/* Guest-only routes */}
      <Route element={<GuestRoute><AuthLayout /></GuestRoute>}>
        <Route path={ROUTES.LOGIN}  element={<LoginPage />} />
        <Route path={ROUTES.SIGNUP} element={<SignupPage />} />
      </Route>

      {/* Protected routes */}
      <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
        <Route path={ROUTES.DOCUMENTS} element={<DocumentsPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
    </Routes>
  </Suspense>
);

export default AppRoutes;
