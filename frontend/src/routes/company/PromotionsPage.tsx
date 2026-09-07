import { useState } from 'react';
import Button from '../../components/common/Button';
import ConfirmModal from '../../components/common/ConfirmModal';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import Skeleton from '../../components/common/Skeleton';
import { ExpiredBadge } from '../../components/common/Badge';
import PromotionFormModal from '../../components/company/PromotionFormModal';
import { useAuth } from '../../hooks/useAuth';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { usePromotions } from '../../hooks/usePromotions';
import { useToast } from '../../hooks/useToast';
import { formatDate } from '../../lib/utils';
import type { Promotion } from '../../lib/types';

/** `/company/promotions` (только company_verified) — акции (F9). */
export default function PromotionsPage() {
  useDocumentMeta({ title: 'Акции — CleanLink' });
  const { user } = useAuth();
  const companyId = user?.company?.id;
  const { items, isLoading, error, reload, createPromotion, deletePromotion } = usePromotions(companyId);
  const { showToast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Promotion | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleting) return;
    setIsDeleting(true);
    try {
      await deletePromotion(deleting.id);
      showToast('Акция удалена', 'success');
      setDeleting(null);
    } catch {
      showToast('Не удалось удалить акцию. Попробуйте снова', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-text-primary">Акции</h1>
        {items.length > 0 ? <Button onClick={() => setIsFormOpen(true)}>Создать акцию</Button> : null}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message="Не удалось загрузить акции" onRetry={reload} />
      ) : items.length === 0 ? (
        <EmptyState title="У вас пока нет активных акций" action={<Button onClick={() => setIsFormOpen(true)}>Создать акцию</Button>} />
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((promotion) => (
            <li
              key={promotion.id}
              className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4 shadow-sm ${promotion.isExpired ? 'opacity-60' : ''}`}
            >
              <div>
                <p className="font-semibold text-text-primary">
                  −{promotion.discountPercent}% {promotion.title}
                </p>
                <p className="text-sm text-text-secondary">
                  {promotion.isExpired ? 'Истекла' : `Действует до ${formatDate(promotion.validUntil)}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {promotion.isExpired ? <ExpiredBadge /> : null}
                <Button variant="danger" size="sm" onClick={() => setDeleting(promotion)}>
                  Удалить
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <PromotionFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={async (input) => {
          await createPromotion(input);
          showToast('Акция опубликована на странице компании', 'success');
        }}
      />

      <ConfirmModal
        isOpen={Boolean(deleting)}
        title="Удаление акции"
        description={`Удалить акцию «${deleting?.title}»? Это действие нельзя отменить`}
        confirmLabel="Удалить"
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
        isLoading={isDeleting}
      />
    </div>
  );
}
