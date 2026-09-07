import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Cover3D from '../components/common/Cover3D';
import CitySearchInput from '../components/common/CitySearchInput';
import ScrollReveal from '../components/common/ScrollReveal';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { slugifyCity } from '../lib/utils';

/**
 * Список городов-подсказок для быстрого перехода (не бизнес-данные компаний — навигационные
 * чипсы, ведущие на реальный экран города, который сам загружает компании через API). Список
 * ограничен крупнейшими городами РФ по аналогии с «популярными направлениями» у агрегаторов.
 */
const POPULAR_CITIES = ['Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Казань', 'Нижний Новгород'];

/** `/` — главный экран поиска (F2). */
export default function HomePage() {
  useDocumentMeta({
    title: 'CleanLink — клининговые компании вашего города',
    description: 'Сравнивайте рейтинг, цены и отзывы клининговых компаний и заказывайте уборку в пару кликов.',
  });
  const navigate = useNavigate();

  const goToCity = (city: string) => navigate(`/city/${slugifyCity(city)}`);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10 md:py-16">
      <div className="grid items-center gap-8 md:grid-cols-2">
        <ScrollReveal index={0} className="flex flex-col gap-4">
          <h1 className="text-2xl font-bold text-text-primary md:text-[2.5rem] md:leading-tight">
            Найдите клининговую компанию в своём городе
          </h1>
          <p className="text-base text-text-secondary md:text-lg">
            Сравнивайте рейтинг, цены и отзывы — и закажите уборку в пару кликов
          </p>
        </ScrollReveal>
        <ScrollReveal index={1}>
          <Cover3D className="aspect-video w-full overflow-hidden rounded-xl shadow-lg">
            <div className="flex h-full w-full items-center justify-center" style={{ background: 'var(--gradient-hero)' }}>
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="rounded-full bg-surface/80 px-6 py-3 text-lg font-semibold text-text-primary backdrop-blur"
              >
                CleanLink
              </motion.span>
            </div>
          </Cover3D>
        </ScrollReveal>
      </div>

      <ScrollReveal index={2} className="mx-auto w-full max-w-xl">
        <CitySearchInput onSelectCity={goToCity} />
      </ScrollReveal>

      <ScrollReveal index={3} className="flex flex-col gap-3">
        <h2 className="text-xl font-bold text-text-primary">Популярные города</h2>
        <div className="flex flex-wrap gap-2">
          {POPULAR_CITIES.map((city) => (
            <motion.button
              key={city}
              type="button"
              onClick={() => goToCity(city)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="focus-ring rounded-full border border-border-strong bg-surface px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface-hover"
            >
              {city}
            </motion.button>
          ))}
        </div>
      </ScrollReveal>
    </div>
  );
}
