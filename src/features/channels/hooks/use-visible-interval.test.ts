// @vitest-environment happy-dom

import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useVisibleInterval } from './use-visible-interval';

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

describe('useVisibleInterval', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => false,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('does not run an initial tick (caller owns first load)', () => {
    const cb = vi.fn();
    renderHook(() => useVisibleInterval(cb, 1000));
    expect(cb).not.toHaveBeenCalled();
  });

  it('fires on interval while visible and cleans up on unmount', async () => {
    const cb = vi.fn().mockResolvedValue(undefined);
    const { unmount } = renderHook(() => useVisibleInterval(cb, 1000));

    await vi.advanceTimersByTimeAsync(1000);
    await flushMicrotasks();
    expect(cb).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1000);
    await flushMicrotasks();
    expect(cb).toHaveBeenCalledTimes(2);

    unmount();
    await vi.advanceTimersByTimeAsync(5000);
    await flushMicrotasks();
    expect(cb).toHaveBeenCalledTimes(2);
  });

  it('pauses while document is hidden and resumes with one immediate tick', async () => {
    let hidden = false;
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => hidden,
    });

    const cb = vi.fn().mockResolvedValue(undefined);
    renderHook(() => useVisibleInterval(cb, 1000));

    await vi.advanceTimersByTimeAsync(1000);
    await flushMicrotasks();
    expect(cb).toHaveBeenCalledTimes(1);

    hidden = true;
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(5000);
    await flushMicrotasks();
    expect(cb).toHaveBeenCalledTimes(1);

    hidden = false;
    document.dispatchEvent(new Event('visibilitychange'));
    await flushMicrotasks();
    expect(cb).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(1000);
    await flushMicrotasks();
    expect(cb).toHaveBeenCalledTimes(3);
  });

  it('skips overlapping ticks while a previous callback is in flight', async () => {
    let resolveCurrent: (() => void) | undefined;
    const cb = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveCurrent = resolve;
        }),
    );

    renderHook(() => useVisibleInterval(cb, 1000));

    await vi.advanceTimersByTimeAsync(1000);
    expect(cb).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1000);
    expect(cb).toHaveBeenCalledTimes(1);

    resolveCurrent?.();
    await flushMicrotasks();

    await vi.advanceTimersByTimeAsync(1000);
    expect(cb).toHaveBeenCalledTimes(2);
    resolveCurrent?.();
  });

  it('does not start when disabled', async () => {
    const cb = vi.fn();
    renderHook(() => useVisibleInterval(cb, 1000, false));
    await vi.advanceTimersByTimeAsync(5000);
    expect(cb).not.toHaveBeenCalled();
  });
});
