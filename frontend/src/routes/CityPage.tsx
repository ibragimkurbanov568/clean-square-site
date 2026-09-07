import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import CompanyCard from '../components/common/CompanyCard';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import ScrollReveal from '../components/common/ScrollReveal';
import ShowMoreButton from '../components/common/ShowMoreButton';
import { SkeletonCompanyCard } from '../components/common/Skeleton';
import { useCompanies, useTopCompanies, type CompanySort } from '../hooks/useCompanies';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { unslugifyCity } from '../lib/utils';

const SORT_OPTIONS: Array<{ id: CompanySort; label: string }> = [
  { id: 'rating', label: 'По рейтингу' },
  { id: 'price_asc', label: 'По цене (сначала дешевле)' },
  { id: 'reviews', label: 'По количеству отзывов' },
];

/** `/city/:citySlug` — ТОП-3 + список компаний города (F2, F3). */
export default function CityPage() {
  const { citySlug } = useParams<{ citySlug: string }>();
  const navigate = useNavigate();
  const city = citySlug ? unslugifyCity(citySlug) : null;
  const [sort, setSort] = useState<CompanySort>('rating');

  useDocumentMeta({ title: `Компании в городе ${city ?? ''} — CleanLink` });

  const top = useTopCompanies(city);
  const list = useCompanies(city, sort);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8">
      <div className="flex flex-col gap-3">
        <Link to="/" className="focus-ring w-fit text-sm text-text-secondary hover:text-text-primary">
          ← На главную
        </Link>
        <h1 className="text-2xl font-bold text-text-primary">Компании в городе {city}</h1>
      </div>

      {top.error ? (
        <ErrorState message="Не удалось загрузить компании" onRetry={top.reload} />
      ) : top.isLoading ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-bold text-text-primary">ТОП-3 компании города</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <SkeletonCompanyCard key={i} />
            ))}
          </div>
        </section>
      ) : top.items.length > 0 ? (
        <section
          className="flex flex-col gap-4 rounded-xl p-0 md:p-6"
          style={{ background: 'var(--gradient-hero)' }}
        >
          <h2 className="text-xl font-bold text-text-primary">ТОП-3 компании города</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {top.items.map((company, index) => (
              <ScrollReveal key={company.id} index={index}>
                <CompanyCard company={company} rank={(index + 1) as 1 | 2 | 3} />
              </ScrollReveal>
            ))}
          </div>
        </section>
      ) : null}

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-text-primary">Все компании</h2>
          <div className="flex items-center gap-2">
            <label htmlFor="sort" className="text-sm text-text-secondary">
              Сортировка
            </label>
            <select
              id="sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as CompanySort)}
              className="focus-ring h-9 rounded-md border border-border-strong bg-surface px-2 text-sm text-text-primary"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {list.error ? (
          <ErrorState message="Не удалось загрузить компании" onRetry={list.reload} />
        ) : list.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCompanyCard key={i} />
            ))}
          </div>
        ) : list.items.length === 0 && top.items.length === 0 ? (
          <EmptyState
            title={`В городе ${city} компаний пока нет`}
            action={
              <button
                type="button"
                onClick={() => navigate('/')}
                className="focus-ring interactive-scale rounded-md bg-accent-600 px-4 py-2 text-sm font-semibold text-accent-contrast"
              >
                Выбрать другой город
              </button>
            }
          />
        ) : list.items.length === 0 ? (
          <p className="text-sm text-text-secondary">Больше компаний в этом городе не найдено.</p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.items.map((company, index) => (
                <ScrollReveal key={company.id} index={index}>
                  <CompanyCard company={company} />
                </ScrollReveal>
              ))}
            </div>
            {list.hasMore ? (
              <ShowMoreButton
                onClick={list.loadMore}
                isLoading={list.isLoadingMore}
                label={`Показать ещё ${Math.min(12, list.total - list.items.length)} компаний`}
              />
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
