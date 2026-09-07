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

interface CompanyContact {
  email: string;
  company_name: string;
  service_name: string;
}

/**
 * Реальная обработка уведомления: push (Service Worker на фронтенде слушает по API),
 * email через Resend при наличии ключа (допущение 8), запись аудит-события (допущение 11).
 */
export async function handleOrderNotification(
  message: OrderNotificationMessage,
  env: Env,
): Promise<void> {
  await logAuditEvent('order.created.notification', { ...message }, env);

  let contact: CompanyContact | null = null;
  if (env.DB) {
    contact = await env.DB.prepare(
      `SELECT u.email AS email, c.name AS company_name, s.name AS service_name
       FROM companies c
       JOIN users u ON u.id = c.user_id
       JOIN services s ON s.id = ?
       WHERE c.id = ?`,
    )
      .bind(message.serviceId, message.companyId)
      .first<CompanyContact>();
  }

  if (env.RESEND_API_KEY && contact) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'CleanLink <no-reply@cleanlink.example.com>',
          to: contact.email,
          subject: `Новый заказ: ${contact.service_name}`,
          html: `<p>У компании «${contact.company_name}» новый заказ на услугу «${contact.service_name}» (№${message.orderId}).</p><p>Откройте панель заказов, чтобы принять его в работу.</p>`,
        }),
      });
    } catch {
      // Письмо не отправилось — не роняем обработку заказа, аудит-событие уже записано выше.
    }
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
