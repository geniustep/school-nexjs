// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SmartLinkCards } from './smart-link-cards';

vi.mock('@/features/i18n/locale-context', () => ({
  useT: () => (key: string) => key,
}));

afterEach(cleanup);

describe('SmartLinkCards', () => {
  it('shows a trusted sent video immediately and keeps collapse/reopen controls', () => {
    const { container } = render(<SmartLinkCards links={[{
      id: 1,
      url: 'https://www.youtube.com/watch?v=aNFBseqZNUo',
      canonical_url: 'https://www.youtube.com/watch?v=aNFBseqZNUo',
      title: null,
      provider: 'youtube',
      embed_url: 'https://www.youtube-nocookie.com/embed/aNFBseqZNUo',
      can_embed: true,
      click_to_load: true,
    }]} />);

    expect(container.querySelector('.secure-material.is-video-open iframe')).toBeTruthy();
    expect(screen.getByText('فيديو YouTube')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'secureMaterials.openLink' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'إغلاق الفيديو' }));
    expect(container.querySelector('.secure-material.is-video-open')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'secureMaterials.loadVideo' }));
    expect(container.querySelector('.secure-material.is-video-open iframe')).toBeTruthy();
  });

  it('keeps a generic HTTPS link external and never embeds it', () => {
    const { container } = render(<SmartLinkCards links={[{
      id: 2,
      url: 'https://example.com/resource',
      canonical_url: 'https://example.com/resource',
      title: 'Resource',
      provider: 'generic',
      embed_url: null,
      can_embed: false,
      click_to_load: false,
    }]} />);

    expect(container.querySelector('iframe')).toBeNull();
    expect(screen.getByRole('link', { name: 'secureMaterials.openLink' })).toHaveProperty('href', 'https://example.com/resource');
  });
});
