import type { ReactNode } from 'react';

interface PageStubProps {
  title: string;
  description?: string;
  children?: ReactNode;
}

/**
 * Заглушка экрана для шага 4 (архитектура). Фронтенд-инженер на следующем шаге заменяет
 * содержимое каждой страницы на реальную вёрстку по docs/02-ux.md и docs/03-design-system.md —
 * маршрут, файл и контракт данных уже зафиксированы, менять их не требуется.
 */
export function PageStub({ title, description, children }: PageStubProps) {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col gap-4 px-4 py-8">
      <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
      {description ? <p className="text-base text-text-secondary">{description}</p> : null}
      {children}
    </div>
  );
}

export default PageStub;
