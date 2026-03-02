import { combineReducers } from '@reduxjs/toolkit';
import { authReducer } from '@/features/auth';

const rootReducer = combineReducers({
  auth: authReducer,
  // disputes: disputesReducer, — add when dispute service is ready
  // documents: documentsReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
export default rootReducer;
