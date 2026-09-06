/**
 * Локальный генератор текста по отрасли и тону (F3).
 *
 * Никаких сетевых вызовов, никаких внешних ИИ-сервисов — весь текст
 * собирается из статических фразовых банков ниже. Правило
 * детерминизма (docs/04-architecture.md §4.3): один и тот же
 * `(type, industry, tone, seed)` обязан всегда возвращать один и тот
 * же результат. Вариативность («не Lorem ipsum, а несколько живых
 * вариантов») достигается посевным псевдослучайным выбором варианта
 * фразы — индекс варианта считается хэшем строки `seed`, а не
 * `Math.random()`.
 *
 * Архитектура словаря: вместо 7×4×10 = 280 полностью независимых
 * заготовок (что было бы огромным и трудноподдерживаемым дублированием)
 * контент разложен на две ортогональные оси:
 *  - `INDUSTRY_CONTENT` — что рассказать (факты и лексика отрасли:
 *    услуги, преимущества, тарифы, отзывы, подписи галереи);
 *  - `TONE_VOICE` — как это сказать (заголовки-шаблоны, интонация,
 *    призывы к действию под 4 тона).
 * Комбинация даёт связный, отраслевой и тонально окрашенный текст на
 * каждую из 280 пар, без потери качества и без 280 строк копипасты.
 */
import type { IndustryId, SectionListItem, SectionType, ToneId } from "../types/project";
import type {
  GenerateSectionContent,
  GeneratedSectionContent,
  GenerateSectionContentInput,
} from "../types/generator";
import { SECTION_LIBRARY } from "./sectionLibrary";
import { createId } from "../lib/id";

/* ===================================================================== */
/* 0. Детерминированный посевной выбор варианта                          */
/* ===================================================================== */

/** Простой некриптографический хэш строки (djb2), стабильный между запусками. */
function hashString(value: string): number {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  return hash >>> 0;
}

/** Детерминированно выбирает элемент массива по seed + соли (тип секции + название слота). */
function pick<T>(items: readonly T[], seed: string, salt: string): T {
  if (items.length === 0) {
    throw new Error(`pick(): пустой список вариантов для соли "${salt}"`);
  }
  const index = hashString(`${seed}::${salt}`) % items.length;
  return items[index];
}

function capitalize(text: string): string {
  if (text.length === 0) return text;
  return text[0].toUpperCase() + text.slice(1);
}

/* ===================================================================== */
/* 1. Ось «что рассказать»: лексика и факты отрасли                      */
/* ===================================================================== */

interface IndustryContent {
  /** Название рода деятельности, ед. число, именительный падеж: «кофейня». */
  noun: string;
  /** Тот же noun в родительном падеже: «кофейни» (для фраз «гости …»). */
  nounGenitive: string;
  /** Как называть посетителей/клиентов: «гостей», «клиентов», «учеников». */
  audience: string;
  /** Короткая фраза-обещание для hero, продолжает «Мы предлагаем …». */
  heroFocus: string;
  /** Список услуг/продуктов (для секции «Услуги»). */
  services: readonly string[];
  /** Список причин выбрать именно вас (для секции «Преимущества»). */
  features: readonly string[];
  /** Тарифные планы (название + примерная цена, для секции «Тарифы»). */
  pricingPlans: readonly { name: string; price: string }[];
  /** Условные авторы отзывов (для секции «Отзывы»). */
  testimonialAuthors: readonly { name: string; role: string }[];
  /** Смысловые «ядра» отзывов — их оборачивает тон в кавычки/интонацию. */
  testimonialFocus: readonly string[];
  /** Подписи плиток галереи-плейсхолдера. */
  galleryCaptions: readonly string[];
  /** Факт о том, как связаться (для секции «Контакты»). */
  contactsNote: string;
}

