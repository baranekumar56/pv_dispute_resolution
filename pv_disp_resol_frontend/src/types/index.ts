// ─── User & Auth ────────────────────────────────────────────────────────────
export interface User {
  user_id: number;
  name: string;
  email: string;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Normalized error shape produced by the axios interceptor.
// Backend returns: { detail: string, error_code: string, errors?: [...] }
export interface ApiError {
  code: string;        // maps to error_code e.g. INVALID_CREDENTIALS
  message: string;     // maps to detail
  status_code: number;
  errors?: Array<{ field: string; message: string }>; // present on 422
}

// ─── Dispute / Ticket ────────────────────────────────────────────────────────
export type TicketStatus = 'open' | 'in_progress' | 'pending_docs' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  amount: number;
  currency: string;
  merchant: string;
  assigned_to: string;
  created_at: string;
  updated_at: string;
  due_date: string;
}

// ─── Documents ───────────────────────────────────────────────────────────────
export interface UploadedDocument {
  id: string;
  filename: string;
  size: number;
  mime_type: string;
  uploaded_at: string;
  status: 'processing' | 'extracted' | 'failed';
  extracted_data?: ExtractedData;
}

export interface ExtractedData {
  invoice_number?: string;
  vendor?: string;
  total_amount?: number;
  date?: string;
  line_items?: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
  raw_text?: string;
}

// ─── Pagination ──────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}
