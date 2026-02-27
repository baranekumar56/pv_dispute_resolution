import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/app/store';
import type { RootState } from '@/app/rootReducer';

// Typed versions of standard Redux hooks
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Auth selectors
export const useAuth = () => useAppSelector((state) => state.auth);
export const useUser = () => useAppSelector((state) => state.auth.user);
export const useIsAuthenticated = () => useAppSelector((state) => state.auth.isAuthenticated);
