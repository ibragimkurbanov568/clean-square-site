import { useNavigate } from 'react-router-dom';
import Button from '../common/Button';
import EmptyState from '../common/EmptyState';
import ErrorState from '../common/ErrorState';
import ScrollReveal from '../common/ScrollReveal';
import Skeleton from '../common/Skeleton';
import { useAuth } from '../../hooks/useAuth';
import { buildGuestLoginUrl } from '../../lib/authRedirect';
import { formatPrice } from '../../lib/utils';
import type { Service } from '../../lib/types';

export interface ServicesTabProps {
  companyId: string;
  items: Service[];
  isLoading: boolean;
  error: string | null;
  reload: () => void;
  onOrder: (service: Service) => void;
}

export function ServicesTab({ companyId, items, isLoading, error, reload, onOrder }: ServicesTabProps) {
  const { status } = useAuth();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={reload} />;
  }

  if (items.length === 0) {
    return <EmptyState title="У компании пока нет услуг в прайсе" />;
  }

  const handleOrderClick = (service: Service) => {
    if (status !== 'authenticated') {
      navigate(
        buildGuestLoginUrl({
          intent: 'order',
          companyId,
          serviceId: service.id,
          returnTo: `/companies/${companyId}`,
        }),
      );
      return;
    }
    onOrder(service);
  };

  return (
    <ul className={items.length > 15 ? 'flex max-h-[560px] flex-col gap-3 overflow-y-auto pr-1' : 'flex flex-col gap-3'}>
      {items.map((service, index) => (
        <ScrollReveal key={service.id} as="li" index={index}>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4">
            <div>
              <p className="font-semibold text-text-primary">{service.name}</p>
              {service.description ? <p className="mt-1 text-sm text-text-secondary">{service.description}</p> : null}
              {service.durationMin ? <p className="mt-1 text-xs text-text-secondary">{service.durationMin} мин</p> : null}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-lg font-semibold tabular-nums text-accent">{formatPrice(service.price)}</span>
              <Button size="sm" onClick={() => handleOrderClick(service)}>
                Заказать
              </Button>
            </div>
          </div>
        </ScrollReveal>
      ))}
    </ul>
  );
}

export default ServicesTab;
