import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../common/Button';
import Modal from '../common/Modal';
import { createOrder } from '../../hooks/useOrders';
import { useToast } from '../../hooks/useToast';
import { formatPrice } from '../../lib/utils';
import type { Service } from '../../lib/types';

export interface OrderConfirmModalProps {
  isOpen: boolean;
  service: Service | null;
  companyId: string;
  companyName: string;
  onClose: () => void;
}

/** Модал подтверждения заказа (F5) — docs/02-ux.md «Карточка компании». */
export function OrderConfirmModal({ isOpen, service, companyId, companyName, onClose }: OrderConfirmModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  if (!service) return null;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await createOrder(companyId, service.id);
      showToast(
        'Заказ отправлен компании',
        'success',
      );
      onClose();
    } catch {
      setError('Не удалось создать заказ. Попробуйте ещё раз');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Подтвердите заказ"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Отмена
          </Button>
          <Button variant="primary" onClick={handleConfirm} isLoading={isSubmitting} loadingText="Оформляем…">
            Подтвердить заказ
          </Button>
        </>
      }
    >
      <p className="text-sm text-text-primary">
        Услуга: {service.name}. Цена: {formatPrice(service.price)}. Компания: {companyName}
      </p>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-error">
          {error}
        </p>
      ) : null}
      <p className="mt-4 text-xs text-text-secondary">
        После подтверждения заказ появится в разделе{' '}
        <Link to="/account/orders" className="text-accent hover:underline">
          «Мои заказы»
        </Link>
        .
      </p>
    </Modal>
  );
}

export default OrderConfirmModal;
