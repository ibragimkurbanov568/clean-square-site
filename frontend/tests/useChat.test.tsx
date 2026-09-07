import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useChat } from '../src/hooks/useChat';
import { installFetchMock, type MockRoute } from './mockApi';

// F6: поллинг чата — интервал ставится при монтировании и гарантированно очищается при
// размонтировании (иначе — утечка таймеров/лишние запросы после ухода со страницы чата).

const HISTORY: MockRoute = {
  method: 'GET',
  matcher: /\/chats\/chat-1\/messages$/,
  handler: () => ({ status: 200, body: { items: [] } }),
};
const POLL: MockRoute = {
  method: 'GET',
  matcher: /\/chats\/chat-1\/poll$/,
  handler: () => ({ status: 200, body: { items: [] } }),
};

describe('useChat — поллинг (F6)', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('ставит интервал поллинга и опрашивает /poll периодически, пока смонтирован', async () => {
    const { calls } = installFetchMock([HISTORY, POLL]);
    vi.useFakeTimers({ shouldAdvanceTime: true });

    const { unmount } = renderHook(() => useChat('chat-1', 'user-1'));

    // Начальная загрузка истории.
    await act(async () => {
      await Promise.resolve();
    });
    expect(calls.some((c) => c.url.includes('/chats/chat-1/messages'))).toBe(true);

    const pollCallsBefore = calls.filter((c) => c.url.includes('/poll')).length;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000);
    });
    const pollCallsAfterOneTick = calls.filter((c) => c.url.includes('/poll')).length;
    expect(pollCallsAfterOneTick).toBeGreaterThan(pollCallsBefore);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000);
    });
    const pollCallsAfterTwoTicks = calls.filter((c) => c.url.includes('/poll')).length;
    expect(pollCallsAfterTwoTicks).toBeGreaterThan(pollCallsAfterOneTick);

    unmount();
  });

  it('очищает интервал при размонтировании — после unmount новых /poll запросов не происходит', async () => {
    const { calls } = installFetchMock([HISTORY, POLL]);
    vi.useFakeTimers({ shouldAdvanceTime: true });

    const { unmount } = renderHook(() => useChat('chat-1', 'user-1'));
    await act(async () => {
      await Promise.resolve();
    });

    unmount();
    const pollCallsAtUnmount = calls.filter((c) => c.url.includes('/poll')).length;

    // Прокручиваем далеко вперёд — если бы интервал не был очищен, здесь появились бы новые
    // запросы /poll.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000);
    });
    const pollCallsLater = calls.filter((c) => c.url.includes('/poll')).length;
    expect(pollCallsLater).toBe(pollCallsAtUnmount);
  });

  it('без chatId не запускает поллинг вовсе', async () => {
    const { calls } = installFetchMock([HISTORY, POLL]);
    vi.useFakeTimers({ shouldAdvanceTime: true });

    renderHook(() => useChat(undefined, 'user-1'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(calls.length).toBe(0);
  });
});
