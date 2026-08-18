// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SecureMaterialsComposer } from './secure-materials-composer';
import type { SecureMaterial } from './types';
import type { ReturnTypeUseSecureMaterials } from './view-types';

vi.mock('@/features/i18n/locale-context', () => ({
  useT: () => (key: string) => key,
}));

afterEach(cleanup);

function controller(overrides: Partial<ReturnTypeUseSecureMaterials> = {}): ReturnTypeUseSecureMaterials {
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
    addFiles: vi.fn(async (_files: File[]) => undefined),
    addLink: vi.fn(async (_url: string) => true),
    remove: vi.fn(async (_item: SecureMaterial) => true),
    replaceFile: vi.fn(async (_item: SecureMaterial, _file: File) => true),
    retryFile: vi.fn(async (_item: SecureMaterial) => true),
    cancel: vi.fn(),
    clearError: vi.fn(),
    ...overrides,
  };
}

describe('SecureMaterialsComposer', () => {
  it('shows a clear remove control and removes a failed material', () => {
    const remove = vi.fn(async (_item: SecureMaterial) => true);
    render(<SecureMaterialsComposer controller={controller({ remove })} />);

    const button = screen.getByRole('button', {
      name: 'secureMaterials.remove https://www.youtube.com/watch?v=aNFBseqZNUo',
    });
    expect(button).toBeTruthy();
    expect(button).not.toHaveProperty('disabled', true);

    fireEvent.click(button);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove.mock.calls[0]?.[0]).toMatchObject({ clientItemId: 'failed-link', state: 'failed' });
  });

  it('opens a trusted video preview immediately without an extra click', () => {
    const { container } = render(<SecureMaterialsComposer controller={controller()} />);
    expect(container.querySelector('.secure-material.is-video-open iframe')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /secureMaterials.loadVideo/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'إغلاق الفيديو' }));
    expect(container.querySelector('.secure-material.is-video-open')).toBeNull();
  });

  it('accepts files dropped on the composer', () => {
    const addFiles = vi.fn(async (_files: File[]) => undefined);
    render(<SecureMaterialsComposer controller={controller({ materials: [], addFiles, hasFailure: false, ready: true })} />);

    const file = new File(['hello'], 'lesson.pdf', { type: 'application/pdf' });
    const area = screen.getByRole('region', { name: 'secureMaterials.title' });
    fireEvent.drop(area, {
      dataTransfer: {
        files: [file],
        types: ['Files'],
      },
    });

    expect(addFiles).toHaveBeenCalledTimes(1);
    expect(addFiles.mock.calls[0]?.[0]?.[0]?.name).toBe('lesson.pdf');
  });

  it('opens a local image preview without an external URL', () => {
    render(
      <SecureMaterialsComposer
        controller={controller({
          materials: [{
            id: 41,
            clientItemId: 'image-41',
            kind: 'file',
            state: 'ready',
            name: 'exercise.png',
            mimetype: 'image/png',
            localPreviewUrl: 'blob:raqeem-preview',
          }],
          hasFailure: false,
          ready: true,
        })}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'attachments.preview exercise.png' }));
    const dialog = screen.getByRole('dialog', { name: 'attachments.preview exercise.png' });
    expect(dialog).toBeTruthy();
    expect(within(dialog).getByRole('img', { name: 'exercise.png' }).getAttribute('src')).toBe('blob:raqeem-preview');
  });

  it('offers retry for a failed file and delegates only that item', () => {
    const retryFile = vi.fn(async (_item: SecureMaterial) => true);
    const failed: SecureMaterial = {
      id: 51,
      clientItemId: 'failed-file',
      kind: 'file',
      state: 'failed',
      name: 'worksheet.pdf',
      mimetype: 'application/pdf',
      error: 'فشل الرفع',
    };

    render(
      <SecureMaterialsComposer
        controller={controller({
          materials: [failed],
          retryFile,
        })}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(retryFile).toHaveBeenCalledWith(failed);
  });
});
