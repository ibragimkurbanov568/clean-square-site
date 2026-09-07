import Card from '../../components/common/Card';
import AvatarUploader from '../../components/common/AvatarUploader';
import NotificationSettingsCard from '../../components/settings/NotificationSettingsCard';
import SecuritySection from '../../components/settings/TwoFactorSection';
import ThemeSettingsCard from '../../components/settings/ThemeSettingsCard';
import WallpaperGallery from '../../components/settings/WallpaperGallery';
import { useAuth } from '../../hooks/useAuth';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';

/** `/company/settings` — аватар/обложка/обои, 2FA, уведомления, тема (доступно всем компаниям). */
export default function SettingsPage() {
  useDocumentMeta({ title: 'Настройки — CleanLink' });
  const { user, updateLocalUser } = useAuth();

  if (!user) return null;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold text-text-primary">Настройки</h1>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-text-primary">Аватар</h2>
        <AvatarUploader
          name={user.username}
          avatarUrl={user.avatarUrl}
          uploadPath="/uploads/avatar"
          onUploaded={(url) => updateLocalUser({ avatarUrl: url })}
        />
      </Card>

      <WallpaperGallery userId={user.id} />
      <SecuritySection />
      <NotificationSettingsCard />
      <ThemeSettingsCard />
    </div>
  );
}
