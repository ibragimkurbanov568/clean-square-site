# Архитектура: NoesDize

Документ описывает стек, структуру папок, внутренние контракты (типы) и
план запуска для локального конструктора одностраничных сайтов
**NoesDize**. Источники: `docs/01-spec.md`, `docs/02-ux.md`,
`docs/03-design-system.md`.

---

## 0. Главное архитектурное решение

**Бэкенда нет вообще.** Всё приложение — статический SPA, который
работает целиком в браузере пользователя. Состояние проектов живёт в
`localStorage` вкладки. Ни один сценарий не делает сетевых запросов
(это прямое требование ТЗ, F3/F7 и «Осознанно вне объёма»).

Следствие: «контракт API» в этом документе — не HTTP-маршруты, а
**внутренние TypeScript-контракты модулей**: форма данных проекта,
сигнатуры генератора текста, сигнатура сборщика HTML-документа,
интерфейс слоя хранения. Эти контракты описаны настолько же строго,
как HTTP-контракт, — они полностью реализованы как файлы типов в
`src/types/**` (см. §4) ещё на этом шаге, чтобы шаг 5 и шаг 6 писали
код параллельно и не разъехались.

**Второе решение — как предпросмотр гарантированно совпадает с
экспортом (F7).** Вместо двух независимых рендереров (один — React-JSX
для предпросмотра, другой — сборка строки HTML для экспорта) в
NoesDize **один** рендерер: чистая функция
`assembleSiteDocument(project, { mode }) → { html, title }`
(контракт — `src/types/render.ts`), которая всегда возвращает полный
самостоятельный HTML-документ с инлайновыми `<style>`/`<script>`.

- Предпросмотр в редакторе — это `<iframe srcDoc={... .html} />` c
  `mode: "preview"`.
- Кнопка «Скачать сайт» берёт тот же вызов с `mode: "export"` и отдаёт
  строку как Blob на скачивание.

Разница между режимами — только в косметике (например, `<meta
name="generator">` можно не добавлять в preview), никогда — в вёрстке,
CSS или JS-эффектах. Это делает «предпросмотр идентичен экспорту»
структурным свойством архитектуры, а не соглашением между двумя
реализациями, которые могут разойтись со временем.

Третье следствие этого решения — переключение темы сайта (F4) не
перерисовывает дерево React вокруг текстового поля, которое редактирует
пользователь (см. «Три сложных момента», п.3 в `02-ux.md`): смена темы
меняет `project.themeId`, который влияет только на CSS внутри
`assembleSiteDocument`; React-состояние формы редактирования секции
живёт отдельно от `<iframe>` и не размонтируется при смене темы.

---

## 1. Стек и обоснование

