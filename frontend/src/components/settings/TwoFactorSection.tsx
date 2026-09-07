import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Button from '../common/Button';
import Card from '../common/Card';
import Input from '../common/Input';
import Modal from '../common/Modal';
import Toggle from '../common/Toggle';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';

/**
 * Раздел «Безопасность» — 2FA (допущение 2 ТЗ), идентичен для /account/settings и
 * /company/settings (docs/02-ux.md).
 */
export function TwoFactorSection() {
  const { user, setupTwoFactor, enableTwoFactor, disableTwoFactor, forgotPassword } = useAuth();
  const { showToast } = useToast();

  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [otpAuthUri, setOtpAuthUri] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

  const handleChangePassword = async () => {
    if (!user) return;
    setIsSendingReset(true);
    try {
      const result = await forgotPassword(user.email);
      if (result.demoResetUrl) {
        showToast('Демо-режим: ссылка для смены пароля отправлена (см. настройки)', 'info');
        window.open(result.demoResetUrl, '_blank', 'noopener');
      } else {
        showToast('Мы отправили на ваш email ссылку для смены пароля', 'success');
      }
    } catch {
      showToast('Не удалось отправить письмо. Попробуйте ещё раз позже', 'error');
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleToggle = async (next: boolean) => {
    if (!next) {
      setIsBusy(true);
      try {
        await disableTwoFactor();
        showToast('Двухфакторная аутентификация отключена', 'info');
      } catch {
        showToast('Не удалось сохранить изменения. Попробуйте снова', 'error');
      } finally {
        setIsBusy(false);
      }
      return;
    }
    setIsBusy(true);
    try {
      const result = await setupTwoFactor();
      setOtpAuthUri(result.otpAuthUri);
      setSecret(result.secret);
      setIsSetupOpen(true);
    } catch {
      showToast('Не удалось сохранить изменения. Попробуйте снова', 'error');
    } finally {
      setIsBusy(false);
    }
  };

  const handleConfirm = async () => {
    setError(null);
    setIsBusy(true);
    try {
      await enableTwoFactor(code);
      showToast('Двухфакторная аутентификация включена', 'success');
      setIsSetupOpen(false);
      setCode('');
    } catch {
      setError('Неверный код, попробуйте снова');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold text-text-primary">Безопасность</h2>
      <div className="mb-4 flex flex-col gap-2 border-b border-border pb-4">
        <p className="text-sm text-text-secondary">Смена пароля происходит по ссылке, отправленной на ваш email.</p>
        <Button variant="secondary" size="sm" onClick={handleChangePassword} isLoading={isSendingReset} loadingText="Отправляем…" className="w-fit">
          Сменить пароль
        </Button>
      </div>
      <Toggle
        label="Двухфакторная аутентификация"
        checked={Boolean(user?.totpEnabled)}
        onChange={(v) => void handleToggle(v)}
        disabled={isBusy}
      />

      <Modal
        isOpen={isSetupOpen}
        onClose={() => setIsSetupOpen(false)}
        title="Включить двухфакторную аутентификацию"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsSetupOpen(false)}>
              Отмена
            </Button>
            <Button variant="primary" onClick={handleConfirm} isLoading={isBusy} disabled={code.length !== 6}>
              Подтвердить и включить
            </Button>
          </>
        }
      >
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm text-text-secondary">Отсканируйте QR-код в приложении-аутентификаторе</p>
          {otpAuthUri ? <QRCodeSVG value={otpAuthUri} size={180} /> : null}
          {secret ? <p className="break-all text-center text-xs text-text-secondary">Секретный ключ: {secret}</p> : null}
          <Input
            label="Код из приложения"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            error={error ?? undefined}
          />
        </div>
      </Modal>
    </Card>
  );
}

export default TwoFactorSection;
