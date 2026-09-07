import { useNavigate } from 'react-router-dom';
import CompanyCard from '../../components/common/CompanyCard';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import ScrollReveal from '../../components/common/ScrollReveal';
import ShowMoreButton from '../../components/common/ShowMoreButton';
import { SkeletonCompanyCard } from '../../components/common/Skeleton';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { useFavorites } from '../../hooks/useFavorites';

/** `/account/favorites` — избранные компании клиента (F8). */
export default function FavoritesPage() {
  useDocumentMeta({ title: 'Избранное — CleanLink' });
  const { items, isLoading, isLoadingMore, error, hasMore, reload, loadMore } = useFavorites();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold text-text-primary">Избранное</h1>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCompanyCard key={i} />
          ))}
        </div>
      ) : error ? (
        <ErrorState message="Не удалось загрузить избранное" onRetry={reload} />
      ) : items.length === 0 ? (
        <EmptyState
          title="В избранном пока пусто"
          action={
            <Button variant="primary" onClick={() => navigate('/')}>
              Найти компании
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((favorite, index) => (
              <ScrollReveal key={favorite.companyId} index={index}>
                <CompanyCard company={favorite.company} />
              </ScrollReveal>
            ))}
          </div>
          {hasMore ? <ShowMoreButton onClick={loadMore} isLoading={isLoadingMore} /> : null}
        </>
      )}
    </div>
  );
}
