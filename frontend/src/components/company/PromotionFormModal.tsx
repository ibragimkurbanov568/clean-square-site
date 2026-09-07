import { useState } from 'react';
import Button from '../common/Button';
import Input from '../common/Input';
import Modal from '../common/Modal';
import { fieldErrors, promotionSchema } from '../../lib/validation';
import type { PromotionInput } from '../../hooks/usePromotions';

export interface PromotionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: PromotionInput) => Promise<void>;
}

export function PromotionFormModal({ isOpen, onClose, onSubmit }: PromotionFormModalProps) {
  const [title, setTitle] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = promotionSchema.safeParse({ title, discountPercent, validUntil });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setIsSubmitting(true);
    try {
      await onSubmit(parsed.data);
      setTitle('');
      setDiscountPercent('');
      setValidUntil('');
      onClose();
    } catch {
      setErrors({ _root: 'Не удалось сохранить акцию. Попробуйте снова' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Создать акцию">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Input label="Название акции" value={title} onChange={(e) => setTitle(e.target.value)} error={errors.title} required />
        <Input
          label="Скидка, %"
          type="number"
          min={1}
          max={100}
          value={discountPercent}
          onChange={(e) => setDiscountPercent(e.target.value)}
          error={errors.discountPercent}
          required
        />
        <Input
          label="Действует до"
          type="date"
          value={validUntil}
          onChange={(e) => setValidUntil(e.target.value)}
          error={errors.validUntil}
          required
        />
        {errors._root ? (
          <p role="alert" className="text-sm text-error">
            {errors._root}
          </p>
        ) : null}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Отмена
          </Button>
          <Button type="submit" isLoading={isSubmitting} loadingText="Сохраняем…">
            Сохранить акцию
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default PromotionFormModal;
