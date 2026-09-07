import { useEffect, useState } from 'react';
import Button from '../common/Button';
import Input from '../common/Input';
import Modal from '../common/Modal';
import Textarea from '../common/Textarea';
import { fieldErrors, serviceSchema } from '../../lib/validation';
import type { Service } from '../../lib/types';
import type { ServiceInput } from '../../hooks/useServices';

export interface ServiceFormModalProps {
  isOpen: boolean;
  service: Service | null;
  onClose: () => void;
  onSubmit: (input: ServiceInput) => Promise<void>;
}

export function ServiceFormModal({ isOpen, service, onClose, onSubmit }: ServiceFormModalProps) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [durationMin, setDurationMin] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(service?.name ?? '');
      setPrice(service ? String(service.price) : '');
      setDurationMin(service?.durationMin ? String(service.durationMin) : '');
      setDescription(service?.description ?? '');
      setErrors({});
    }
  }, [isOpen, service]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = serviceSchema.safeParse({
      name,
      price,
      durationMin: durationMin || undefined,
      description: description || undefined,
    });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setIsSubmitting(true);
    try {
      await onSubmit(parsed.data);
      onClose();
    } catch {
      setErrors({ _root: 'Не удалось сохранить услугу. Попробуйте снова' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={service ? 'Редактировать услугу' : 'Добавить услугу'}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Input label="Название услуги" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} required />
        <Input
          label="Цена, ₽"
          type="number"
          min={1}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          error={errors.price}
          required
        />
        <Input
          label="Длительность, мин (необязательно)"
          type="number"
          min={1}
          value={durationMin}
          onChange={(e) => setDurationMin(e.target.value)}
          error={errors.durationMin}
        />
        <Textarea
          label="Описание (необязательно)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          error={errors.description}
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
            Сохранить услугу
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default ServiceFormModal;
