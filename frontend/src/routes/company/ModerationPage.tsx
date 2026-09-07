import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import ButtonLink from '../../components/common/ButtonLink';
import { useAuth } from '../../hooks/useAuth';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { useToast } from '../../hooks/useToast';

const VERIFIED_BANNER_KEY = 'cleanlink-verified-banner-shown';

/** `/company` (index) — заглушка «на модерации» для `company_unverified`. */
export default function ModerationPage() {
  useDocumentMeta({ title: 'Профиль на модерации — CleanLink' });
  const { user } = useAuth();
  const { showToast } = useToast();
  const isVerified = Boolean(user?.company?.isVerified);

  useEffect(() => {
    if (!isVerified || !user?.company) return;
    const key = `${VERIFIED_BANNER_KEY}:${user.company.id}`;
    if (!window.localStorage.getItem(key)) {
      window.localStorage.setItem(key, '1');
      showToast('Профиль подтверждён! Теперь доступны услуги, акции и приём заказов', 'success');
    }
  }, [isVerified, user, showToast]);

  if (isVerified) {
    return <Navigate to="/company/profile" replace />;
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-bg text-neutral">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
          <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h1 className="text-xl font-bold text-text-primary">Профиль на модерации</h1>
      <p className="text-sm text-text-secondary">
        Ваш профиль проверяется вручную. Обычно это занимает 1–2 рабочих дня. Пока проверка не завершена, клиенты видят
        ваш профиль в списке компаний, но без цен, акций и возможности оформить заказ.
      </p>
      <ButtonLink to="/company/profile" variant="secondary">
        Редактировать основные данные
      </ButtonLink>
    </div>
  );
}
