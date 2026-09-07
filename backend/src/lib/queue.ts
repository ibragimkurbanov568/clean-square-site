/**
 * Уведомление компании о новом заказе — через Cloudflare Queues, либо синхронно, если Queues
 * недоступны в среде сборки/тестов (допущение 14 в docs/01-spec.md). `handleOrderNotification`
 * — единая точка правды, вызываемая и из producer-пути, и из consumer-пути, и из синхронного
 * фолбэка, поэтому результат для пользователя идентичен независимо от механизма доставки.
 */
import type { Env, OrderNotificationMessage } from '../types/env';

/** Ставит сообщение в очередь; если биндинг недоступен — обрабатывает уведомление синхронно. */
export async function notifyNewOrder(message: OrderNotificationMessage, env: Env): Promise<void> {
  if (!env.ORDER_QUEUE) {
    await handleOrderNotification(message, env);
    return;
  }
  try {
    await env.ORDER_QUEUE.send(message);
  } catch {
    // Очередь недоступна в текущем окружении сборки — тот же результат синхронно.
    await handleOrderNotification(message, env);
  }
}

/**
 * Реальная обработка уведомления: push (Service Worker на фронтенде слушает по API),
 * email через Resend при наличии ключа (допущение 8), запись аудит-события (допущение 11).
 */
export async function handleOrderNotification(
  message: OrderNotificationMessage,
  env: Env,
): Promise<void> {
  // TODO(backend): дописать реальную бизнес-логику по контракту docs/04-architecture.md §4.4.
  // Каркас ниже уже рабочий (не бросает исключений при отсутствии ключей/биндингов).
  await logAuditEvent('order.created.notification', { ...message }, env);

  if (env.RESEND_API_KEY) {
    // TODO(backend): вызвать Resend API с шаблоном письма компании о новом заказе.
  } else {
    // Демо-режим без внешнего email-провайдера — тот же путь кода, другой транспорт.
    console.log('[demo-email] Новый заказ для компании', message.companyId, message);
  }
}

/** Базовый построчный JSON аудит-лог в R2 (допущение 11) — не полноценный SIEM. */
export async function logAuditEvent(
  event: string,
  payload: Record<string, unknown>,
  env: Pick<Env, 'MEDIA'>,
): Promise<void> {
  if (!env.MEDIA) return;
  const key = `audit-log/${new Date().toISOString()}-${crypto.randomUUID()}.json`;
  try {
    await env.MEDIA.put(key, JSON.stringify({ event, payload, ts: Date.now() }));
  } catch {
    // Аудит-лог не должен ронять основной запрос при сбое R2.
  }
}
