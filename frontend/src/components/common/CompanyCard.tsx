import { Link } from 'react-router-dom';
import type { Company } from '../../lib/types';
import { cn, formatPrice } from '../../lib/utils';
import ButtonLink from './ButtonLink';
import FavoriteHeartButton from './FavoriteHeartButton';
import StarRating from './StarRating';
import { UnverifiedBadge } from './Badge';

export interface CompanyCardProps {
  company: Company;
  rank?: 1 | 2 | 3;
}

function CoverImage({ company }: { company: Company }) {
  const src = company.coverUrl ?? company.avatarUrl;
  if (src) {
    return <img src={src} alt="" className="aspect-video w-full rounded-t-lg object-cover" />;
  }
  return (
    <div
      className="aspect-video w-full rounded-t-lg"
      style={{ background: 'var(--gradient-hero)' }}
      aria-hidden="true"
    />
  );
}

/** Карточка компании в списке результатов — docs/03-design-system.md §7.3. */
export function CompanyCard({ company, rank }: CompanyCardProps) {
  const isTop = Boolean(rank);
  const returnTo = `/companies/${company.id}`;

  return (
    <div
      className={cn(
        'interactive-scale group flex flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-sm hover:shadow-md',
        isTop ? 'shadow-md' : '',
      )}
    >
      <Link to={`/companies/${company.id}`} className="relative block" aria-label={company.name}>
        <CoverImage company={company} />
        {rank ? (
          <span
            className={cn(
              'absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold',
              rank === 1 ? 'bg-accent text-accent-contrast' : 'bg-accent-subtle text-accent',
            )}
          >
            {rank}
          </span>
        ) : null}
        <FavoriteHeartButton companyId={company.id} returnTo={returnTo} size="sm" className="absolute right-3 top-3" />
      </Link>
      <div className={cn('flex flex-1 flex-col gap-2', isTop ? 'p-5' : 'p-4')}>
        <Link to={`/companies/${company.id}`} className="focus-ring rounded">
          <h3 className={cn('truncate font-semibold text-text-primary', isTop ? 'text-lg' : 'text-base sm:text-lg')}>
            {company.name}
          </h3>
        </Link>
        <StarRating rating={company.ratingAvg} reviewsCount={company.reviewsCount} />
        {!company.isVerified ? <UnverifiedBadge /> : null}
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          {company.isVerified && company.priceFrom !== null ? (
            <span className="text-base font-semibold text-accent">от {formatPrice(company.priceFrom)}</span>
          ) : (
            <span className="text-sm text-text-secondary">{company.city}</span>
          )}
          <ButtonLink to={`/companies/${company.id}`} variant="secondary" size="sm">
            Подробнее
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}

export default CompanyCard;
