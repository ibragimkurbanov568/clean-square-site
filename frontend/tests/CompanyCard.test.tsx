import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../src/context/AuthContext';
import { FavoritesProvider } from '../src/context/FavoritesContext';
import { ToastProvider } from '../src/context/ToastContext';
import CompanyCard from '../src/components/common/CompanyCard';
import type { Company } from '../src/lib/types';

const company: Company = {
  id: 'company-1',
  name: 'Чистый дом',
  description: 'Клининговая компания полного цикла',
  city: 'Москва',
  address: 'ул. Примерная, 1',
  phone: '+7 900 000-00-00',
  website: null,
  workHours: 'Пн–Пт 9:00–20:00',
  videoUrl: null,
  coverUrl: null,
  avatarUrl: null,
  ratingAvg: 4.8,
  reviewsCount: 132,
  ordersCount: 50,
  viewsCount: 1000,
  isVerified: true,
  priceFrom: 1500,
  createdAt: '2024-01-01T00:00:00.000Z',
};

function renderCard(companyData: Company, rank?: 1 | 2 | 3) {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <ToastProvider>
          <FavoritesProvider>
            <CompanyCard company={companyData} rank={rank} />
          </FavoritesProvider>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

// Критический сценарий F2/F3: карточка компании в списке результатов показывает название,
// рейтинг и цену «от», карточка ТОП-3 — числовой бейдж места.
describe('CompanyCard', () => {
  afterEach(() => cleanup());

  it('отображает название, рейтинг и цену «от» для верифицированной компании', () => {
    renderCard(company);

    expect(screen.getByText('Чистый дом')).toBeInTheDocument();
    expect(screen.getByText(/от 1\s?500\s?₽/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Рейтинг 4.8 из 5, 132 отзыва/ })).toBeInTheDocument();
  });

  it('показывает бейдж «Профиль не подтверждён» и скрывает цену для неверифицированной компании', () => {
    renderCard({ ...company, isVerified: false, priceFrom: null });

    expect(screen.getByText('Профиль не подтверждён')).toBeInTheDocument();
    expect(screen.queryByText(/от .*₽/)).not.toBeInTheDocument();
  });

  it('показывает числовой бейдж места в блоке ТОП-3', () => {
    renderCard(company, 1);
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});
