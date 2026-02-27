import { configureStore } from '@reduxjs/toolkit';
import rootReducer from './rootReducer';
import { loggerMiddleware, authMiddleware } from './middleware';

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(authMiddleware, loggerMiddleware),
  devTools: import.meta.env.DEV,
});

export type AppDispatch = typeof store.dispatch;
export type AppStore = typeof store;
