import { createContext, useContext, useEffect, useRef, ReactNode } from 'react';
import { useAppDispatch, useIsAuthenticated } from '@/hooks';
import { fetchCurrentUser } from '@/features/auth';

interface AuthContextValue {
  isBootstrapping: boolean;
}

const AuthContext = createContext<AuthContextValue>({ isBootstrapping: true });

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const dispatch = useAppDispatch();
  const isAuthenticated = useIsAuthenticated();
  const bootstrapped = useRef(false);
  const isBootstrapping = !bootstrapped.current && !isAuthenticated;

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    // Try to hydrate user from existing cookies on app load
    dispatch(fetchCurrentUser());
  }, [dispatch]);

  return (
    <AuthContext.Provider value={{ isBootstrapping }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => useContext(AuthContext);
