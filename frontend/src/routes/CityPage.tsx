import { useParams } from 'react-router-dom';
import PageStub from '../components/common/PageStub';

/** `/city/:citySlug` — ТОП-3 + список компаний города (F2, F3). */
export default function CityPage() {
  const { citySlug } = useParams<{ citySlug: string }>();
  return (
    <PageStub
      title={`Компании в городе ${citySlug ?? ''}`}
      description="TODO(frontend): блок «ТОП-3 компании города» + список остальных компаний, GET /api/companies/top и GET /api/companies."
    />
  );
}
