import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Card from '../components/common/Card';
import { useAuth } from '../hooks/useAuth';
import { ApiError } from '../lib/apiClient';
import { guestIntentBanner, resolvePostLoginTarget, type GuestIntent } from '../lib/authRedirect';
import { fieldErrors, loginSchema } from '../lib/validation';
import { useDocumentMeta } from '../hooks/useDocumentMeta';

/** `/login` — вход (F1). */
export default function LoginPage() {
  useDocumentMeta({ title: 'Вход в CleanLink — CleanLink' });
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const params = new URLSearchParams(location.search);
  const intentParam = params.get('intent');
  const knownIntents: GuestIntent[] = ['order', 'chat', 'favorite'];
  const intentBanner = knownIntents.includes(intentParam as GuestIntent)
    ? guestIntentBanner(intentParam as GuestIntent)
    : null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBanner(null);

    const parsed = loginSchema.safeParse({ email, password, rememberMe });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setIsSubmitting(true);
    try {
      const result = await login(parsed.data);
      if (result.requiresTwoFactor) {
        navigate(`/login/2fa?challengeId=${encodeURIComponent(result.challengeId)}${location.search ? `&${location.search.slice(1)}` : ''}`);
        return;
      }
      navigate(resolvePostLoginTarget(location.search, result.user), { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.status === 429) {
        setBanner('Слишком много попыток входа. Попробуйте через минуту');
      } else if (error instanceof ApiError && error.status === 401) {
        setBanner('Неверный email или пароль');
      } else if (error instanceof ApiError) {
        setBanner(error.message);
      } else {
        setBanner('Не удалось подключиться к серверу. Проверьте интернет и попробуйте снова');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormEmpty = email.trim() === '' || password.trim() === '';

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-[480px] flex-col justify-center px-4 py-10">
      <Card>
        <h1 className="mb-6 text-2xl font-bold text-text-primary">Вход в CleanLink</h1>
        {banner || intentBanner ? (
          <div role="alert" className="mb-4 rounded-md border border-error bg-error-bg p-3 text-sm text-error">
            {banner ?? intentBanner}
          </div>
        ) : null}
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            disabled={isSubmitting}
            required
          />
          <Input
            label="Пароль"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            disabled={isSubmitting}
            required
          />
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={isSubmitting}
              className="focus-ring h-5 w-5 rounded border-border-strong"
            />
            Запомнить меня
          </label>
          <Button type="submit" size="lg" isLoading={isSubmitting} loadingText="Входим…" disabled={isFormEmpty}>
            Войти
          </Button>
        </form>
        <div className="mt-5 flex flex-col gap-2 text-sm text-text-secondary">
          <Link to="/forgot-password" className="focus-ring text-accent hover:underline">
            Забыли пароль?
          </Link>
          <span>
            Впервые здесь?{' '}
            <Link to="/register/client" className="focus-ring text-accent hover:underline">
              Зарегистрироваться
            </Link>
          </span>
        </div>
      </Card>
    </div>
  );
}
