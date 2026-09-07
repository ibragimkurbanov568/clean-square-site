import Card from '../common/Card';
import Toggle from '../common/Toggle';
import { useNotificationPreferences } from '../../hooks/useNotificationPreferences';

export function NotificationSettingsCard() {
  const { prefs, setPushEnabled, setEmailEnabled } = useNotificationPreferences();

  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold text-text-primary">Уведомления</h2>
      <div className="flex flex-col divide-y divide-border">
        <Toggle label="Push-уведомления в браузере" checked={prefs.pushEnabled} onChange={(v) => void setPushEnabled(v)} />
        <Toggle
          label="Email о новых сообщениях и статусах заказов"
          checked={prefs.emailEnabled}
          onChange={setEmailEnabled}
        />
      </div>
    </Card>
  );
}

export default NotificationSettingsCard;
