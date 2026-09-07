import Card from '../../components/common/Card';
import AvatarUploader from '../../components/common/AvatarUploader';
import NotificationSettingsCard from '../../components/settings/NotificationSettingsCard';
import SecuritySection from '../../components/settings/TwoFactorSection';
import ThemeSettingsCard from '../../components/settings/ThemeSettingsCard';
import { useAuth } from '../../hooks/useAuth';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';

/** `/account/settings` — профиль, аватар, 2FA, уведомления, тема. */
export default function SettingsPage() {
  useDocumentMeta({ title: 'Настройки — CleanLink' });
  const { user, updateLocalUser } = useAuth();

  if (!user) return null;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold text-text-primary">Настройки</h1>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-text-primary">Профиль</h2>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Имя пользователя</dt>
            <dd className="text-sm text-text-primary">{user.username}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Город</dt>
            <dd className="text-sm text-text-primary">{user.city}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Email</dt>
            <dd className="text-sm text-text-primary">{user.email}</dd>
          </div>
        </dl>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-text-primary">Аватар</h2>
        <AvatarUploader
          name={user.username}
          avatarUrl={user.avatarUrl}
          uploadPath="/uploads/avatar"
          onUploaded={(url) => updateLocalUser({ avatarUrl: url })}
        />
      </Card>

      <SecuritySection />
      <NotificationSettingsCard />
      <ThemeSettingsCard />
    </div>
  );
}
