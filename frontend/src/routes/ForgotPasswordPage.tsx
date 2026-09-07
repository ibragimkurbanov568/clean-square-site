import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import { useAuth } from '../hooks/useAuth';
import { fieldErrors, forgotPasswordSchema } from '../lib/validation';
import { useDocumentMeta } from '../hooks/useDocumentMeta';

/** `/forgot-password` — запрос восстановления пароля (допущение 3). */
export default function ForgotPasswordPage() {
  useDocumentMeta({ title: 'Восстановление пароля — CleanLink' });
  const { forgotPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const [banner, setBanner] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ demoResetUrl?: string } | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBanner(null);
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setError(fieldErrors(parsed.error).email);
      return;
    }
    setError(undefined);
    setIsSubmitting(true);
    try {
      const response = await forgotPassword(parsed.data.email);
      setResult(response);
    } catch {
      setBanner('Не удалось отправить письмо. Попробуйте ещё раз позже');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-[480px] flex-col justify-center px-4 py-10">
      <Card>
        <h1 className="mb-6 text-2xl font-bold text-text-primary">Восстановление пароля</h1>

        {result ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-text-primary">
              Если аккаунт с таким email существует, мы отправили на него ссылку для восстановления пароля
            </p>
            {result.demoResetUrl ? (
              <div className="rounded-md border border-border bg-surface-hover p-4">
                <p className="mb-2 text-sm font-medium text-text-primary">Демо-режим: ссылка для восстановления</p>
                <Button variant="secondary" size="sm" onClick={() => window.location.assign(result.demoResetUrl as string)}>
                  Открыть ссылку
                </Button>
              </div>
            ) : null}
            <Link to="/login" className="focus-ring text-sm text-accent hover:underline">
              Вернуться ко входу
            </Link>
          </div>
        ) : (
          <>
            {banner ? (
              <div role="alert" className="mb-4 rounded-md border border-error bg-error-bg p-3 text-sm text-error">
                {banner}
              </div>
            ) : null}
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
              <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={error} disabled={isSubmitting} required />
              <Button type="submit" size="lg" fullWidth isLoading={isSubmitting} loadingText="Отправляем…" disabled={!email.trim()}>
                Отправить ссылку для восстановления
              </Button>
            </form>
            <Link to="/login" className="focus-ring mt-4 inline-block text-sm text-accent hover:underline">
              Вернуться ко входу
            </Link>
          </>
        )}
      </Card>
    </div>
  );
}
