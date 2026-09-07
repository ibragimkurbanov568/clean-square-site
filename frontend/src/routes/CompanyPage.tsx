import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import AboutTab from '../components/companyPage/AboutTab';
import OrderConfirmModal from '../components/companyPage/OrderConfirmModal';
import ReviewsTab from '../components/companyPage/ReviewsTab';
import ServicesTab from '../components/companyPage/ServicesTab';
import { UnverifiedBadge, VerifiedBadge } from '../components/common/Badge';
import Avatar from '../components/common/Avatar';
import Cover3D from '../components/common/Cover3D';
import EmptyState from '../components/common/EmptyState';
import FavoriteHeartButton from '../components/common/FavoriteHeartButton';
import PromotionBadge from '../components/common/PromotionBadge';
import Skeleton, { SkeletonCircle } from '../components/common/Skeleton';
import StarRating from '../components/common/StarRating';
import Tabs from '../components/common/Tabs';
import { useAuth } from '../hooks/useAuth';
import { useCompany } from '../hooks/useCompany';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { useFavorites } from '../hooks/useFavorites';
import { usePromotions } from '../hooks/usePromotions';
import { useServices } from '../hooks/useServices';
import { useStartChat } from '../hooks/useStartChat';
import { buildGuestLoginUrl } from '../lib/authRedirect';
import type { Service } from '../lib/types';

type TabId = 'services' | 'reviews' | 'about';

