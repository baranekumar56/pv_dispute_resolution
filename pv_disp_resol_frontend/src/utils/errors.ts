export interface AppError {
  code: string;
  message: string;
  status_code: number;
  errors?: Array<{ field: string; message: string }>;
}

export const ERROR_CODES = {
  INVALID_CREDENTIALS:  'INVALID_CREDENTIALS',
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  TOKEN_INVALID:        'TOKEN_INVALID',
  TOKEN_NOT_FOUND:      'TOKEN_NOT_FOUND',
  TOKEN_REVOKED:        'TOKEN_REVOKED',
  TOKEN_EXPIRED:        'TOKEN_EXPIRED',
  TOKEN_TYPE_MISMATCH:  'TOKEN_TYPE_MISMATCH',
  USER_NOT_FOUND:       'USER_NOT_FOUND',
  DATABASE_ERROR:       'DATABASE_ERROR',
  VALIDATION_ERROR:     'VALIDATION_ERROR',
  INTERNAL_ERROR:       'INTERNAL_ERROR',
} as const;

const LOGIN_MESSAGES: Partial<Record<string, string>> = {
  [ERROR_CODES.INVALID_CREDENTIALS]: 'Incorrect email or password.',
  [ERROR_CODES.VALIDATION_ERROR]:    'Please check your inputs.',
  [ERROR_CODES.DATABASE_ERROR]:      'Service temporarily unavailable. Please try again.',
  [ERROR_CODES.INTERNAL_ERROR]:      'Something went wrong on our end. Please try again.',
};

const SIGNUP_MESSAGES: Partial<Record<string, string>> = {
  [ERROR_CODES.EMAIL_ALREADY_EXISTS]: 'An account with this email already exists. Try signing in instead.',
  [ERROR_CODES.VALIDATION_ERROR]:     'Please check your inputs — password must be at least 8 characters.',
  [ERROR_CODES.DATABASE_ERROR]:       'Service temporarily unavailable. Please try again.',
  [ERROR_CODES.INTERNAL_ERROR]:       'Something went wrong on our end. Please try again.',
};

const ME_MESSAGES: Partial<Record<string, string>> = {
  [ERROR_CODES.TOKEN_EXPIRED]:       'Your session has expired. Please sign in again.',
  [ERROR_CODES.TOKEN_INVALID]:       'Your session is invalid. Please sign in again.',
  [ERROR_CODES.TOKEN_REVOKED]:       'Your session was revoked. Please sign in again.',
  [ERROR_CODES.TOKEN_NOT_FOUND]:     'Session not found. Please sign in again.',
  [ERROR_CODES.TOKEN_TYPE_MISMATCH]: 'Invalid session token. Please sign in again.',
  [ERROR_CODES.USER_NOT_FOUND]:      'Your account could not be found.',
  [ERROR_CODES.DATABASE_ERROR]:      'Service temporarily unavailable. Please try again.',
  [ERROR_CODES.INTERNAL_ERROR]:      'Something went wrong on our end. Please try again.',
};

const LOGOUT_MESSAGES: Partial<Record<string, string>> = {
  [ERROR_CODES.TOKEN_EXPIRED]:  'Session already expired.',
  [ERROR_CODES.TOKEN_INVALID]:  'Session already invalid.',
  [ERROR_CODES.TOKEN_REVOKED]:  'Session already revoked.',
  [ERROR_CODES.DATABASE_ERROR]: 'Service temporarily unavailable.',
  [ERROR_CODES.INTERNAL_ERROR]: 'Something went wrong on our end.',
};

const REFRESH_MESSAGES: Partial<Record<string, string>> = {
  [ERROR_CODES.TOKEN_EXPIRED]:   'Your session has expired. Please sign in again.',
  [ERROR_CODES.TOKEN_REVOKED]:   'Your session was revoked. Please sign in again.',
  [ERROR_CODES.TOKEN_NOT_FOUND]: 'Session not found. Please sign in again.',
  [ERROR_CODES.TOKEN_INVALID]:   'Invalid session. Please sign in again.',
  [ERROR_CODES.DATABASE_ERROR]:  'Service temporarily unavailable. Please try again.',
  [ERROR_CODES.INTERNAL_ERROR]:  'Something went wrong on our end. Please try again.',
};

type ErrorContext = 'login' | 'signup' | 'me' | 'logout' | 'refresh';

const CONTEXT_MAP: Record<ErrorContext, Partial<Record<string, string>>> = {
  login:   LOGIN_MESSAGES,
  signup:  SIGNUP_MESSAGES,
  me:      ME_MESSAGES,
  logout:  LOGOUT_MESSAGES,
  refresh: REFRESH_MESSAGES,
};

export const resolveError = (error: unknown, context: ErrorContext): string => {
  const err = error as Partial<AppError>;
  const map = CONTEXT_MAP[context];

  // 1. Match on error_code (most precise)
  if (err?.code && map[err.code]) return map[err.code]!;

  // 2. For 422 surface the first field-level message
  if (err?.code === ERROR_CODES.VALIDATION_ERROR && err?.errors?.length) {
    return err.errors[0].message;
  }

  // 3. Raw backend detail as last resort
  const detail = err?.message;
  if (detail && !detail.toLowerCase().includes('unexpected') && detail !== 'Network Error') {
    return detail;
  }

  return 'Something went wrong. Please try again.';
};