| Пакет | Версия (закреплена) | Зачем |
| --- | --- | --- |
| `react` | 19.2.8 | UI-библиотека интерфейса редактора; спецификация не требует ничего экзотичнее — «скучный стек побеждает». |
| `react-dom` | 19.2.8 | Рендер React в DOM. |
| `react-router-dom` | 7.18.3 | В UX-спецификации явно 3 реальных URL (`/`, `/new`, `/editor/:id`) и требование «кнопка Назад браузера должна вести себя так же… используя `history`» — это прямое требование клиентского роутинга с историей браузера, а не просто переключение вкладок. |
| `vite` | 7.3.6 | Сборщик и dev-сервер; последний зрелый мажор (не самый свежий v8 — тот вышел недавно и тянет vitest 4/5, которые на момент написания ловят баг резолвера в npm 10.9 при `npm install`; v7 стабилен, широко обкатан). |
| `@vitejs/plugin-react` | 5.2.0 | JSX/Fast Refresh для React в Vite; версия синхронизирована с `vite@^7`. |
| `typescript` | 5.9.3 | Статическая типизация контрактов между шагом 5 и шагом 6. Пин на 5.9, а не на новый нативный компилятор `typescript@7.x` — тот несовместим с `@typescript-eslint` (пакет требует `typescript >=4.8.4 <6.1.0`), то есть сломал бы `npm run lint`. |
| `vitest` | 3.2.7 | Тест-раннер; нативно живёт в конфиге Vite, не нужен отдельный Jest + доп. трансформеры. Зрелый мажор с простым деревом опциональных peer-зависимостей (у `vitest@4/5` — сложное дерево, ловящее баг npm-резолвера в этом окружении). |
| `jsdom` | 30.0.1 | DOM-окружение для тестов компонентов и для тестов `localStorage`-слоя (F8) без реального браузера. |
| `@testing-library/react` | 16.3.3 | Рендер/запросы к React-компонентам в тестах без завязки на детали реализации. |
| `@testing-library/dom` | 10.4.1 | Явный peer `@testing-library/react` (не тянется транзитивно). |
| `@testing-library/jest-dom` | 7.0.1 | Читаемые DOM-матчеры (`toBeVisible`, `toHaveTextContent`) в тестах. |
| `eslint` | 10.10.0 | Статическая проверка кода; свежий, но уже поддерживаемый мажор (9.x на момент пина помечен «no longer supported»). |
| `typescript-eslint` | 8.69.0 | Мета-пакет (parser + plugin) для проверки TS-файлов, один пакет вместо двух отдельных. |
| `@eslint/js` | 10.0.1 | Базовый набор `eslint:recommended` для flat config. |
| `eslint-plugin-react-hooks` | 7.1.1 | Ловит нарушения правил хуков — критично для требования «поле ввода не должно размонтироваться/терять состояние» (F5, «Три сложных момента»). |
| `eslint-plugin-react-refresh` | 0.5.6 | Гарантирует, что файлы совместимы с Fast Refresh (только компоненты как экспорт). |
| `@types/react`, `@types/react-dom` | 19.2.18 / 19.2.7 | Типы React, обязательны при `strict: true`. |

**Осознанно не добавлено:**
- `uuid` — не нужен, есть нативный `crypto.randomUUID()` в браузере (Baseline, поддерживается везде, где работает остальной стек).
- `redux`/`zustand`/другой стейт-менеджер — состояние одного `Project` и UI-флагов помещается в `useState`/`useReducer` + Context; лишний пакет ради архитектурной моды не оправдан ТЗ.
- `styled-components`/CSS-in-JS — дизайн-система уже отдана как чистый CSS (`tokens.css`, `site-themes.css`) с двумя пространствами имён переменных; добавлять рантайм CSS-in-JS поверх готовой токен-системы избыточно.
- `date-fns`/`dayjs` — единственное форматирование дат («Изменено 6 сент 2026, 14:32») делается через встроенный `Intl.DateTimeFormat`.
- Playwright — в ТЗ нет отдельных e2e-сценариев поверх ручной проверки по чек-листу (F1–F8 проверяются вручную по критериям приёмки); если QA-агент (шаг 8) решит, что e2e нужен, он добавит Playwright точечно на своём шаге, не расширяя стек заранее «на всякий случай».

**Известный нюанс окружения:** в этом окружении `npm install` для
`vitest@^4` (и `vite@^8`) падает с ошибкой arborist `Cannot read
properties of null (reading 'edgesOut')` — это баг резолвера npm
10.9.7 на сложном дереве опциональных peer-зависимостей vitest
(`msw`, `@vitest/browser-playwright` и т.д.), а не проблема этого
проекта. Закреплённые версии (`vite@7.3.6` + `vitest@3.2.7`)
проверены — `npm install` проходит без флагов и без предупреждений.

---

## 2. Дерево папок

