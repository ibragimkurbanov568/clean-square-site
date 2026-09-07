import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import { useAuth } from '../hooks/useAuth';
import { resolvePostLoginTarget } from '../lib/authRedirect';
import { useDocumentMeta } from '../hooks/useDocumentMeta';

/** `/login/2fa` — код TOTP при входе, если у аккаунта включена 2FA (F1, допущение 2). */
export default function Login2FAPage() {
  useDocumentMeta({ title: 'Код 2FA — CleanLink' });
  const { verifyTwoFactor } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const challengeId = params.get('challengeId') ?? '';

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (code.trim().length !== 6) {
      setError('Неверный код. Проверьте время на устройстве и попробуйте снова');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const user = await verifyTwoFactor(challengeId, code.trim());
      navigate(resolvePostLoginTarget(location.search, user), { replace: true });
    } catch {
      setError('Неверный код. Проверьте время на устройстве и попробуйте снова');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-[480px] flex-col justify-center px-4 py-10">
      <Card>
        <h1 className="mb-2 text-2xl font-bold text-text-primary">Введите код из приложения-аутентификатора</h1>
        <p className="mb-6 text-sm text-text-secondary">
          Откройте Google Authenticator или аналогичное приложение и введите текущий код
        </p>
        {error ? (
          <div role="alert" className="mb-4 rounded-md border border-error bg-error-bg p-3 text-sm text-error">
            {error}
          </div>
        ) : null}
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <Input
            label="Код из приложения"
            inputMode="numeric"
            maxLength={6}
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            disabled={isSubmitting}
            required
          />
          <Button type="submit" size="lg" isLoading={isSubmitting} loadingText="Проверяем код…" disabled={code.length !== 6}>
            Подтвердить
          </Button>
        </form>
        <Link to="/login" className="focus-ring mt-4 inline-block text-sm text-accent hover:underline">
          Назад ко входу
        </Link>
      </Card>
    </div>
  );
}
