import { useState } from 'react';
import ConfirmModal from '../../components/common/ConfirmModal';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import Skeleton from '../../components/common/Skeleton';
import ServiceFormModal from '../../components/company/ServiceFormModal';
import { useAuth } from '../../hooks/useAuth';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { useServices } from '../../hooks/useServices';
import { useToast } from '../../hooks/useToast';
import { formatPrice } from '../../lib/utils';
import type { Service } from '../../lib/types';

/** `/company/services` (только company_verified) — управление прайс-листом. */
export default function ServicesPage() {
  useDocumentMeta({ title: 'Услуги и цены — CleanLink' });
  const { user } = useAuth();
  const companyId = user?.company?.id;
  const { items, isLoading, error, reload, createService, updateService, deleteService } = useServices(companyId);
  const { showToast } = useToast();

  const [search, setSearch] = useState('');
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deletingService, setDeletingService] = useState<Service | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filtered = items.filter((service) => service.name.toLowerCase().includes(search.toLowerCase()));

  const handleDelete = async () => {
    if (!deletingService) return;
    setIsDeleting(true);
    try {
      await deleteService(deletingService.id);
      showToast('Услуга удалена', 'success');
      setDeletingService(null);
    } catch {
      showToast('Не удалось удалить услугу. Попробуйте снова', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-text-primary">Услуги и цены</h1>
        {items.length > 0 ? (
          <Button
            onClick={() => {
              setEditingService(null);
              setIsFormOpen(true);
            }}
          >
            Добавить услугу
          </Button>
        ) : null}
      </div>

      {items.length > 15 ? (
        <input
          type="search"
          placeholder="Поиск по названию услуги"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="focus-ring h-10 rounded-md border border-border-strong bg-surface px-3 text-sm text-text-primary"
        />
      ) : null}

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message="Не удалось загрузить услуги" onRetry={reload} />
      ) : items.length === 0 ? (
        <EmptyState
          title="В прайсе пока нет услуг"
          action={
            <Button
              onClick={() => {
                setEditingService(null);
                setIsFormOpen(true);
              }}
            >
              Добавить первую услугу
            </Button>
          }
        />
      ) : (
        <ul className={items.length > 15 ? 'flex max-h-[560px] flex-col gap-2 overflow-y-auto pr-1' : 'flex flex-col gap-2'}>
          {filtered.map((service) => (
            <li key={service.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4">
              <div>
                <p className="font-semibold text-text-primary">{service.name}</p>
                {service.description ? <p className="text-sm text-text-secondary">{service.description}</p> : null}
                {service.durationMin ? <p className="text-xs text-text-secondary">{service.durationMin} мин</p> : null}
              </div>
              <div className="flex items-center gap-3">
                <span className="tabular-nums font-semibold text-text-primary">{formatPrice(service.price)}</span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setEditingService(service);
                    setIsFormOpen(true);
                  }}
                >
                  Редактировать
                </Button>
                <Button variant="danger" size="sm" onClick={() => setDeletingService(service)}>
                  Удалить
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ServiceFormModal
        isOpen={isFormOpen}
        service={editingService}
        onClose={() => setIsFormOpen(false)}
        onSubmit={async (input) => {
          if (editingService) {
            await updateService(editingService.id, input);
            showToast('Услуга обновлена', 'success');
          } else {
            await createService(input);
            showToast('Услуга добавлена', 'success');
          }
        }}
      />

      <ConfirmModal
        isOpen={Boolean(deletingService)}
        title="Удаление услуги"
        description={`Удалить услугу «${deletingService?.name}»? Это действие нельзя отменить`}
        confirmLabel="Удалить"
        onConfirm={handleDelete}
        onCancel={() => setDeletingService(null)}
        isLoading={isDeleting}
      />
    </div>
  );
}