```
clean-square-site/
├── docs/
│   ├── 01-spec.md            ТЗ (шаг 1)
│   ├── 02-ux.md               UX-спецификация (шаг 2)
│   ├── 03-design-system.md    дизайн-токены (шаг 3)
│   └── 04-architecture.md     этот файл (шаг 4)
├── index.html                 точка входа Vite
├── package.json
├── tsconfig.json               solution-файл (references)
├── tsconfig.app.json            конфиг для src/**
├── tsconfig.node.json           конфиг для vite.config.ts
├── vite.config.ts               Vite + Vitest конфиг в одном месте
├── eslint.config.js             flat config ESLint
├── .env.example                 пусто по сути: нет обязательных переменных
├── .gitignore
└── src/
    ├── main.tsx                 точка монтирования React, импортирует токены CSS
    ├── App.tsx                  роутинг: "/", "/new", "/editor/:id"
    ├── App.test.tsx             smoke-тест (App рендерится)
    ├── vite-env.d.ts             typings Vite (import.meta.env)
    │
    ├── types/                    ЧИСТЫЕ ТИПЫ. Ноль логики, ноль импортов React.
    │   ├── project.ts            Project, Section, SectionListItem, enum-ы
    │   ├── theme.ts               Theme, ThemePalette, ThemeFonts
    │   ├── generator.ts           словари F1/F2 + сигнатуры генератора F3
    │   ├── render.ts              контракт сборки HTML-документа (F5/F6/F7)
    │   ├── storage.ts             контракт ProjectStore (F8)
    │   └── index.ts               барель-реэкспорт
    │
    ├── content/                   ШАГ 5. Статические словари и данные.
    │   ├── industries.ts          (создаёт шаг 5) 7 отраслей
    │   ├── tones.ts                (создаёт шаг 5) 4 тона
    │   ├── themes.ts               (создаёт шаг 5) 6 тем — HEX-снимок site-themes.css
    │   ├── sectionLibrary.ts       (создаёт шаг 5) 10 типов секций для F2
    │   └── textGenerator.ts        (создаёт шаг 5) фразовые банки + генератор F3
    │
    ├── lib/                       ШАГ 5. Чистые функции, без React.
    │   ├── id.ts                   (создаёт шаг 5) crypto.randomUUID + slugify
    │   ├── projectFactory.ts       (создаёт шаг 5) createProject, addSection,
    │   │                            removeSection, reorderSections, regenerate…
    │   ├── sectionRenderers.ts     (создаёт шаг 5) SectionRendererRegistry (HTML-строки)
    │   ├── pageAssembler.ts        (создаёт шаг 5) assembleSiteDocument
    │   ├── htmlExporter.ts         (создаёт шаг 5) exportProjectToHtml + имя файла
    │   └── storage.ts              (создаёт шаг 5) ProjectStore поверх localStorage
    │
    ├── routes/                    ШАГ 6 (заглушки — шаг 4). Экраны-маршруты.
    │   ├── StartScreen.tsx         "/" — список проектов
    │   ├── WizardScreen.tsx        "/new" — мастер создания
    │   └── EditorScreen.tsx        "/editor/:id" — редактор + предпросмотр
    │
    ├── components/                ШАГ 6 (создаёт шаг 6). UI-компоненты редактора:
    │                               SectionListPanel, SectionEditForm,
    │                               SectionLibraryDialog, ConfirmDialog,
    │                               ThemePicker, EffectsToggle, ViewportSwitch,
    │                               PreviewFrame (обёртка над <iframe>), Toast,
    │                               AutosaveIndicator, ProjectCard и т.д.
    │
    ├── hooks/                     ШАГ 6 (создаёт шаг 6). useAutosave,
    │                               useDebouncedValue, useReducedMotion,
    │                               useProjectStore и т.д.
    │
    ├── styles/
    │   ├── tokens.css              готово (шаг 3) — --nd-*, НЕ ТРОГАТЬ
    │   ├── site-themes.css         готово (шаг 3) — --site-*, НЕ ТРОГАТЬ
    │   └── app.css                  (опционально создаёт шаг 6) доп. стили chrome
    │
    └── test/
        └── setup.ts                общий Vitest setup (jest-dom + matchMedia mock)
```

### 2.1 Таблица «файл/папка — чей шаг»

