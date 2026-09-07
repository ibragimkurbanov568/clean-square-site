import Button from './Button';
import Modal from './Modal';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
  isLoading?: boolean;
}

/**
 * Модал-подтверждение (удаление/отмена) — docs/02-ux.md §6: фокус по умолчанию на «Отмена»,
 * чтобы избежать случайного деструктивного действия.
 */
export function ConfirmModal({
  isOpen,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Отмена',
  onConfirm,
  onCancel,
  isDestructive = true,
  isLoading,
}: ConfirmModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <Button variant="secondary" autoFocus onClick={onCancel} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button variant={isDestructive ? 'danger' : 'primary'} onClick={onConfirm} isLoading={isLoading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-text-secondary">{description}</p>
    </Modal>
  );
}

export default ConfirmModal;
