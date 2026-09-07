import { useEffect, useState } from 'react';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import CitySearchInput from '../../components/common/CitySearchInput';
import CoverUploader from '../../components/common/CoverUploader';
import AvatarUploader from '../../components/common/AvatarUploader';
import ErrorState from '../../components/common/ErrorState';
import Input from '../../components/common/Input';
import Skeleton from '../../components/common/Skeleton';
import Textarea from '../../components/common/Textarea';
import { useAuth } from '../../hooks/useAuth';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { useToast } from '../../hooks/useToast';
import { apiRequest, ApiError } from '../../lib/apiClient';
import { companyProfileSchema, fieldErrors } from '../../lib/validation';
import type { Company } from '../../lib/types';

/** `/company/profile` — редактирование профиля компании (доступно и unverified, и verified). */
export default function ProfilePage() {
  useDocumentMeta({ title: 'Профиль компании — CleanLink' });
  const { user } = useAuth();
  const { showToast } = useToast();
  const companyId = user?.company?.id;

  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    city: '',
    address: '',
    phone: '',
    website: '',
    workHours: '',
    videoUrl: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const load = () => {
    if (!companyId) return;
    setIsLoading(true);
    setLoadError(null);
    apiRequest<Company>(`/companies/${companyId}`)
      .then((data) => {
        setCompany(data);
        setForm({
          name: data.name,
          description: data.description,
          city: data.city,
          address: data.address,
          phone: data.phone,
          website: data.website ?? '',
          workHours: data.workHours ?? '',
          videoUrl: data.videoUrl ?? '',
        });
      })
      .catch(() => setLoadError('Не удалось загрузить профиль'))
      .finally(() => setIsLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [companyId]);

  const update = (key: keyof typeof form) => (value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBanner(null);
    const parsed = companyProfileSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setIsSaving(true);
    try {
      const updated = await apiRequest<Company>(`/companies/${companyId}`, {
        method: 'PATCH',
        body: {
          ...parsed.data,
          website: parsed.data.website || undefined,
          workHours: parsed.data.workHours || undefined,
          videoUrl: parsed.data.videoUrl || undefined,
        },
      });
      setCompany(updated);
      showToast('Профиль обновлён', 'success');
    } catch (error) {
      if (error instanceof ApiError && error.fields) {
        setErrors(error.fields);
      }
      setBanner('Не удалось сохранить профиль. Проверьте поля и попробуйте снова');
    } finally {
      setIsSaving(false);
    }
  };

  if (!companyId) return null;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (loadError || !company) {
    return <ErrorState message={loadError ?? 'Не удалось загрузить профиль'} onRetry={load} />;
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold text-text-primary">Профиль компании</h1>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-text-primary">Медиа</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-medium text-text-secondary">Аватар</p>
            <AvatarUploader name={company.name} avatarUrl={company.avatarUrl} uploadPath="/uploads/avatar" onUploaded={load} />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-text-secondary">Обложка</p>
            <CoverUploader coverUrl={company.coverUrl} uploadPath="/uploads/cover" label="Загрузить обложку" onUploaded={load} />
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-text-primary">Основное</h2>
        {banner ? (
          <div role="alert" className="mb-4 rounded-md border border-error bg-error-bg p-3 text-sm text-error">
            {banner}
          </div>
        ) : null}
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <Input label="Название компании" value={form.name} onChange={(e) => update('name')(e.target.value)} error={errors.name} required />
          <Textarea
            label="Описание"
            placeholder="Расскажите о своей компании: опыт, сильные стороны, гарантии"
            value={form.description}
            onChange={(e) => update('description')(e.target.value)}
            error={errors.description}
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-text-secondary">Город</label>
            <CitySearchInput initialValue={form.city} onSelectCity={update('city')} />
          </div>
          <Input label="Адрес" value={form.address} onChange={(e) => update('address')(e.target.value)} error={errors.address} required />
          <Input label="Телефон" value={form.phone} onChange={(e) => update('phone')(e.target.value)} error={errors.phone} required />
          <Input label="Сайт" value={form.website} onChange={(e) => update('website')(e.target.value)} error={errors.website} />
          <Input
            label="Часы работы"
            placeholder="Например: Пн–Пт 9:00–20:00"
            value={form.workHours}
            onChange={(e) => update('workHours')(e.target.value)}
            error={errors.workHours}
          />
          <Input
            label="Ссылка на видео (необязательно)"
            value={form.videoUrl}
            onChange={(e) => update('videoUrl')(e.target.value)}
            error={errors.videoUrl}
          />
          <Button type="submit" isLoading={isSaving} loadingText="Сохраняем…" className="w-fit">
            Сохранить изменения
          </Button>
        </form>
      </Card>
    </div>
  );
}