| Путь | Кто создаёт/владеет | Комментарий |
| --- | --- | --- |
| `docs/04-architecture.md` | шаг 4 (этот) | — |
| `package.json`, `tsconfig*.json`, `vite.config.ts`, `eslint.config.js`, `.gitignore`, `.env.example`, `index.html` | шаг 4 | инфраструктура; шаг 5/6 не трогают, кроме добавления зависимостей через отдельный явный запрос |
| `src/main.tsx`, `src/App.tsx`, `src/vite-env.d.ts` | шаг 4 (каркас) | шаг 6 может расширить `App.tsx` провайдерами/layout, не меняя сам список 3 маршрутов |
| `src/types/**` | шаг 4, полностью | контракт; после начала параллельной работы шага 5/6 меняется только по согласованию — это худшее место для рассинхрона |
| `src/routes/*.tsx` | шаг 4 создаёт заглушки → **шаг 6** наполняет | зона фронтенда |
| `src/components/**`, `src/hooks/**` | **шаг 6**, полностью | зона фронтенда, ноль обращений к `localStorage` напрямую — только через `ProjectStore` |
| `src/content/**`, `src/lib/**` | **шаг 5**, полностью | зона бэкенда/логики, ноль импортов `react`/`react-dom` |
| `src/styles/tokens.css`, `src/styles/site-themes.css` | шаг 3, НЕ ТРОГАТЬ | уже готовы |
| `src/styles/app.css` | шаг 6 (по необходимости) | доп. стили chrome поверх токенов |
| `src/test/setup.ts` | шаг 4 | общая инфраструктура тестов, оба шага 5/6 пишут `*.test.ts(x)` рядом со своими файлами |

**Граница шаг 5 ↔ шаг 6.** Разделение файлов проведено так, что оба
агента работают параллельно без конфликтов слияния:
- Шаг 5 не создаёт `.tsx`-файлов и не импортирует `react`.
- Шаг 6 не пишет бизнес-логику генерации/валидации/экспорта заново —
  только вызывает функции из `src/lib/**` и `src/content/**` по их
  типовым контрактам из `src/types/**`.
- Единственная точка соприкосновения — импорт типов и функций одним
  направлением (шаг 6 импортирует из шага 5, никогда наоборот).

---

## 3. Карта функций ТЗ → модуль

| Функция | Реализующий модуль |
| --- | --- |
| F1 Мастер создания проекта | `src/routes/WizardScreen.tsx` (форма, шаг 6) вызывает `CreateProject` из `src/lib/projectFactory.ts` (шаг 5), сохраняет через `ProjectStore.saveProject` (`src/lib/storage.ts`). |
| F2 Библиотека блоков и управление секциями | `src/content/sectionLibrary.ts` (10 определений типов, шаг 5) + `src/components/SectionLibraryDialog.tsx`, `SectionListPanel.tsx` (шаг 6) + `CreateSectionOfType`/`removeSection`/`reorderSections` в `src/lib/projectFactory.ts` (шаг 5). |
| F3 Локальная генерация текста | `src/content/textGenerator.ts` (фразовые банки, шаг 5), сигнатуры `GenerateSectionContent`/`RegenerateProjectTexts` в `src/types/generator.ts` (шаг 4), вызов из `src/routes/EditorScreen.tsx`/панели «Настройки» (шаг 6). |
| F4 Темы оформления | `src/content/themes.ts` (данные тем, шаг 5) + CSS `src/styles/site-themes.css` (готово) + `src/components/ThemePicker.tsx` (шаг 6), применяется сменой `project.themeId`, который читает `assembleSiteDocument`. |
| F5 Живой предпросмотр с адаптивностью | `src/lib/pageAssembler.ts` (`assembleSiteDocument`, шаг 5) + `src/components/PreviewFrame.tsx` (`<iframe srcDoc>`, масштабирование по viewport, шаг 6). |
| F6 Визуальные эффекты + reduced motion | CSS/JS внутри `assembleSiteDocument` (`src/lib/pageAssembler.ts`, шаг 5, включая `@media (prefers-reduced-motion: reduce)` в самом сгенерированном документе) + тумблер `EffectsToggle.tsx` и текст-пояснение про системную настройку (шаг 6, через `window.matchMedia` на уровне React только для текста-подсказки, не для самого рендера сайта). |
| F7 Экспорт в HTML-файл | `src/lib/htmlExporter.ts` (`exportProjectToHtml`, шаг 5) + кнопка «Скачать сайт» (`Blob`/`<a download>`, шаг 6), проверка «есть видимая Hero» — на уровне UI перед вызовом. |
| F8 Сохранение и список проектов | `src/lib/storage.ts` (`ProjectStore`, шаг 5) + `useAutosave`/`useProjectStore` хуки и `StartScreen.tsx` (шаг 6). |

---

## 4. Внутренние контракты (дословно из кода)

