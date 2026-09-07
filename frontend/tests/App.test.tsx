import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, expect, it, afterEach } from 'vitest';
import App from '../src/App';

// Смок-тест: приложение монтируется без ошибок, роутинг и провайдеры (Theme/Auth) не падают
// на маршруте по умолчанию ("/"). Полноценные тесты компонентов/экранов — на шаге frontend-инженера.

describe('App', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  afterEach(() => {
    if (root) {
      act(() => root?.unmount());
    }
    if (container) {
      container.remove();
    }
    container = null;
    root = null;
  });

  it('монтируется на "/" и показывает логотип в шапке', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(<App />);
    });

    expect(container.textContent).toContain('CleanLink');
  });
});
