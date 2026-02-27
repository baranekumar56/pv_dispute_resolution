export const DATE_FORMATS = {
  DISPLAY: 'dd MMM yyyy',
  DISPLAY_WITH_TIME: 'dd MMM yyyy, HH:mm',
  ISO: "yyyy-MM-dd'T'HH:mm:ss",
  SHORT: 'dd/MM/yy',
} as const;

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  DASHBOARD: '/dashboard',
  DOCUMENTS: '/documents',
  DISPUTES: '/disputes',
} as const;

export const TICKET_STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  pending_docs: 'Pending Docs',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const TICKET_PRIORITY_LABELS: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export const ACCEPTED_DOC_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export const MAX_FILE_SIZE_MB = 10;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