Полный, актуальный текст контрактов — в самих файлах (это единственный
источник истины; здесь — навигация и краткое пояснение, не копия
целиком, чтобы документ не расходился с кодом).

### 4.1 `src/types/project.ts` — модель данных

Ключевые типы: `ToneId`, `IndustryId`, `ThemeId`, `ViewportMode`,
`SectionType`, `SectionListItem`, `Section`, `Project`,
`PROJECT_DEFAULTS`.

```ts
export type ToneId = "formal" | "friendly" | "bold" | "minimal";
export type IndustryId =
  | "cafe" | "it" | "beauty" | "shop" | "consulting" | "education" | "other";
export type ThemeId =
  | "atlant" | "remeslo" | "impulse" | "vozdukh" | "karnaval" | "barhat";
export type ViewportMode = "desktop" | "tablet" | "mobile";
export type SectionType =
  | "hero" | "about" | "services" | "features" | "pricing"
  | "testimonials" | "gallery" | "cta" | "contacts" | "footer";

export interface SectionListItem {
  id: string;
  primary: string;
  secondary?: string; // pricing: цена; testimonials: текст отзыва
}

export interface Section {
  id: string;
  type: SectionType;
  order: number;
  title: string;         // до 80 символов
  body?: string;          // до 600 символов
  items?: SectionListItem[]; // до 8 элементов
  ctaText?: string;       // до 40 символов, только hero/cta
  isCustomText: boolean;  // защита от перезаписи при регенерации (F3)
  visible: boolean;
}

export interface Project {
  id: string;
  name: string;           // 1–60 символов, уникально среди сохранённых
  industry: IndustryId;
  tone: ToneId;
  themeId: ThemeId;
  effectsEnabled: boolean;
  viewport: ViewportMode; // не влияет на экспорт
  sections: Section[];    // минимум 1
  createdAt: string;      // ISO datetime
  updatedAt: string;      // ISO datetime
}
```

**Важное архитектурное уточнение (расхождение ТЗ/дизайн-системы).**
`01-spec.md` и `02-ux.md` называют тему по умолчанию «Aurora
(светлая)», но в финальном наборе дизайн-системы (`03-design-system.md`)
такой темы нет — есть шесть: `atlant`, `remeslo`, `impulse`, `vozdukh`,
`karnaval`, `barhat`. Решение архитектора: темой по умолчанию считается
**`vozdukh`** («Воздух» — светлая, минималистичная, нейтральная,
без выраженной отраслевой привязки). Это зафиксировано в
`PROJECT_DEFAULTS.themeId` в `src/types/project.ts` — шаг 5 и шаг 6
используют именно это значение и не ищут отдельную тему «Aurora».

### 4.2 `src/types/theme.ts` — тема оформления сайта (F4)

```ts
export type ThemeMode = "light" | "dark";
export interface ThemePalette {
  background: string; surface: string; text: string; primary: string; accent: string;
}
export interface ThemeFonts { heading: string; body: string; }
export interface Theme {
  id: ThemeId; name: string; mode: ThemeMode;
  palette: ThemePalette; fonts: ThemeFonts;
}
export const THEME_IDS: readonly ThemeId[]; // порядок в сетке образцов F4
```

Палитра здесь — HEX-снимок тех же значений, что объявлены как CSS
custom properties в `site-themes.css` (нужен для плашки-превью темы на
карточке проекта, которая рисуется inline-стилем ДО применения
`data-site-theme`, см. `03-design-system.md`, §3.3). Значения
транскрибирует шаг 5 в `src/content/themes.ts`, дословно беря числа из
таблицы §2.1 `03-design-system.md`; `id` обязан совпадать со значением
`data-site-theme`.

### 4.3 `src/types/generator.ts` — словари и генератор текста (F1–F3)

