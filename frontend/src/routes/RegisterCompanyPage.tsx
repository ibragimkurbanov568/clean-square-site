import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import CitySearchInput from '../components/common/CitySearchInput';
import Input from '../components/common/Input';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { ApiError } from '../lib/apiClient';
import { resolvePostLoginTarget } from '../lib/authRedirect';
import { fieldErrors, registerCompanySchema } from '../lib/validation';
import { useDocumentMeta } from '../hooks/useDocumentMeta';

/** `/register/company` — регистрация компании (F1). */
export default function RegisterCompanyPage() {
  useDocumentMeta({ title: 'Регистрация компании — CleanLink' });
  const { registerCompany } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    email: '',
    password: '',
    companyUsername: '',
    innOgrn: '',
    city: '',
    address: '',
    phone: '',
    website: '',
    workHours: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const update = (key: keyof typeof form) => (value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBanner(null);

    const parsed = registerCompanySchema.safeParse(form);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setIsSubmitting(true);
    try {
      const user = await registerCompany({
        ...parsed.data,
        website: parsed.data.website || undefined,
        workHours: parsed.data.workHours || undefined,
      });
      showToast('Аккаунт компании создан. Профиль отправлен на модерацию', 'success');
      navigate(resolvePostLoginTarget(location.search, user), { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        const nextErrors: Record<string, string> = {};
        if (error.fields?.email || error.code === 'email_taken') nextErrors.email = 'Этот email уже зарегистрирован. Войти?';
        if (error.fields?.companyUsername || error.code === 'username_taken') {
          nextErrors.companyUsername = 'Это имя пользователя уже занято, придумайте другое';
        }
        setErrors(Object.keys(nextErrors).length ? nextErrors : { email: error.message });
      } else if (error instanceof ApiError && error.status === 400 && error.fields) {
        setErrors(error.fields);
      } else if (error instanceof ApiError) {
        setBanner(error.message);
      } else {
        setBanner('Не удалось подключиться к серверу. Проверьте интернет и попробуйте снова');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormEmpty = !form.email || !form.password || !form.companyUsername || !form.innOgrn || !form.city || !form.address || !form.phone;

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-[480px] flex-col justify-center px-4 py-10">
      <Card>
        <div className="mb-5 flex rounded-md border border-border-strong p-1 text-sm">
          <Link to="/register/client" className="flex-1 rounded py-2 text-center text-text-secondary hover:bg-surface-hover">
            Я клиент
          </Link>
          <span className="flex-1 rounded bg-accent-subtle py-2 text-center font-semibold text-accent">Я компания</span>
        </div>
        <h1 className="mb-6 text-2xl font-bold text-text-primary">Регистрация компании</h1>
        {banner ? (
          <div role="alert" className="mb-4 rounded-md border border-error bg-error-bg p-3 text-sm text-error">
            {banner}
          </div>
        ) : null}
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <Input label="Email" type="email" autoComplete="email" value={form.email} onChange={(e) => update('email')(e.target.value)} error={errors.email} disabled={isSubmitting} required />
          <Input
            label="Пароль"
            type="password"
            placeholder="Минимум 8 символов"
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => update('password')(e.target.value)}
            error={errors.password}
            disabled={isSubmitting}
            required
          />
          <Input
            label="Имя компании (username)"
            value={form.companyUsername}
            onChange={(e) => update('companyUsername')(e.target.value)}
            error={errors.companyUsername}
            disabled={isSubmitting}
            required
          />
          <Input
            label="ИНН/ОГРН"
            value={form.innOgrn}
            onChange={(e) => update('innOgrn')(e.target.value.replace(/[^\d]/g, ''))}
            error={errors.innOgrn}
            hint={!errors.innOgrn ? 'Мы проверим данные вручную — это займёт немного времени' : undefined}
            disabled={isSubmitting}
            required
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-text-secondary">
              Город<span className="text-error"> *</span>
            </label>
            <CitySearchInput initialValue={form.city} onSelectCity={update('city')} placeholder="Начните вводить город" />
            {errors.city ? <p className="text-xs text-error">{errors.city}</p> : null}
          </div>
          <Input label="Адрес" value={form.address} onChange={(e) => update('address')(e.target.value)} error={errors.address} disabled={isSubmitting} required />
          <Input label="Телефон" type="tel" value={form.phone} onChange={(e) => update('phone')(e.target.value)} error={errors.phone} disabled={isSubmitting} required />
          <Input label="Сайт (необязательно)" value={form.website} onChange={(e) => update('website')(e.target.value)} error={errors.website} disabled={isSubmitting} />
          <Input
            label="Часы работы"
            placeholder="Например: Пн–Пт 9:00–20:00"
            value={form.workHours}
            onChange={(e) => update('workHours')(e.target.value)}
            error={errors.workHours}
            disabled={isSubmitting}
          />
          <Button type="submit" size="lg" fullWidth isLoading={isSubmitting} loadingText="Создаём аккаунт…" disabled={isFormEmpty}>
            Создать аккаунт компании
          </Button>
        </form>
        <p className="mt-5 text-sm text-text-secondary">
          Уже есть аккаунт?{' '}
          <Link to="/login" className="focus-ring text-accent hover:underline">
            Войти
          </Link>
        </p>
      </Card>
    </div>
  );
}
