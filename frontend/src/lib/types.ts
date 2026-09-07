/**
 * Общие типы ответов API (camelCase) — зеркало контракта docs/04-architecture.md §4.
 * Бэкенд отдаёт JSON в camelCase (маппинг из snake_case колонок D1 — на стороне backend).
 */

export type UserRole = 'client' | 'company';

export interface CurrentUser {
  id: string;
  email: string;
  role: UserRole;
  username: string;
  city: string;
  avatarUrl: string | null;
  totpEnabled: boolean;
  /** Присутствует только для role='company'. */
  company?: CompanySummary;
}

export interface CompanySummary {
  id: string;
  name: string;
  isVerified: boolean;
}

export interface Company {
  id: string;
  name: string;
  description: string;
  city: string;
  address: string;
  phone: string;
  website: string | null;
  workHours: string | null;
  videoUrl: string | null;
  coverUrl: string | null;
  avatarUrl: string | null;
  ratingAvg: number;
  reviewsCount: number;
  ordersCount: number;
  viewsCount: number;
  isVerified: boolean;
  priceFrom: number | null;
  createdAt: string;
}

export interface Service {
  id: string;
  companyId: string;
  name: string;
  price: number;
  durationMin: number | null;
  description: string;
}

export type OrderStatus = 'created' | 'in_progress' | 'done' | 'cancelled';

export interface Order {
  id: string;
  clientId: string;
  companyId: string;
  companyName: string;
  serviceId: string;
  serviceName: string;
  status: OrderStatus;
  totalPrice: number;
  createdAt: string;
  completedAt: string | null;
  hasReview: boolean;
}

export interface Review {
  id: string;
  orderId: string;
  clientId: string;
  clientUsername: string;
  companyId: string;
  rating: number;
  text: string;
  companyReply: string | null;
  createdAt: string;
}

export interface Chat {
  id: string;
  clientId: string;
  companyId: string;
  peerName: string;
  peerAvatarUrl: string | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  createdAt: string;
  isRead: boolean;
}

export interface Favorite {
  companyId: string;
  company: Company;
}

export interface Promotion {
  id: string;
  companyId: string;
  title: string;
  discountPercent: number;
  validUntil: string;
  isExpired: boolean;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface CompanyStats {
  period: 7 | 30 | 90;
  viewsCount: number;
  ordersTotal: number;
  ordersByStatus: Record<OrderStatus, number>;
  averageCheck: number;
  conversionRate: number;
  series: Array<{ date: string; views: number; orders: number }>;
}
