export interface User {
  id: number;
  name: string;
  email: string;
  low_balance_threshold: number;
  smtp_host?: string;
  smtp_port?: number;
  smtp_user?: string;
  smtp_pass?: string;
  smtp_receiver?: string;
  low_balance_notified: number; // 0 or 1
}

export interface MobilePayment {
  id: number;
  owner: string;
  phone_number: string;
  provider: string; // e.g. "Ucell", "Beeline", "Uztelecom", "Mobiuz", etc.
  amount: number; // UZS
  payment_date: number; // Day of month: 1 - 31
  payment_time: string; // HH:MM, default "12:00"
  reminder_minutes: number; // Minutes before due date to alert (e.g. 10, 20, 30)
}

export interface ElectricityLog {
  id: number;
  purchase_date: string; // YYYY-MM-DD
  purchased_kwh: number; // kWh bought, 0 if usage
  used_kwh: number; // kWh used, 0 if purchase
  remaining_kwh: number; // Running balance after this transaction
  price_paid: number; // UZS, 0 for usages
}

export interface EmailNotice {
  id: number;
  sent_at: string;
  recipient: string;
  subject: string;
  message: string;
  status: 'sent' | 'failed' | 'simulated';
}

export interface DashboardStats {
  upcoming_payments: MobilePayment[];
  electricity_remaining_kwh: number;
  estimated_days_left: number;
  avg_daily_usage_kwh: number;
  total_expenses_month: number;
  payment_history: ElectricityLog[];
}