const INDUSTRY_CONTENT: Readonly<Record<IndustryId, IndustryContent>> = {
  cafe: {
    noun: "кофейня",
    nounGenitive: "кофейни",
    audience: "гостей",
    heroFocus: "свежую обжарку, домашнюю выпечку и атмосферу, в которую хочется возвращаться",
    services: [
      "Кофе на зерне собственной обжарки",
      "Завтраки и бранчи весь день",
      "Десерты и выпечка ручной работы",
      "Обеды из сезонных продуктов",
      "Кофе с собой и подписка на зёрна",
      "Банкетное обслуживание и кейтеринг",
    ],
    features: [
      "Обжариваем зерно сами и обновляем меню каждый сезон",
      "Готовим из свежих продуктов от локальных поставщиков",
      "Уютный зал и терраса на любую погоду",
      "Бариста, которые помнят ваш любимый заказ",
      "Бесплатный Wi-Fi и розетки за каждым столиком",
    ],
    pricingPlans: [
      { name: "Кофе-пауза", price: "от 250 ₽" },
      { name: "Бизнес-ланч", price: "от 450 ₽" },
      { name: "Банкет под ключ", price: "по расчёту" },
    ],
    testimonialAuthors: [
      { name: "Анна", role: "постоянная гостья" },
      { name: "Дмитрий", role: "фрилансер" },
      { name: "Мария", role: "молодая мама" },
    ],
    testimonialFocus: [
      "лучший флэт уайт в районе, а завтраки — отдельная любовь",
      "тут действительно вкусно и по-домашнему, без пафоса",
      "прихожу поработать с ноутбуком и остаюсь на обед",
    ],
    galleryCaptions: ["Зал кофейни", "Барная стойка", "Летняя терраса", "Витрина с десертами"],
    contactsNote: "Заходите на чашку кофе или бронируйте столик заранее — ответим быстро.",
  },
  it: {
    noun: "студия разработки",
    nounGenitive: "студии",
    audience: "клиентов",
    heroFocus: "проектируем, разрабатываем и поддерживаем digital-продукты под ключ",
    services: [
      "Веб- и мобильная разработка",
      "Дизайн интерфейсов и UX-исследования",
      "Интеграция с CRM и внешними API",
      "Поддержка и техническое сопровождение",
      "Аудит и оптимизация производительности",
      "Автоматизация бизнес-процессов",
    ],
    features: [
      "Выделенная команда с опытом именно в вашей отрасли",
      "Прозрачные спринты и еженедельные демо",
      "Пишем тесты и документацию, а не только код",
      "Поддержка на связи и после запуска проекта",
      "Держим сроки и бюджет, о которых договорились",
    ],
    pricingPlans: [
      { name: "Старт", price: "от 90 000 ₽" },
      { name: "Рост", price: "от 250 000 ₽" },
      { name: "Энтерпрайз", price: "по запросу" },
    ],
    testimonialAuthors: [
      { name: "Игорь", role: "CTO стартапа" },
      { name: "Елена", role: "продукт-менеджер" },
      { name: "Сергей", role: "основатель компании" },
    ],
    testimonialFocus: [
      "запустили рабочий прототип за шесть недель",
      "команда вникла в продукт лучше, чем мы сами",
      "получили не просто код, а работающий бизнес-результат",
    ],
    galleryCaptions: [
      "Рабочее пространство команды",
      "Доска со спринтом",
      "Демонстрация продукта",
      "Код-ревью",
    ],
    contactsNote: "Опишите задачу — вернёмся с оценкой сроков и бюджета в течение дня.",
  },
  beauty: {
    noun: "студия красоты",
    nounGenitive: "студии",
    audience: "клиентов",
    heroFocus: "уход, стрижки и процедуры, после которых хочется чаще смотреться в зеркало",
    services: [
      "Стрижки и укладки",
      "Окрашивание и уход за волосами",
      "Маникюр и педикюр",
      "Косметология лица",
      "Массаж и SPA-программы",
      "Оформление бровей и ресниц",
    ],
    features: [
      "Мастера с сертификатами и регулярным обучением",
      "Профессиональная косметика премиум-класса",
      "Индивидуальный подбор процедур под вашу задачу",
      "Стерильность и одноразовые расходные материалы",
      "Уютная атмосфера без спешки и очередей",
    ],
    pricingPlans: [
      { name: "Экспресс-уход", price: "от 900 ₽" },
      { name: "День красоты", price: "от 4 500 ₽" },
      { name: "Абонемент на месяц", price: "от 7 900 ₽" },
    ],
    testimonialAuthors: [
      { name: "Ольга", role: "постоянная клиентка" },
      { name: "Виктория", role: "невеста" },
      { name: "Наталья", role: "клиентка" },
    ],
    testimonialFocus: [
      "впервые ушла из салона довольной с первого раза",
      "мастера правда слушают, а не делают по шаблону",
      "результат держится неделями, а не пару дней",
    ],
    galleryCaptions: ["Зал студии", "Рабочее место мастера", "Зона отдыха", "Витрина с косметикой"],
    contactsNote: "Запишитесь онлайн или по телефону — подберём удобное время визита.",
  },
  shop: {
    noun: "магазин",
    nounGenitive: "магазина",
    audience: "покупателей",
    heroFocus: "товары с быстрой доставкой и честным описанием каждой позиции",
    services: [
      "Доставка по городу и по России",
      "Примерка и лёгкий возврат",
      "Персональные подборки товаров",
      "Программа лояльности и бонусы",
      "Оптовые заказы для бизнеса",
      "Подарочные сертификаты",
    ],
    features: [
      "Проверяем каждый товар перед отправкой",
      "Доставка от одного дня по городу",
      "Поддержка на связи в чате каждый день",
      "Прозрачные цены без скрытых наценок",
      "Удобный возврат в течение 14 дней",
    ],
    pricingPlans: [
      { name: "Стандартная доставка", price: "от 3 000 ₽ — бесплатно" },
      { name: "Экспресс-доставка", price: "от 350 ₽" },
      { name: "Оптовый заказ", price: "по запросу" },
    ],
    testimonialAuthors: [
      { name: "Кристина", role: "постоянная покупательница" },
      { name: "Павел", role: "оптовый клиент" },
      { name: "Юлия", role: "покупательница" },
    ],
    testimonialFocus: [
      "заказ пришёл на следующий день и точно как на фото",
      "работаем с ними оптом уже второй год подряд",
      "служба поддержки решила вопрос за пять минут",
    ],
    galleryCaptions: ["Витрина магазина", "Упаковка заказов", "Новая коллекция", "Склад товаров"],
    contactsNote: "Есть вопрос по заказу? Напишите нам — ответим в течение часа.",
  },
  consulting: {
    noun: "консалтинговая команда",
    nounGenitive: "команды",
    audience: "клиентов",
    heroFocus: "экспертизу и практичные решения для роста вашего бизнеса",
    services: [
      "Стратегический консалтинг",
      "Финансовый и налоговый аудит",
      "Юридическое сопровождение сделок",
      "Оптимизация бизнес-процессов",
      "Due diligence и сопровождение сделок",
      "Обучение и корпоративные тренинги",
    ],
    features: [
      "Более десяти лет практики в отрасли",
      "Персональный куратор на весь проект",
      "Решения, подкреплённые цифрами, а не догадками",
      "Конфиденциальность и защита данных клиента",
      "Понятная отчётность на каждом этапе работы",
    ],
    pricingPlans: [
      { name: "Консультация", price: "от 5 000 ₽" },
      { name: "Проектное сопровождение", price: "от 60 000 ₽" },
      { name: "Абонентское обслуживание", price: "от 30 000 ₽/мес" },
    ],
    testimonialAuthors: [
      { name: "Роман", role: "генеральный директор" },
      { name: "Татьяна", role: "финансовый директор" },
      { name: "Алексей", role: "собственник бизнеса" },
    ],
    testimonialFocus: [
      "нашли способ сократить издержки уже в первый месяц",
      "объяснили сложные вещи простым языком",
      "довели сделку до конца без единой задержки",
    ],
    galleryCaptions: ["Рабочая встреча", "Стратегическая сессия", "Презентация отчёта", "Офис команды"],
    contactsNote: "Расскажите о задаче — предложим формат сотрудничества в течение дня.",
  },
  education: {
    noun: "образовательный центр",
    nounGenitive: "центра",
    audience: "учеников",
    heroFocus: "программы, после которых знания превращаются в реальный результат",
    services: [
      "Курсы для начинающих и продолжающих",
      "Индивидуальные занятия с преподавателем",
      "Подготовка к экзаменам и олимпиадам",
      "Корпоративное обучение для команд",
      "Онлайн- и офлайн-формат занятий",
      "Практикумы и проектная работа",
    ],
    features: [
      "Программы обновляются вместе с отраслью",
      "Небольшие группы и внимание к каждому ученику",
      "Преподаватели-практики с реальным опытом",
      "Обратная связь после каждого занятия",
      "Гибкое расписание и перенос занятий",
    ],
    pricingPlans: [
      { name: "Разовое занятие", price: "от 1 200 ₽" },
      { name: "Курс на месяц", price: "от 8 900 ₽" },
      { name: "Индивидуальная программа", price: "по запросу" },
    ],
    testimonialAuthors: [
      { name: "Светлана", role: "родитель ученика" },
      { name: "Артём", role: "студент курса" },
      { name: "Инна", role: "выпускница программы" },
    ],
    testimonialFocus: [
      "результат стал заметен уже через месяц занятий",
      "объясняют так, что действительно понимаешь тему",
      "сдал экзамен с первой попытки",
    ],
    galleryCaptions: [
      "Занятие в классе",
      "Онлайн-урок",
      "Проектная работа учеников",
      "Выпускной курса",
    ],
    contactsNote: "Запишитесь на пробное занятие — поможем выбрать подходящую программу.",
  },
  other: {
    noun: "команда",
    nounGenitive: "команды",
    audience: "клиентов",
    heroFocus: "продукт или услугу, ради которой к вам возвращаются снова",
    services: [
      "Консультация и подбор решения",
      "Индивидуальный подход к каждому проекту",
      "Быстрый старт работы",
      "Сопровождение на всех этапах",
      "Гибкие условия сотрудничества",
      "Поддержка после запуска",
    ],
    features: [
      "Внимательно слушаем задачу, а не подгоняем под шаблон",
      "Держим сроки и держим слово",
      "Прозрачные условия без мелкого шрифта",
      "Быстро выходим на связь",
      "Заботимся о результате, а не о процессе ради процесса",
    ],
    pricingPlans: [
      { name: "Базовый", price: "от 2 000 ₽" },
      { name: "Расширенный", price: "от 8 000 ₽" },
      { name: "Индивидуальный", price: "по запросу" },
    ],
    testimonialAuthors: [
      { name: "Екатерина", role: "клиентка" },
      { name: "Максим", role: "партнёр" },
      { name: "Ирина", role: "клиентка" },
    ],
    testimonialFocus: [
      "получили именно то, что нужно, без лишних вопросов",
      "приятно иметь дело с командой, которая держит слово",
      "рекомендуем всем, кто ценит своё время",
    ],
    galleryCaptions: ["Команда за работой", "Рабочий процесс", "Результат проекта", "Встреча с клиентом"],
    contactsNote: "Напишите нам — расскажем, как можем помочь именно вам.",
  },
};

