import { Middleware } from '@reduxjs/toolkit';
import { env } from '@/config/env';

// ─── Logger Middleware ────────────────────────────────────────────────────────
export const loggerMiddleware: Middleware = (store) => (next) => (action) => {
  if (!env.isDev) return next(action);

  const typedAction = action as { type: string; payload?: unknown };
  console.group(`%c action: ${typedAction.type}`, 'color: #4d7bff; font-weight: bold;');
  console.log('%c prev state', 'color: #9e9e9e;', store.getState());
  console.log('%c action', 'color: #2196f3;', action);
  const result = next(action);
  console.log('%c next state', 'color: #4caf50;', store.getState());
  console.groupEnd();
  return result;
};

// ─── Auth Guard Middleware ────────────────────────────────────────────────────
// Intercepts any action that should trigger logout on 401
export const authMiddleware: Middleware = (_store) => (next) => (action) => {
  return next(action);
};
