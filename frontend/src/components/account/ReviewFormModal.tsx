import { useState } from 'react';
import Button from '../common/Button';
import Modal from '../common/Modal';
import { StarRatingInput } from '../common/StarRating';
import Textarea from '../common/Textarea';
import { apiRequest, ApiError } from '../../lib/apiClient';
import type { Order, Review } from '../../lib/types';

export interface ReviewFormModalProps {
  order: Order | null;
  onClose: () => void;
  onSubmitted: (orderId: string) => void;
}

/** Форма отзыва (F7) — оценка звёздами (обязательно) + текст (необязательно). */
export function ReviewFormModal({ order, onClose, onSubmitted }: ReviewFormModalProps) {
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!order) return null;

  const handleSubmit = async () => {
    if (rating < 1) {
      setError('Поставьте оценку от 1 до 5 звёзд');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await apiRequest<Review>(`/orders/${order.id}/review`, { method: 'POST', body: { rating, text: text || undefined } });
      onSubmitted(order.id);
      setRating(0);
      setText('');
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError('Вы уже оставили отзыв к этому заказу');
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Не удалось отправить отзыв. Попробуйте ещё раз');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={Boolean(order)}
      onClose={onClose}
      title="Оставить отзыв"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Отмена
          </Button>
          <Button variant="primary" onClick={handleSubmit} isLoading={isSubmitting} loadingText="Отправляем…">
            Отправить отзыв
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-text-secondary">{order.companyName} — {order.serviceName}</p>
        <StarRatingInput value={rating} onChange={setRating} />
        <Textarea label="Текст отзыва (необязательно)" value={text} onChange={(e) => setText(e.target.value)} rows={4} />
        {error ? (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}

export default ReviewFormModal;