/* ===================================================================== */
/* 2. Ось «как сказать»: голос тона                                      */
/* ===================================================================== */

interface ToneVoice {
  heroTitle: (i: IndustryContent) => readonly string[];
  heroBody: (i: IndustryContent) => readonly string[];
  heroCta: readonly string[];
  aboutTitle: readonly string[];
  aboutBody: (i: IndustryContent) => readonly string[];
  servicesTitle: readonly string[];
  servicesBody: (i: IndustryContent) => readonly string[];
  featuresTitle: readonly string[];
  featuresBody: (i: IndustryContent) => readonly string[];
  pricingTitle: readonly string[];
  pricingBody: (i: IndustryContent) => readonly string[];
  testimonialsTitle: readonly string[];
  galleryTitle: readonly string[];
  galleryBody: (i: IndustryContent) => readonly string[];
  ctaTitle: (i: IndustryContent) => readonly string[];
  ctaBody: (i: IndustryContent) => readonly string[];
  ctaButton: readonly string[];
  contactsTitle: readonly string[];
  contactsBody: (i: IndustryContent) => readonly string[];
  footerTitle: (i: IndustryContent) => readonly string[];
  footerBody: readonly string[];
  quoteWrap: (focus: string) => string;
}

const TONE_VOICE: Readonly<Record<ToneId, ToneVoice>> = {
  formal: {
    heroTitle: (i) => [
      `${capitalize(i.noun)}, которой доверяют ${i.audience}`,
      `${capitalize(i.noun)} с профессиональным подходом к делу`,
    ],
    heroBody: (i) => [
      `Мы предлагаем ${i.heroFocus}. Работаем аккуратно и системно, чтобы результат оправдывал ожидания.`,
      `Предоставляем ${i.heroFocus}. Каждый этап работы прозрачен и подтверждён репутацией.`,
    ],
    heroCta: ["Оставить заявку", "Узнать подробнее"],
    aboutTitle: ["О компании", "Кто мы"],
    aboutBody: (i) => [
      `Мы — ${i.noun}, которая ценит точность и ответственность в каждой детали. Наша цель — стабильный результат, а не разовое впечатление.`,
      `Наша ${i.nounGenitive} команда придерживается высоких профессиональных стандартов и работает на долгосрочное доверие ${i.audience}.`,
    ],
    servicesTitle: ["Услуги", "Что мы предлагаем"],
    servicesBody: (i) => [
      `Полный перечень услуг ${i.nounGenitive} — от первичной консультации до сопровождения результата.`,
      `Мы формируем предложение индивидуально, но вот основные направления работы ${i.nounGenitive}.`,
    ],
    featuresTitle: ["Наши преимущества", "Почему выбирают нас"],
    featuresBody: (i) => [
      `${i.audience === "клиентов" ? "Клиенты" : capitalize(i.audience)} выбирают нас за системный подход и предсказуемый результат.`,
      `Мы придерживаемся следующих принципов работы.`,
    ],
    pricingTitle: ["Тарифы", "Стоимость услуг"],
    pricingBody: () => [
      `Стоимость определяется объёмом задачи; ниже — ориентировочные условия сотрудничества.`,
      `Прозрачное ценообразование без скрытых платежей.`,
    ],
    testimonialsTitle: ["Отзывы клиентов", "Что говорят клиенты"],
    galleryTitle: ["Галерея", "Фотографии"],
    galleryBody: () => [
      `Несколько кадров, отражающих характер нашей работы.`,
      `Визуальное представление о том, как мы работаем.`,
    ],
    ctaTitle: (i) => [
      `Готовы обсудить сотрудничество с ${i.nounGenitive}?`,
      `Свяжитесь с нами, чтобы обсудить задачу`,
    ],
    ctaBody: (i) => [
      `Оставьте заявку — мы свяжемся с вами и предложим оптимальное решение для ${i.audience}.`,
      `Опишите вашу задачу, и мы подготовим предложение в течение рабочего дня.`,
    ],
    ctaButton: ["Оставить заявку", "Записаться на консультацию"],
    contactsTitle: ["Контакты", "Как с нами связаться"],
    contactsBody: (i) => [`${i.contactsNote} Работаем строго по предварительной договорённости.`],
    footerTitle: (i) => [`${capitalize(i.noun)}`],
    footerBody: [
      "Все права защищены. Информация на сайте носит ознакомительный характер.",
    ],
    quoteWrap: (focus) => `Отмечу, что ${focus}.`,
  },
  friendly: {
    heroTitle: (i) => [
      `${capitalize(i.noun)}, где рады каждому`,
      `Добро пожаловать в нашу ${i.noun.includes("команда") ? "команду" : i.noun}`,
    ],
    heroBody: (i) => [
      `Мы дарим ${i.audience === "гостей" ? "гостям" : i.audience} ${i.heroFocus}. Заходите — расскажем и покажем всё сами.`,
      `У нас можно получить ${i.heroFocus}, а заодно и хорошее настроение от общения с командой.`,
    ],
    heroCta: ["Давайте познакомимся", "Написать нам"],
    aboutTitle: ["О нас", "Немного о нас"],
    aboutBody: (i) => [
      `Мы — небольшая ${i.noun}, для которой ${i.audience} — не просто клиенты, а хорошие знакомые. Стараемся, чтобы каждому было тепло и удобно.`,
      `Наша ${i.nounGenitive} команда собралась вокруг общей идеи — делать своё дело с душой и вниманием к деталям.`,
    ],
    servicesTitle: ["Чем мы можем помочь", "Наши услуги"],
    servicesBody: () => [
      `Вот чем мы обычно радуем — выбирайте то, что откликается именно вам.`,
      `Собрали для вас самое популярное — если нужного нет в списке, просто спросите.`,
    ],
    featuresTitle: ["Почему с нами хорошо", "Что вам понравится"],
    featuresBody: () => [
      `Немного о том, почему к нам возвращаются снова и снова.`,
      `Вот что делает нас теми, кого рекомендуют друзьям.`,
    ],
    pricingTitle: ["Цены без сюрпризов", "Сколько это стоит"],
    pricingBody: () => [
      `Ничего не скрываем — вот честные цены на самое популярное.`,
      `Выбирайте вариант под настроение и бюджет.`,
    ],
    testimonialsTitle: ["Что говорят о нас", "Отзывы"],
    galleryTitle: ["Загляните к нам", "Немного атмосферы"],
    galleryBody: () => [
      `Небольшая подборка того, как у нас всё устроено.`,
      `Покажем немного закулисья — заходите, у нас уютно.`,
    ],
    ctaTitle: (i) => [
      `Заглянете к нам?`,
      `Будем рады видеть вас в числе наших ${i.audience}`,
    ],
    ctaBody: () => [
      `Напишите пару слов о том, что вам нужно, — ответим по-дружески быстро.`,
      `Не стесняйтесь спрашивать — мы всегда на связи и рады новым знакомствам.`,
    ],
    ctaButton: ["Написать нам", "Присоединиться к нам"],
    contactsTitle: ["Будем на связи", "Контакты"],
    contactsBody: (i) => [`${i.contactsNote} Пишите в любое время — обязательно ответим.`],
    footerTitle: (i) => [`${capitalize(i.noun)} — рады, что вы заглянули`],
    footerBody: ["Сделано с теплом. Если что — мы всегда рядом."],
    quoteWrap: (focus) => `${capitalize(focus)} — очень рекомендую!`,
  },
  bold: {
    heroTitle: (i) => [
      `${capitalize(i.noun)}, которая меняет правила`,
      `Мы не как все — и это чувствуется`,
    ],
    heroBody: (i) => [
      `Даём ${i.heroFocus}. Без компромиссов и без «как у всех».`,
      `${capitalize(i.heroFocus)} — вот наш стандарт. Остальное можно даже не сравнивать.`,
    ],
    heroCta: ["Начать прямо сейчас", "Погнали!"],
    aboutTitle: ["Мы не как все", "О команде"],
    aboutBody: (i) => [
      `Мы — ${i.noun}, которая устала от скучных стандартов индустрии и решила делать по-своему. Результат говорит сам за себя.`,
      `Никакой воды и шаблонов: наша ${i.nounGenitive} команда работает на результат, а не на видимость процесса.`,
    ],
    servicesTitle: ["Что мы делаем", "Наши фишки"],
    servicesBody: () => [
      `Коротко — то, в чём мы реально сильны.`,
      `Никакой воды. Только то, что реально работает.`,
    ],
    featuresTitle: ["Почему мы, а не конкуренты", "Наши козыри"],
    featuresBody: () => [
      `Вот почему сравнивать с остальными даже не имеет смысла.`,
      `Коротко о том, чем мы бьём конкурентов.`,
    ],
    pricingTitle: ["Тарифы без воды", "Цены"],
    pricingBody: () => [
      `Честные цены, никаких мелких звёздочек и скрытых условий.`,
      `Платите за результат, а не за красивые слова.`,
    ],
    testimonialsTitle: ["Нам не верят на слово — вот отзывы", "Отзывы"],
    galleryTitle: ["Смотрите сами", "Галерея"],
    galleryBody: () => [
      `Слова тут лишние — просто смотрите.`,
      `Пара кадров вместо тысячи обещаний.`,
    ],
    ctaTitle: () => [`Хватит сомневаться`, `Пора действовать`],
    ctaBody: (i) => [
      `Присоединяйтесь к ${i.audience}, которые уже не тратят время на посредственность.`,
      `Одно сообщение — и процесс запущен. Никаких долгих согласований.`,
    ],
    ctaButton: ["Начать прямо сейчас", "Забронировать место"],
    contactsTitle: ["Пишите, звоните, заходите", "Контакты"],
    contactsBody: (i) => [`${i.contactsNote} Долго думать не в нашем стиле — как и в вашем, наверное.`],
    footerTitle: (i) => [`${capitalize(i.noun)} — без компромиссов`],
    footerBody: ["Все права защищены. Слабонервным читать необязательно."],
    quoteWrap: (focus) => `${capitalize(focus)}!`,
  },
  minimal: {
    heroTitle: (i) => [`${capitalize(i.noun)}`, `Просто. По делу.`],
    heroBody: (i) => [`${capitalize(i.heroFocus)}.`, `Даём ${i.heroFocus}.`],
    heroCta: ["Подробнее", "Связаться"],
    aboutTitle: ["О нас", "Коротко о нас"],
    aboutBody: (i) => [
      `Мы — ${i.noun}. Работаем чётко и без лишних слов.`,
      `${capitalize(i.noun)} для тех, кто ценит простоту и ясность.`,
    ],
    servicesTitle: ["Услуги", "Что делаем"],
    servicesBody: () => [`Основные направления работы.`, `Что мы делаем.`],
    featuresTitle: ["Преимущества", "Почему мы"],
    featuresBody: () => [`Коротко о главном.`, `По существу.`],
    pricingTitle: ["Тарифы", "Цены"],
    pricingBody: () => [`Условия сотрудничества.`, `Стоимость услуг.`],
    testimonialsTitle: ["Отзывы", "Что говорят"],
    galleryTitle: ["Галерея", "Фото"],
    galleryBody: () => [`Несколько кадров.`, `Коротко в фотографиях.`],
    ctaTitle: () => [`Готовы начать?`, `Есть вопрос?`],
    ctaBody: () => [`Напишите нам — ответим по делу.`, `Свяжитесь с нами.`],
    ctaButton: ["Подробнее", "Написать"],
    contactsTitle: ["Контакты", "Связь"],
    contactsBody: (i) => [`${i.contactsNote}`],
    footerTitle: (i) => [`${capitalize(i.noun)}`],
    footerBody: ["Все права защищены."],
    quoteWrap: (focus) => `${capitalize(focus)}.`,
  },
};

