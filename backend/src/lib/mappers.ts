/**
 * Маппинг строк D1 (snake_case) в JSON-контракт API (camelCase) — см.
 * docs/04-architecture.md §4 "бэкенд обязан отдавать JSON именно в этой форме". Держим маппинг
 * в одном месте, чтобы все route-модули отдавали одинаковую форму объекта.
 */
import type {
  CompanyRow,
  ServiceRow,
  OrderRow,
  ReviewRow,
  PromotionRow,
  MessageRow,
  UserRow,
} from '../db/schema';

// --- companies --------------------------------------------------------------------------------

export interface CompanyRowExtra extends CompanyRow {
  avatar_url: string | null;
  reviews_count: number;
  price_from: number | null;
}

export interface CompanyDto {
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

/** `priceFrom` скрывается для неверифицированных компаний — цены/услуги не показываются (F4). */
export function mapCompany(row: CompanyRowExtra): CompanyDto {
  const isVerified = row.is_verified === 1;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    city: row.city,
    address: row.address,
    phone: row.phone,
    website: row.website,
    workHours: row.work_hours,
    videoUrl: row.video_url,
    coverUrl: row.cover_url,
    avatarUrl: row.avatar_url,
    ratingAvg: row.rating_avg,
    reviewsCount: row.reviews_count,
    ordersCount: row.orders_count,
    viewsCount: row.views_count,
    isVerified,
    priceFrom: isVerified ? row.price_from : null,
    createdAt: row.created_at,
  };
}

// --- services -----------------------------------------------------------------------------------

export interface ServiceDto {
  id: string;
  companyId: string;
  name: string;
  price: number;
  durationMin: number | null;
  description: string;
}

export function mapService(row: ServiceRow): ServiceDto {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    price: row.price,
    durationMin: row.duration_min,
    description: row.description,
  };
}

// --- orders -------------------------------------------------------------------------------------

export interface OrderRowExtra extends OrderRow {
  company_name: string;
  service_name: string;
  has_review: 0 | 1;
}

export interface OrderDto {
  id: string;
  clientId: string;
  companyId: string;
  companyName: string;
  serviceId: string;
  serviceName: string;
  status: OrderRow['status'];
  totalPrice: number;
  createdAt: string;
  completedAt: string | null;
  hasReview: boolean;
}

export function mapOrder(row: OrderRowExtra): OrderDto {
  return {
    id: row.id,
    clientId: row.client_id,
    companyId: row.company_id,
    companyName: row.company_name,
    serviceId: row.service_id,
    serviceName: row.service_name,
    status: row.status,
    totalPrice: row.total_price,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    hasReview: row.has_review === 1,
  };
}

// --- reviews ------------------------------------------------------------------------------------

export interface ReviewRowExtra extends ReviewRow {
  client_username: string;
}

export interface ReviewDto {
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

export function mapReview(row: ReviewRowExtra): ReviewDto {
  return {
    id: row.id,
    orderId: row.order_id,
    clientId: row.client_id,
    clientUsername: row.client_username,
    companyId: row.company_id,
    rating: row.rating,
    text: row.text,
    companyReply: row.company_reply,
    createdAt: row.created_at,
  };
}

// --- promotions ---------------------------------------------------------------------------------

export interface PromotionDto {
  id: string;
  companyId: string;
  title: string;
  discountPercent: number;
  validUntil: string;
  isExpired: boolean;
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function mapPromotion(row: PromotionRow): PromotionDto {
  return {
    id: row.id,
    companyId: row.company_id,
    title: row.title,
    discountPercent: row.discount_percent,
    validUntil: row.valid_until,
    isExpired: row.valid_until < todayIsoDate(),
  };
}

// --- messages -----------------------------------------------------------------------------------

export interface MessageDto {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  createdAt: string;
  isRead: boolean;
}

/** `text` уже расшифрован вызывающей стороной (decryptField) перед вызовом маппера. */
export function mapMessage(row: MessageRow, decryptedText: string): MessageDto {
  return {
    id: row.id,
    chatId: row.chat_id,
    senderId: row.sender_id,
    text: decryptedText,
    createdAt: row.created_at,
    isRead: row.is_read === 1,
  };
}

// --- chats --------------------------------------------------------------------------------------

export interface ChatDto {
  id: string;
  clientId: string;
  companyId: string;
  peerName: string;
  peerAvatarUrl: string | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
}

// --- auth / current user --------------------------------------------------------------------------

export interface CompanySummaryDto {
  id: string;
  name: string;
  isVerified: boolean;
}

export interface CurrentUserDto {
  id: string;
  email: string;
  role: UserRow['role'];
  username: string;
  city: string;
  avatarUrl: string | null;
  totpEnabled: boolean;
  company?: CompanySummaryDto;
}

export function mapCurrentUser(
  user: UserRow,
  company?: { id: string; name: string; is_verified: 0 | 1 } | null,
): CurrentUserDto {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    username: user.username,
    city: user.city,
    avatarUrl: user.avatar_url,
    totpEnabled: user.totp_enabled === 1,
    ...(company
      ? { company: { id: company.id, name: company.name, isVerified: company.is_verified === 1 } }
      : {}),
  };
}