```ts
export interface IndustryOption { id: IndustryId; labelRu: string; }
export interface ToneOption { id: ToneId; labelRu: string; }

export interface SectionItemFieldLabels { primaryLabel: string; secondaryLabel?: string; }
export interface SectionTypeDefinition {
  type: SectionType; labelRu: string; descriptionRu: string; icon: string;
  hasBody: boolean; hasItems: boolean; itemFields?: SectionItemFieldLabels;
  maxItems?: number; hasCtaText: boolean;
}
export type SectionLibrary = Readonly<Record<SectionType, SectionTypeDefinition>>;

export const SECTION_LIBRARY_ORDER: readonly SectionType[]; // порядок в оверлее F2
export const WIZARD_INITIAL_SECTION_ORDER: readonly SectionType[]; // [hero, about, services, contacts]

export interface GenerateSectionContentInput {
  type: SectionType; industry: IndustryId; tone: ToneId; seed: string; // project.id
}
export interface GeneratedSectionContent {
  title: string; body?: string; items?: SectionListItem[]; ctaText?: string;
}
export type GenerateSectionContent =
  (input: GenerateSectionContentInput) => GeneratedSectionContent;

export type CreateSectionOfType = (type: SectionType, project: Project) => Section;

export interface RegenerateOptions { force: boolean; } // force=true = «Перегенерировать всё»
export type RegenerateProjectTexts =
  (project: Project, options: RegenerateOptions) => Project;

export interface CreateProjectInput {
  name: string; industry: IndustryId; tone: ToneId; existingNames: string[];
}
export interface CreateProjectResult { project: Project; renamed: boolean; }
export type CreateProject = (input: CreateProjectInput) => CreateProjectResult;
```

Правило детерминизма (F3): один и тот же `(type, industry, tone, seed)`
обязан всегда возвращать один и тот же результат — без `Math.random()`
без seed. `seed = project.id`, посевной псевдослучайный выбор варианта
фразы (если в банке несколько вариантов на комбинацию) реализуется
шагом 5 через простую хэш-функцию строки (например, отдельная
внутренняя утилита в `src/content/textGenerator.ts`, не часть
публичного контракта).

Правило защиты ручных правок (F3): `RegenerateProjectTexts` с `force:
false` обязана оставить без изменений все секции с `isCustomText ===
true`; с `force: true` — переписать все секции и сбросить
`isCustomText` в `false`.

### 4.4 `src/types/render.ts` — сборка документа сайта (F5–F7)

```ts
export type AssembleMode = "preview" | "export";
export interface AssembleOptions { mode: AssembleMode; }
export interface AssembledDocument { html: string; title: string; }
export type AssembleSiteDocument =
  (project: Project, options: AssembleOptions) => AssembledDocument;

export interface RenderContext { theme: Theme; effectsEnabled: boolean; industry: IndustryId; }
export type SectionHtmlRenderer = (section: Section, ctx: RenderContext) => string;
export type SectionRendererRegistry = Readonly<Record<SectionType, SectionHtmlRenderer>>;

export interface ExportResult { filename: string; html: string; }
export type ExportProjectToHtml = (project: Project) => ExportResult;
```

Требования к реализации `assembleSiteDocument` (шаг 5,
`src/lib/pageAssembler.ts`):
1. Рендерит только `section.visible === true`, в порядке `order`.
2. Инлайнит CSS: базовые стили секций сайта (на токенах `--site-*`) +
   блок объявления `--site-*` для конкретной `project.themeId`
   (транскрипция из `site-themes.css` под нужный `[data-site-theme]`) +
   `@media (prefers-reduced-motion: reduce)`, отключающий keyframes
   появления — **это делает сам документ**, а не React/JS хост-страницы,
   поэтому поведение одинаково что в `<iframe>`, что в файле,
   открытом `file://`.
3. Если `project.effectsEnabled === true` — добавляет CSS-анимации
   появления секций при скролле (через `IntersectionObserver` в
   инлайновом `<script>`) и hover-переходы; если `false` — не
   добавляет их вовсе (переключение тумблера — мгновенное,
   без «плавного отключения», см. F6).
4. Ноль внешних `<link>`/`<script src="http...">` — только системные
   шрифты (см. `03-design-system.md`, §2.3) и инлайновый код.
5. Чистая функция: не читает `window`, не обращается к
   `matchMedia`/`localStorage` — вся информация приходит через `project`.

