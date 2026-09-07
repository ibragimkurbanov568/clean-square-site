import PageStub from '../components/common/PageStub';

/** `/login/2fa` — код TOTP при входе, если у аккаунта включена 2FA (F1, допущение 2). */
export default function Login2FAPage() {
  return (
    <PageStub
      title="Введите код из приложения-аутентификатора"
      description="TODO(frontend): 6 ячеек кода, POST /api/auth/login/2fa через useAuth()."
    />
  );
}
