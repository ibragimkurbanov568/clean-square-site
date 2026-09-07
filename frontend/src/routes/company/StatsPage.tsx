import { useMemo, useState } from 'react';
import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip as ChartTooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import Card from '../../components/common/Card';
import ErrorState from '../../components/common/ErrorState';
import Skeleton from '../../components/common/Skeleton';
import { orderStatusLabel } from '../../lib/utils';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { useStats, type StatsPeriod } from '../../hooks/useStats';
import { formatPrice } from '../../lib/utils';
import type { OrderStatus } from '../../lib/types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ChartTooltip, Legend);

const PERIODS: Array<{ id: StatsPeriod; label: string }> = [
  { id: 7, label: '7 дней' },
  { id: 30, label: '30 дней' },
  { id: 90, label: '90 дней' },
];

const ORDER_STATUSES: OrderStatus[] = ['created', 'in_progress', 'done', 'cancelled'];

/** `/company/stats` (только company_verified) — статистика компании (F10). */
export default function StatsPage() {
  useDocumentMeta({ title: 'Статистика — CleanLink' });
  const [period, setPeriod] = useState<StatsPeriod>(7);
  const { stats, isLoading, error, reload } = useStats(period);

  const chartData = useMemo(() => {
    if (!stats) return null;
    return {
      labels: stats.series.map((point) => point.date),
      datasets: [
        {
          label: 'Просмотры',
          data: stats.series.map((point) => point.views),
          borderColor: '#60a5fa',
          backgroundColor: '#60a5fa',
          tension: 0.3,
        },
        {
          label: 'Заказы',
          data: stats.series.map((point) => point.orders),
          borderColor: '#6c63ff',
          backgroundColor: '#6c63ff',
          tension: 0.3,
        },
      ],
    };
  }, [stats]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-text-primary">Статистика</h1>
        <div className="flex gap-1 rounded-full border border-border-strong p-1">
          {PERIODS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setPeriod(option.id)}
              className={`focus-ring rounded-full px-3 py-1.5 text-sm font-medium ${
                period === option.id ? 'bg-accent-600 text-accent-contrast' : 'text-text-secondary hover:bg-surface-hover'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      ) : error || !stats ? (
        <ErrorState message="Не удалось загрузить статистику" onRetry={reload} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <p className="text-xs font-semibold uppercase text-text-secondary">Просмотры профиля</p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-text-primary">{stats.viewsCount}</p>
            </Card>
            <Card>
              <p className="text-xs font-semibold uppercase text-text-secondary">Заказов всего</p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-text-primary">{stats.ordersTotal}</p>
            </Card>
            <Card>
              <p className="text-xs font-semibold uppercase text-text-secondary">Средний чек</p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-text-primary">{formatPrice(stats.averageCheck)}</p>
            </Card>
            <Card>
              <p className="text-xs font-semibold uppercase text-text-secondary">Конверсия</p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-text-primary">{(stats.conversionRate * 100).toFixed(1)}%</p>
            </Card>
          </div>

          <Card>
            <h2 className="mb-4 text-lg font-semibold text-text-primary">Заказы по статусам</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-strong text-left text-xs uppercase tracking-wide text-text-secondary">
                  <th className="py-2">Статус</th>
                  <th className="py-2 text-right">Количество</th>
                </tr>
              </thead>
              <tbody>
                {ORDER_STATUSES.map((s) => (
                  <tr key={s} className="border-b border-border">
                    <td className="py-2 text-text-primary">{orderStatusLabel(s)}</td>
                    <td className="py-2 text-right tabular-nums text-text-primary">{stats.ordersByStatus[s] ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card>
            <h2 className="mb-4 text-lg font-semibold text-text-primary">Динамика за период</h2>
            {!chartData || stats.series.length === 0 || stats.viewsCount + stats.ordersTotal === 0 ? (
              <p className="py-8 text-center text-sm text-text-secondary">
                Как только появятся заказы и просмотры, здесь появится график
              </p>
            ) : (
              <div className="h-64 w-full">
                <Line
                  data={chartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148,163,184,0.15)' } },
                      y: { ticks: { color: '#94a3b8', precision: 0 }, grid: { color: 'rgba(148,163,184,0.15)' } },
                    },
                    plugins: { legend: { labels: { color: '#94a3b8' } } },
                  }}
                />
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
