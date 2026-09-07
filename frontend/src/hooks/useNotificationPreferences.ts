import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'cleanlink-notification-prefs';

export interface NotificationPreferences {
  pushEnabled: boolean;
  emailEnabled: boolean;
}

function readPrefs(): NotificationPreferences {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { pushEnabled: false, emailEnabled: true };
    return { pushEnabled: false, emailEnabled: true, ...JSON.parse(raw) };
  } catch {
    return { pushEnabled: false, emailEnabled: true };
  }
}

/**
 * Настройки уведомлений (допущение 7 ТЗ — Push через Service Worker без внешнего push-сервера).
 * Хранятся локально в браузере; включение push реально запрашивает разрешение
 * `Notification.requestPermission()`.
 */
export function useNotificationPreferences() {
  const [prefs, setPrefs] = useState<NotificationPreferences>(() => readPrefs());

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  }, [prefs]);

  const setPushEnabled = useCallback(async (enabled: boolean) => {
    if (enabled && typeof Notification !== 'undefined') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setPrefs((prev) => ({ ...prev, pushEnabled: false }));
        return false;
      }
    }
    setPrefs((prev) => ({ ...prev, pushEnabled: enabled }));
    return true;
  }, []);

  const setEmailEnabled = useCallback((enabled: boolean) => {
    setPrefs((prev) => ({ ...prev, emailEnabled: enabled }));
  }, []);

  return { prefs, setPushEnabled, setEmailEnabled };
}
