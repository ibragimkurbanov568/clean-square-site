import { useParams } from 'react-router-dom';
import PageStub from '../components/common/PageStub';

/** `/companies/:id` — карточка компании: «Услуги и цены» / «Отзывы» / «О нас» (F4, F5, F6, F8, F9). */
export default function CompanyPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <PageStub
      title="Карточка компании"
      description={`TODO(frontend): GET /api/companies/${id ?? ':id'}, вкладки, кнопки «Заказать»/«Написать в чат»/«В избранное».`}
    />
  );
}
