import Button from './Button';

export interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

/** Баннер ошибки загрузки с кнопкой повтора — используется на всех экранах со списками. */
export function ErrorState({ message, onRetry, retryLabel = 'Повторить' }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-lg border border-error bg-error-bg p-6 text-center"
    >
      <p className="text-sm text-error">{message}</p>
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}

export default ErrorState;
