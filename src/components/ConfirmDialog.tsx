import { useId } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";

export interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  busyLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Диалог подтверждения (удалить секцию/проект, перегенерировать все
 * тексты) — docs/02-ux.md, оверлеи «Удалить секцию»/«Удалить проект»/
 * «Перегенерировать все тексты». Фокус по умолчанию — на безопасной
 * кнопке «Отмена» (docs/03-design-system.md, §3.4).
 */
export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel = "Отмена",
  danger,
  busy,
  busyLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();

  return (
    <Modal
      titleId={titleId}
      title={title}
      onClose={onCancel}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} autoFocus>
            {cancelLabel}
          </Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} disabled={busy}>
            {busy ? busyLabel ?? confirmLabel : confirmLabel}
          </Button>
        </>
      }
    >
      <p>{description}</p>
    </Modal>
  );
}
