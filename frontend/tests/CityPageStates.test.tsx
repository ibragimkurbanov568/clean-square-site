import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CityPage from '../src/routes/CityPage';
import { installFetchMock, paginated } from './mockApi';

// Экран города (docs/01-spec.md, docs/02-ux.md «Экран города») — пустое состояние («В городе
// {Город} компаний пока нет») и состояние ошибки («Не удалось загрузить компании» + «Повторить»).

function renderCityPage(citySlug: string) {
  return render(
    <MemoryRouter initialEntries={[`/city/${citySlug}`]}>
      <Routes>
        <Route path="/city/:citySlug" element={<CityPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('CityPage — пустое и ошибочное состояния', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('пустое состояние: город без компаний', async () => {
    installFetchMock([
      { method: 'GET', matcher: /\/companies\/top$/, handler: () => ({ status: 200, body: { items: [] } }) },
      { method: 'GET', matcher: /\/companies$/, handler: () => ({ status: 200, body: paginated([]) }) },
    ]);
    renderCityPage('казань');

    expect(await screen.findByText('В городе казань компаний пока нет')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Выбрать другой город' })).toBeInTheDocument();
  });

  it('состояние ошибки: недоступный API → баннер с кнопкой «Повторить»', async () => {
    installFetchMock([
      {
        method: 'GET',
        matcher: /\/companies\/top$/,
        handler: () => ({ status: 500, body: { error: { code: 'internal_error', message: 'x' } } }),
      },
      {
        method: 'GET',
        matcher: /\/companies$/,
        handler: () => ({ status: 500, body: { error: { code: 'internal_error', message: 'x' } } }),
      },
    ]);
    renderCityPage('казань');

    const errors = await screen.findAllByText('Не удалось загрузить компании');
    expect(errors.length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Повторить' }).length).toBeGreaterThan(0);
  });
});
