'use client';

import { isSafeEmbedUrl, isSafeHttpUrl } from '@/lib/attachments/secure-url';
import { Card } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import type { ResourceUrlMeta } from '@/types/resource';

interface ResourceLinkSectionProps {
  url?: string | null;
  urlMeta?: ResourceUrlMeta | null;
}

function resolveLink(url?: string | null, urlMeta?: ResourceUrlMeta | null): string | null {
  const candidate = urlMeta?.url ?? url ?? null;
  if (!candidate || !isSafeHttpUrl(candidate)) return null;
  return candidate;
}

function resolveEmbed(urlMeta?: ResourceUrlMeta | null): string | null {
  if (!urlMeta?.can_embed || !urlMeta.embed_url) return null;
  if (!isSafeEmbedUrl(urlMeta.embed_url)) return null;
  return urlMeta.embed_url;
}

export function ResourceLinkSection({ url, urlMeta }: ResourceLinkSectionProps) {
  const t = useT();
  const link = resolveLink(url, urlMeta);
  const embed = resolveEmbed(urlMeta);

  if (!link && !embed) return null;

  return (
    <div className="section">
      <h2 style={{ fontSize: 15, marginBottom: 8 }}>
        {embed ? t('attachments.watchVideo') : t('academic.externalLink')}
      </h2>
      <Card>
        <div className="col" style={{ gap: 12 }}>
          {embed && (
            <div className="resource-embed-wrap">
              <iframe
                src={embed}
                title={urlMeta?.title ?? t('attachments.watchVideo')}
                className="resource-embed-frame"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          {link && (
            <div className="resource-link-card between">
              <div className="col" style={{ gap: 4, minWidth: 0 }}>
                <strong className="attachment-list__name">
                  {urlMeta?.title ?? link}
                </strong>
                {!embed && <span className="tiny muted">{link}</span>}
              </div>
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn--ghost btn--sm"
              >
                {t('attachments.openLink')}
              </a>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
