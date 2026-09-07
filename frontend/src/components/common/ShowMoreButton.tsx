import Button from './Button';

export interface ShowMoreButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  label?: string;
}

export function ShowMoreButton({ onClick, isLoading, label = 'Показать ещё' }: ShowMoreButtonProps) {
  return (
    <div className="flex justify-center py-4">
      <Button variant="secondary" onClick={onClick} isLoading={isLoading} loadingText="Загружаем…">
        {label}
      </Button>
    </div>
  );
}

export default ShowMoreButton;
