import ButtonLink from '../components/common/ButtonLink';
import { useDocumentMeta } from '../hooks/useDocumentMeta';

export default function NotFoundPage() {
  useDocumentMeta({ title: 'Страница не найдена — CleanLink' });
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-xl flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-text-primary">Страница не найдена</h1>
      <p className="text-sm text-text-secondary">
        Такой страницы не существует. Возможно, ссылка устарела — вернитесь на главную и попробуйте снова.
      </p>
      <ButtonLink to="/" variant="primary">
        На главную
      </ButtonLink>
    </div>
  );
}
