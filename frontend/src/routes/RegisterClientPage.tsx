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
import { fieldErrors, registerClientSchema } from '../lib/validation';
import { useDocumentMeta } from '../hooks/useDocumentMeta';

/** `/register/client` — регистрация клиента (F1). */
export default function RegisterClientPage() {
  useDocumentMeta({ title: 'Регистрация клиента — CleanLink' });
  const { registerClient } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [city, setCity] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBanner(null);

    const parsed = registerClientSchema.safeParse({ email, password, username, city });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setIsSubmitting(true);
    try {
      const user = await registerClient(parsed.data);
      showToast(`Добро пожаловать, ${user.username}!`, 'success');
      navigate(resolvePostLoginTarget(location.search, user), { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        const nextErrors: Record<string, string> = {};
        if (error.fields?.email || error.code === 'email_taken') {
          nextErrors.email = 'Этот email уже зарегистрирован. Войти?';
        }
        if (error.fields?.username || error.code === 'username_taken') {
          nextErrors.username = 'Это имя пользователя уже занято, придумайте другое';
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

  const isFormEmpty = !email.trim() || !password.trim() || !username.trim() || !city.trim();

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-[480px] flex-col justify-center px-4 py-10">
      <Card>
        <div className="mb-5 flex rounded-md border border-border-strong p-1 text-sm">
          <span className="flex-1 rounded bg-accent-subtle py-2 text-center font-semibold text-accent">Я клиент</span>
          <Link to="/register/company" className="flex-1 rounded py-2 text-center text-text-secondary hover:bg-surface-hover">
            Я компания
          </Link>
        </div>
        <h1 className="mb-6 text-2xl font-bold text-text-primary">Регистрация клиента</h1>
        {banner ? (
          <div role="alert" className="mb-4 rounded-md border border-error bg-error-bg p-3 text-sm text-error">
            {banner}
          </div>
        ) : null}
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <Input label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} disabled={isSubmitting} required />
          {errors.email ? (
            <Link to="/login" className="-mt-3 text-xs text-accent hover:underline">
              Войти
            </Link>
          ) : null}
          <Input
            label="Пароль"
            type="password"
            placeholder="Минимум 8 символов"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            disabled={isSubmitting}
            required
          />
          <Input label="Имя пользователя" value={username} onChange={(e) => setUsername(e.target.value)} error={errors.username} disabled={isSubmitting} required />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-text-secondary">
              Город<span className="text-error"> *</span>
            </label>
            <CitySearchInput initialValue={city} onSelectCity={setCity} placeholder="Начните вводить город" />
            {errors.city ? <p className="text-xs text-error">{errors.city}</p> : null}
          </div>
          <Button type="submit" size="lg" fullWidth isLoading={isSubmitting} loadingText="Создаём аккаунт…" disabled={isFormEmpty}>
            Создать аккаунт
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
