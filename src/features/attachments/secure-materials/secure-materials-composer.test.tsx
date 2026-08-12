// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SecureMaterialsComposer } from './secure-materials-composer';
import type { ReturnTypeUseSecureMaterials } from './view-types';

vi.mock('@/features/i18n/locale-context', () => ({
  useT: () => (key: string) => key,
}));

afterEach(cleanup);

function controller(remove = vi.fn()): ReturnTypeUseSecureMaterials {
  return {
    materials: [{
      id: 'failed-link',
      clientItemId: 'failed-link',
      kind: 'link',
      state: 'failed',
      name: 'https://www.youtube.com/watch?v=aNFBseqZNUo',
      url: 'https://www.youtube.com/watch?v=aNFBseqZNUo',
      provider: 'youtube',
      embedUrl: 'https://www.youtube-nocookie.com/embed/aNFBseqZNUo',
      canEmbed: true,
      error: 'تعذر إكمال العملية.',
    }],
    error: null,
    busy: false,
    hasFailure: true,
    ready: false,
    session: null,
    ensureSession: vi.fn(),
    addFiles: vi.fn(),
    addLink: vi.fn(),
    remove,
    cancel: vi.fn(),
    clearError: vi.fn(),
  };
}

describe('SecureMaterialsComposer', () => {
  it('shows a clear remove control and removes a failed material', () => {
    const remove = vi.fn();
    render(<SecureMaterialsComposer controller={controller(remove)} />);

    const button = screen.getByRole('button', {
      name: 'secureMaterials.remove https://www.youtube.com/watch?v=aNFBseqZNUo',
    });
    expect(button).toBeTruthy();
    expect(button).not.toHaveProperty('disabled', true);

    fireEvent.click(button);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove.mock.calls[0]?.[0]).toMatchObject({ clientItemId: 'failed-link', state: 'failed' });
  });

  it('keeps a trusted video preview visible when persistence fails', () => {
    const { container } = render(<SecureMaterialsComposer controller={controller()} />);
    fireEvent.click(screen.getByRole('button', { name: /secureMaterials.loadVideo/ }));
    expect(container.querySelector('.secure-material.is-video-open iframe')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'إغلاق الفيديو' }));
    expect(container.querySelector('.secure-material.is-video-open')).toBeNull();
  });
});
