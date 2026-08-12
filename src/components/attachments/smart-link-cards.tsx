'use client';

import { useState } from 'react';
import { useT } from '@/features/i18n/locale-context';
import type { SmartLinkRef } from '@/types/smart-link';
import { safeHttpsUrl, trustedVideoEmbedUrl } from '@/lib/attachments/trusted-smart-link';
import '@/features/attachments/secure-materials/secure-materials.css';

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export function normalizeSmartLinks(value: unknown): SmartLinkRef[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const raw = record(item);
    if (!raw) return [];
    const url = safeHttpsUrl(typeof raw.url === 'string' ? raw.url : typeof raw.canonical_url === 'string' ? raw.canonical_url : '');
    if (!url) return [];
    return [{
      id: typeof raw.id === 'number' ? raw.id : null,
      url,
      canonical_url: safeHttpsUrl(typeof raw.canonical_url === 'string' ? raw.canonical_url : null),
      title: typeof raw.title === 'string' ? raw.title : null,
      provider: typeof raw.provider === 'string' ? raw.provider : null,
      embed_url: trustedVideoEmbedUrl(typeof raw.embed_url === 'string' ? raw.embed_url : null),
      can_embed: raw.can_embed === true && Boolean(trustedVideoEmbedUrl(typeof raw.embed_url === 'string' ? raw.embed_url : null)),
      click_to_load: raw.click_to_load !== false,
    }];
  });
}

function SmartLinkCard({ link }: { link: SmartLinkRef }) {
  const t = useT();
  const href = link.canonical_url || link.url;
  const embedUrl = trustedVideoEmbedUrl(link.embed_url);
  const trustedVideo = Boolean(link.can_embed && embedUrl);
  const [loaded, setLoaded] = useState(() => trustedVideo);
  const title = link.title?.trim()
    || (link.provider === 'youtube' ? 'فيديو YouTube' : link.provider === 'vimeo' ? 'فيديو Vimeo' : null)
    || link.provider
    || href;
  return (
    <article className={`secure-material secure-material--link${trustedVideo && loaded ? ' is-video-open' : ''}`}>
      <div className="secure-material__visual">
        {trustedVideo && embedUrl && loaded ? (
          <div className="secure-material__video-frame">
            <iframe
              src={embedUrl}
              title={title}
              loading="lazy"
              sandbox="allow-scripts allow-same-origin allow-presentation"
              allow="fullscreen; picture-in-picture"
              referrerPolicy="strict-origin-when-cross-origin"
            />
            <button
              type="button"
              className="secure-material__video-close"
              onClick={() => setLoaded(false)}
              aria-label="إغلاق الفيديو"
              title="إغلاق الفيديو"
            >×</button>
          </div>
        ) : trustedVideo && embedUrl ? (
          <button type="button" className="secure-material__video-launch" onClick={() => setLoaded(true)}>
            <span aria-hidden="true">▶</span>{t('secureMaterials.loadVideo')}
          </button>
        ) : <span className="secure-material__file-icon" aria-hidden="true">↗</span>}
      </div>
      <div className="secure-material__info">
        <strong dir="auto">{title}</strong>
        {!trustedVideo ? <a href={href} target="_blank" rel="noopener noreferrer" className="tiny">{t('secureMaterials.openLink')}</a> : null}
      </div>
    </article>
  );
}

export function SmartLinkCards({ links }: { links?: SmartLinkRef[] | null }) {
  if (!links?.length) return null;
  return <div className="secure-materials__grid">{links.map((link, index) => <SmartLinkCard key={link.id ?? `${link.url}-${index}`} link={link} />)}</div>;
}
