import PageStub from '../../components/common/PageStub';

/** `/company` (index) — заглушка «на модерации» для `company_unverified`. */
export default function ModerationPage() {
  return (
    <PageStub
      title="Профиль на модерации"
      description="Ваш профиль проверяется вручную. Обычно это занимает 1–2 рабочих дня. Пока проверка не завершена, клиенты видят ваш профиль в списке компаний, но без цен, акций и возможности оформить заказ."
    />
  );
}