`ExportProjectToHtml` (шаг 5, `src/lib/htmlExporter.ts`) вызывает
`assembleSiteDocument(project, { mode: "export" })` и добавляет только
имя файла: транслитерация `project.name` в kebab-case + `.html`
(например, «Кофейня Атмосфера» → `kofeynya-atmosfera.html`). Проверку
«есть ли видимая Hero-секция» эта функция **не делает** — это
UI-правило (неактивная кнопка на уровне `EditorScreen.tsx`, шаг 6).

### 4.5 `src/types/storage.ts` — слой хранения (F8)

```ts
export interface ProjectSummary { id: string; name: string; updatedAt: string; themeId: ThemeId; }
export class StorageError extends Error {}
export interface ProjectStore {
  listProjects: () => ProjectSummary[]; // бросает StorageError при повреждённых данных
  loadProject: (id: string) => Project | undefined;
  saveProject: (project: Project) => void; // бросает StorageError при сбое записи
  deleteProject: (id: string) => void;      // идемпотентна
}
```

Формат хранения (реализация — шаг 5, `src/lib/storage.ts`): один ключ
`localStorage` вида `noesdize:projects` со значением — JSON-массивом
`Project[]` (просто, предсказуемо парсится/валидируется целиком; для
объёма данных одного пользовательского MVP разделение на отдельные
ключи на проект не даёт выгоды, зато усложняет транзакционность записи
списка при удалении/переименовании). При ошибке `JSON.parse`/квоты —
`StorageError`, которую ловит `StartScreen`/`EditorScreen` (шаг 6) и
показывает баннер по сценариям F8.

---

## 5. Переменные окружения

Обязательных переменных окружения **нет** — приложение не обращается к
сети и не имеет серверной части. `.env.example` создан как явная
декларация этого факта плюс задел на будущее (необязательный
`VITE_BASE_PATH` для деплоя не из корня домена).

---

## 6. Команды

```bash
npm install       # установка зависимостей, без флагов, проверено
npm run dev        # dev-сервер Vite на http://localhost:5173
npm run build       # tsc -b (проверка типов, noEmit) + vite build → dist/
npm run preview      # локальный просмотр собранного dist/
npm run test          # vitest run — весь набор тестов один раз
npm run test:watch     # vitest — интерактивный watch-режим
npm run lint            # eslint . — статическая проверка кода
```

Проверено фактическим запуском на этом шаге:
- `npm install` — 260 пакетов, 0 уязвимостей, без предупреждений.
- `npm run build` — `tsc -b` без ошибок, `vite build` собирает `dist/`
  (index.html + CSS + JS bundle) без предупреждений.
- `npm run test` — 1/1 тест проходит (`App.test.tsx`, smoke-рендер).
- `npm run lint` — 0 ошибок, 0 предупреждений.
- `npm run dev` — поднимается, порт слушает, отдаёт `200` и валидный
  HTML с `#root` и подключённым `main.tsx`; процесс погашен вручную
  после проверки.

---

## 7. Передача дальше

**Шаг 5 (бэкенд/логика).** Создаёт с нуля: `src/content/industries.ts`,
`src/content/tones.ts`, `src/content/themes.ts`,
`src/content/sectionLibrary.ts`, `src/content/textGenerator.ts`,
`src/lib/id.ts`, `src/lib/projectFactory.ts`,
`src/lib/sectionRenderers.ts`, `src/lib/pageAssembler.ts`,
`src/lib/htmlExporter.ts`, `src/lib/storage.ts`, плюс `*.test.ts` рядом
с каждым. Опирается только на `src/types/**`. Ноль импортов `react`.

**Шаг 6 (фронтенд/интерфейс).** Наполняет
`src/routes/StartScreen.tsx`, `src/routes/WizardScreen.tsx`,
`src/routes/EditorScreen.tsx` (сейчас — заглушки), создаёт
`src/components/**`, `src/hooks/**`, при необходимости
`src/styles/app.css`. Опирается на `src/types/**` и вызывает функции
из `src/content/**`/`src/lib/**` шага 5 (не переписывает их). Кадр
предпросмотра — `<iframe srcDoc>` поверх `assembleSiteDocument`, не
повторный React-рендер секций.

Оба шага могут стартовать параллельно сразу после этого шага — они не
редактируют одни и те же файлы (см. таблицу §2.1).
