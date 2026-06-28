export type RentFlowRole = "saas-owner" | "landlord" | "staff";

export type SupportTicketPriority = "High" | "Medium" | "Low";
export type SupportTicketStatus = "Open" | "In Progress" | "Resolved" | "Closed";

export interface SupportTicket {
  id: string;
  owner_id?: string;
  landlord_id: string;
  subject: string;
  description: string;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  note?: string;
  admin_note: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface AuditLog {
  id: string;
  admin_id: string | null;
  landlord_id: string | null;
  action: string;
  old_value: string;
  new_value: string;
  created_at: string;
}

export interface LandlordMessage {
  id: string;
  landlord_id: string;
  user_id?: string;
  ticket_id?: string;
  template?: "welcome" | "subscription" | "payment" | "support" | "maintenance" | "";
  title: string;
  message: string;
  created_at: string;
}

export interface RentFlowNotification {
  id: string;
  user_id?: string | null;
  title: string;
  message: string;
  type: "support" | "billing" | "payment" | "announcement" | "system" | "rent" | "expense" | "property" | "tenant" | "staff" | string;
  is_read: boolean;
  read?: boolean;
  created_at: string;
}

export interface SupportDashboardStats {
  totalLandlords: number;
  activeSubscriptions: number;
  monthlyRevenue: number;
  openTickets: number;
  failedPayments: number;
  unreadNotifications: number;
}

export type BackendCorrectionType = "account" | "property" | "unit" | "tenant" | "payment" | "expense" | "subscription";

export interface BackendCorrectionAction {
  id: string;
  label: string;
  field?: string;
  input: "none" | "text" | "number" | "date" | "tenant";
  fixedValue?: string | number | boolean;
  valueLabel?: string;
  placeholder?: string;
  days?: number;
}
