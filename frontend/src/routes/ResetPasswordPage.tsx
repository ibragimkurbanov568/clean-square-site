import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import { useAuth } from '../hooks/useAuth';
import { ApiError } from '../lib/apiClient';
import { fieldErrors, resetPasswordSchema } from '../lib/validation';
import { useDocumentMeta } from '../hooks/useDocumentMeta';

/** `/reset-password/:token` — установка нового пароля по токену. */
export default function ResetPasswordPage() {
  useDocumentMeta({ title: 'Новый пароль — CleanLink' });
  const { token } = useParams<{ token: string }>();
  const { resetPassword } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setTokenError(null);
    const parsed = resetPasswordSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setIsSubmitting(true);
    try {
      await resetPassword(token ?? '', parsed.data.password, parsed.data.confirmPassword);
      setIsSuccess(true);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'invalid_token') {
        setTokenError('Ссылка для восстановления недействительна или устарела');
      } else if (error instanceof ApiError) {
        setTokenError(error.message);
      } else {
        setTokenError('Ссылка для восстановления недействительна или устарела');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-[480px] flex-col justify-center px-4 py-10">
      <Card>
        <h1 className="mb-6 text-2xl font-bold text-text-primary">Новый пароль</h1>

        {isSuccess ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-text-primary">Пароль изменён. Теперь вы можете войти с новым паролем</p>
            <Button onClick={() => navigate('/login')}>Войти</Button>
          </div>
        ) : tokenError ? (
          <div className="flex flex-col gap-4">
            <p role="alert" className="text-sm text-error">
              {tokenError}
            </p>
            <Link to="/forgot-password">
              <Button variant="secondary">Запросить новую ссылку</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <Input
              label="Новый пароль"
              type="password"
              placeholder="Минимум 8 символов"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              disabled={isSubmitting}
              required
            />
            <Input
              label="Повторите пароль"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={errors.confirmPassword}
              disabled={isSubmitting}
              required
            />
            <Button type="submit" size="lg" fullWidth isLoading={isSubmitting} loadingText="Сохраняем…" disabled={!password || !confirmPassword}>
              Сохранить новый пароль
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
