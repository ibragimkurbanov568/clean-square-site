/**
 * TS-зеркало схемы D1 (см. migrations/0001_init.sql). Имена полей — snake_case, совпадают
 * с именами колонок 1:1, чтобы `row as TableType` после `.first()/.all()` не требовал маппинга.
 */

export type UserRole = 'client' | 'company';

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  role: UserRole;
  username: string;
  city: string;
  avatar_url: string | null;
  totp_secret: string | null;
  totp_enabled: 0 | 1;
  password_reset_token: string | null;
  password_reset_expires: string | null;
  wallpaper_url: string | null;
  created_at: string;
}

export interface CompanyRow {
  id: string;
  user_id: string;
  name: string;
  description: string;
  inn_ogrn: string; // шифротекст
  phone: string;
  website: string | null;
  address: string;
  work_hours: string | null;
  video_url: string | null;
  cover_url: string | null;
  city: string;
  rating_avg: number;
  orders_count: number;
  response_speed_sec: number | null;
  views_count: number;
  is_verified: 0 | 1;
  created_at: string;
}

export interface ServiceRow {
  id: string;
  company_id: string;
  name: string;
  price: number;
  duration_min: number | null;
  description: string;
  created_at: string;
}

export type OrderStatus = 'created' | 'in_progress' | 'done' | 'cancelled';

export interface OrderRow {
  id: string;
  client_id: string;
  company_id: string;
  service_id: string;
  status: OrderStatus;
  total_price: number;
  created_at: string;
  completed_at: string | null;
}

export interface ReviewRow {
  id: string;
  order_id: string;
  client_id: string;
  company_id: string;
  rating: number;
  text: string;
  company_reply: string | null;
  created_at: string;
}

export interface ChatRow {
  id: string;
  client_id: string;
  company_id: string;
  last_message_at: string | null;
}

export interface MessageRow {
  id: string;
  chat_id: string;
  sender_id: string;
  text: string; // шифротекст
  created_at: string;
  is_read: 0 | 1;
}

export interface FavoriteRow {
  id: string;
  client_id: string;
  company_id: string;
  created_at: string;
}

export interface PromotionRow {
  id: string;
  company_id: string;
  title: string;
  discount_percent: number;
  valid_until: string;
  created_at: string;
}
