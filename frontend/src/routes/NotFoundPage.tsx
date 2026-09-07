import { Link } from 'react-router-dom';
import PageStub from '../components/common/PageStub';

export default function NotFoundPage() {
  return (
    <PageStub title="Страница не найдена">
      <Link to="/" className="text-accent underline">
        Вернуться на главную
      </Link>
    </PageStub>
  );
}