/* ===================================================================== */
/* 3. Построение элементов списка                                        */
/* ===================================================================== */

function buildItems(values: readonly string[], max = 8): SectionListItem[] {
  return values.slice(0, max).map((primary) => ({ id: createId(), primary }));
}

function buildPairItems(
  values: readonly { name: string; price: string }[],
  max = 8,
): SectionListItem[] {
  return values.slice(0, max).map(({ name, price }) => ({ id: createId(), primary: name, secondary: price }));
}

function buildTestimonialItems(
  authors: readonly { name: string; role: string }[],
  focuses: readonly string[],
  tone: ToneVoice,
): SectionListItem[] {
  return authors.map((author, index) => {
    const focus = focuses[index % focuses.length];
    const quote = tone.quoteWrap(focus);
    return {
      id: createId(),
      primary: `${author.name}, ${author.role}`,
      secondary: quote,
    };
  });
}

/* ===================================================================== */
/* 4. Сборка контента по типу секции                                     */
/* ===================================================================== */

function buildContent(
  type: SectionType,
  industry: IndustryContent,
  tone: ToneVoice,
  seed: string,
): GeneratedSectionContent {
  switch (type) {
    case "hero":
      return {
        title: pick(tone.heroTitle(industry), seed, "hero.title"),
        body: pick(tone.heroBody(industry), seed, "hero.body"),
        ctaText: pick(tone.heroCta, seed, "hero.cta"),
      };
    case "about":
      return {
        title: pick(tone.aboutTitle, seed, "about.title"),
        body: pick(tone.aboutBody(industry), seed, "about.body"),
      };
    case "services":
      return {
        title: pick(tone.servicesTitle, seed, "services.title"),
        body: pick(tone.servicesBody(industry), seed, "services.body"),
        items: buildItems(industry.services),
      };
    case "features":
      return {
        title: pick(tone.featuresTitle, seed, "features.title"),
        body: pick(tone.featuresBody(industry), seed, "features.body"),
        items: buildItems(industry.features),
      };
    case "pricing":
      return {
        title: pick(tone.pricingTitle, seed, "pricing.title"),
        body: pick(tone.pricingBody(industry), seed, "pricing.body"),
        items: buildPairItems(industry.pricingPlans),
      };
    case "testimonials":
      return {
        title: pick(tone.testimonialsTitle, seed, "testimonials.title"),
        items: buildTestimonialItems(industry.testimonialAuthors, industry.testimonialFocus, tone),
      };
    case "gallery":
      return {
        title: pick(tone.galleryTitle, seed, "gallery.title"),
        body: pick(tone.galleryBody(industry), seed, "gallery.body"),
        items: buildItems(industry.galleryCaptions),
      };
    case "cta":
      return {
        title: pick(tone.ctaTitle(industry), seed, "cta.title"),
        body: pick(tone.ctaBody(industry), seed, "cta.body"),
        ctaText: pick(tone.ctaButton, seed, "cta.button"),
      };
    case "contacts":
      return {
        title: pick(tone.contactsTitle, seed, "contacts.title"),
        body: pick(tone.contactsBody(industry), seed, "contacts.body"),
      };
    case "footer":
      return {
        title: pick(tone.footerTitle(industry), seed, "footer.title"),
        body: pick(tone.footerBody, seed, "footer.body"),
      };
    default: {
      const exhaustive: never = type;
      throw new Error(`Неизвестный тип секции: ${String(exhaustive)}`);
    }
  }
}

/**
 * Генерирует текст одной секции по словарю отрасли+тона (F3). Чистая
 * функция — при одинаковом входе (включая `seed = project.id`) всегда
 * возвращает одинаковый результат.
 */
export const generateSectionContent: GenerateSectionContent = (
  input: GenerateSectionContentInput,
): GeneratedSectionContent => {
  const industry = INDUSTRY_CONTENT[input.industry];
  const tone = TONE_VOICE[input.tone];
  const definition = SECTION_LIBRARY[input.type];
  const raw = buildContent(input.type, industry, tone, input.seed);

  // Оставляем только поля, релевантные типу секции (см. SectionTypeDefinition).
  const result: GeneratedSectionContent = { title: raw.title };
  if (definition.hasBody && raw.body !== undefined) result.body = raw.body;
  if (definition.hasItems && raw.items !== undefined) {
    result.items = raw.items.slice(0, definition.maxItems ?? 8);
  }
  if (definition.hasCtaText && raw.ctaText !== undefined) result.ctaText = raw.ctaText;
  return result;
};

/** Экспорт словаря отрасли — используется тестами и, при необходимости, UI-подсказками. */
export const INDUSTRY_CONTENT_FOR_TESTS = INDUSTRY_CONTENT;
