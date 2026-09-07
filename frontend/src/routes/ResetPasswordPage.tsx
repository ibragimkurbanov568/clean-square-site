import { useParams } from 'react-router-dom';
import PageStub from '../components/common/PageStub';

/** `/reset-password/:token` — установка нового пароля по токену. */
export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  return (
    <PageStub
      title="Новый пароль"
      description={`TODO(frontend): POST /api/auth/reset-password (token=${token ?? ''}).`}
    />
  );
}
