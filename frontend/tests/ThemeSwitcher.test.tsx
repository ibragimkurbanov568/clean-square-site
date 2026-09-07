import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '../src/context/ThemeContext';
import ThemeSwitcher from '../src/components/layout/ThemeSwitcher';

// Критический сценарий F11: переключатель темы меняет data-theme на <html> мгновенно.
describe('ThemeSwitcher', () => {
  afterEach(() => {
    cleanup();
    document.documentElement.removeAttribute('data-theme');
    window.localStorage.clear();
  });

  it('меняет data-theme на <html> при выборе темы «Тёмная»', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeSwitcher />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Переключить тему оформления' }));
    await user.click(screen.getByRole('menuitemradio', { name: /Тёмная/ }));

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(window.localStorage.getItem('cleanlink-theme')).toBe('dark');
  });

  it('сохраняет и переключает на тему «Классика»', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeSwitcher />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Переключить тему оформления' }));
    await user.click(screen.getByRole('menuitemradio', { name: /Классика/ }));

    expect(document.documentElement.getAttribute('data-theme')).toBe('classic');
  });
});