/** `/companies/:id` — карточка компании: «Услуги и цены» / «Отзывы» / «О нас» (F4, F5, F6, F8, F9). */
export default function CompanyPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, status } = useAuth();
  const { toggleFavorite } = useFavorites();
  const { startChat, isStarting: isStartingChat } = useStartChat('/account/chats');

  const { company, isLoading, error, notFound } = useCompany(id);
  const services = useServices(company?.isVerified ? id : undefined);
  const promotions = usePromotions(company?.isVerified ? id : undefined);

  const [activeTab, setActiveTab] = useState<TabId>('services');
  const [orderService, setOrderService] = useState<Service | null>(null);
  const intentHandled = useRef(false);

  useEffect(() => {
    if (company && !company.isVerified) setActiveTab('about');
  }, [company]);

  useDocumentMeta({
    title: company ? `${company.name} — CleanLink` : 'Карточка компании — CleanLink',
    description: company
      ? `${company.name} в городе ${company.city}: рейтинг ${company.ratingAvg.toFixed(1)} из 5, ${company.reviewsCount} отзывов. ${company.description || 'Сравнивайте цены и заказывайте уборку на CleanLink.'}`.slice(0, 200)
      : undefined,
  });

  const handleChatClick = () => {
    if (!id) return;
    if (status !== 'authenticated') {
      navigate(buildGuestLoginUrl({ intent: 'chat', companyId: id, returnTo: `/companies/${id}` }));
      return;
    }
    void startChat(id);
  };

  // Гостевые intent-редиректы: продолжаем действие сразу после успешного входа (docs/02-ux.md §3).
  useEffect(() => {
    if (intentHandled.current || status !== 'authenticated' || !id || !company) return;
    const intent = searchParams.get('intent');
    const companyId = searchParams.get('companyId');
    if (!intent || companyId !== id) return;

    if (intent === 'order') {
      const serviceId = searchParams.get('serviceId');
      const service = services.items.find((item) => item.id === serviceId);
      if (service) {
        intentHandled.current = true;
        setOrderService(service);
        setSearchParams({}, { replace: true });
      } else if (!services.isLoading) {
        intentHandled.current = true;
        setSearchParams({}, { replace: true });
      }
    } else if (intent === 'chat') {
      intentHandled.current = true;
      setSearchParams({}, { replace: true });
      void startChat(id);
    } else if (intent === 'favorite') {
      intentHandled.current = true;
      setSearchParams({}, { replace: true });
      void toggleFavorite(id);
    }
  }, [status, id, company, services.items, services.isLoading, searchParams]);

  if (notFound || error) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <EmptyState
          title="Компания не найдена"
          action={
            <button
              type="button"
              onClick={() => navigate('/')}
              className="focus-ring interactive-scale rounded-md bg-accent-600 px-4 py-2 text-sm font-semibold text-accent-contrast"
            >
              Вернуться к поиску
            </button>
          }
        />
      </div>
    );
  }

  if (isLoading || !company) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <Skeleton className="aspect-[21/9] w-full" />
        <div className="-mt-10 flex items-end gap-4 px-4">
          <SkeletonCircle size={96} />
        </div>
        <div className="mt-6 flex flex-col gap-4">
          <Skeleton className="h-6 w-1/3" />
          <div className="flex gap-4">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-32" />
          </div>
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  const returnTo = `/companies/${company.id}`;
  const showActions = status !== 'authenticated' || user?.role === 'client';

  const tabItems = company.isVerified
    ? [
        { id: 'services', label: 'Услуги и цены' },
        { id: 'reviews', label: 'Отзывы' },
        { id: 'about', label: 'О нас' },
      ]
    : [{ id: 'about', label: 'О нас' }];

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16">
      <div className="relative">
        <Cover3D className="aspect-[21/9] w-full overflow-hidden rounded-b-xl md:rounded-xl">
          {company.coverUrl ? (
            <img src={company.coverUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full" style={{ background: 'var(--gradient-hero)' }} />
          )}
        </Cover3D>
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Назад"
          className="focus-ring interactive-scale absolute left-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-surface-elevated/80 text-text-primary backdrop-blur-sm"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {showActions ? (
          <FavoriteHeartButton companyId={company.id} returnTo={returnTo} className="absolute right-3 top-3" />
        ) : null}
      </div>

      <div className="grid gap-8 md:grid-cols-[320px_1fr] md:px-4">
        <div className="md:sticky md:top-20 md:self-start">
          <div className="-mt-10 flex flex-col gap-3 px-4 md:mt-0 md:px-0">
            <Avatar src={company.avatarUrl} name={company.name} size={96} className="border-4 border-bg" />
            <h1 className="text-xl font-bold text-text-primary">{company.name}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <StarRating rating={company.ratingAvg} reviewsCount={company.reviewsCount} />
              {company.isVerified ? <VerifiedBadge /> : <UnverifiedBadge />}
            </div>
            <p className="text-sm text-text-secondary">{company.city}</p>

            {!company.isVerified ? (
              <div className="rounded-md bg-neutral-bg p-3 text-sm text-text-secondary">
                Профиль в процессе проверки, часть информации пока скрыта
              </div>
            ) : null}

            {showActions ? (
              <div className="flex flex-col gap-2 pt-2">
                {company.isVerified ? (
                  <button
                    type="button"
                    onClick={() => setActiveTab('services')}
                    className="focus-ring interactive-scale rounded-md bg-accent-600 px-4 py-2.5 text-sm font-semibold text-accent-contrast hover:bg-accent-700"
                  >
                    Заказать
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={handleChatClick}
                  disabled={isStartingChat}
                  className="focus-ring interactive-scale rounded-md border border-border-strong bg-surface px-4 py-2.5 text-sm font-semibold text-text-primary hover:bg-surface-hover disabled:opacity-50"
                >
                  {isStartingChat ? 'Открываем чат…' : 'Написать в чат'}
                </button>
              </div>
            ) : null}

            {company.isVerified && promotions.items.length > 0 ? (
              <div className="flex flex-col gap-2 pt-2">
                {promotions.items
                  .filter((p) => !p.isExpired)
                  .map((promotion) => (
                    <PromotionBadge key={promotion.id} promotion={promotion} />
                  ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-6 px-4 md:px-0">
          <Tabs items={tabItems} activeId={activeTab} onChange={(id_) => setActiveTab(id_ as TabId)} />
          <div key={activeTab}>
            {activeTab === 'services' && company.isVerified ? (
              <ServicesTab
                companyId={company.id}
                items={services.items}
                isLoading={services.isLoading}
                error={services.error}
                reload={services.reload}
                onOrder={setOrderService}
              />
            ) : null}
            {activeTab === 'reviews' && company.isVerified ? <ReviewsTab companyId={company.id} /> : null}
            {activeTab === 'about' ? <AboutTab company={company} /> : null}
          </div>
        </div>
      </div>

      <OrderConfirmModal
        isOpen={Boolean(orderService)}
        service={orderService}
        companyId={company.id}
        companyName={company.name}
        onClose={() => setOrderService(null)}
      />
    </div>
  );
}
