'use client';

import { useRef, useState } from 'react';
import { useT } from '@/features/i18n/locale-context';
import type { SecureMaterial } from './types';
import type { ReturnTypeUseSecureMaterials } from './view-types';
import './secure-materials.css';
import { trustedVideoEmbedUrl } from '@/lib/attachments/trusted-smart-link';

const ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt';

function formatBytes(value?: number): string {
  if (!value) return '';
  if (value < 1024 * 1024) return `${Math.ceil(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function MaterialCard({ item, onRemove }: { item: SecureMaterial; onRemove: () => void }) {
  const t = useT();
  const [videoOpen, setVideoOpen] = useState(false);
  const image = item.kind === 'file' && (item.mimetype?.startsWith('image/') || item.localPreviewUrl);
  const href = item.canonicalUrl || item.url;
  const embedUrl = trustedVideoEmbedUrl(item.embedUrl);
  return (
    <article className={`secure-material secure-material--${item.kind}`}>
      <div className="secure-material__visual">
        {image && item.localPreviewUrl ? (
          // Local object URL is used only before finalization and never leaves the browser.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.localPreviewUrl} alt={item.name} />
        ) : item.canEmbed && embedUrl ? (
          videoOpen ? (
            <iframe
              src={embedUrl}
              title={item.name}
              loading="lazy"
              allow="fullscreen; picture-in-picture"
              sandbox="allow-scripts allow-same-origin allow-presentation"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : (
            <button type="button" className="secure-material__video-launch" onClick={() => setVideoOpen(true)}>
              <span aria-hidden="true">▶</span>
              {t('secureMaterials.loadVideo')}
            </button>
          )
        ) : (
          <span className="secure-material__file-icon" aria-hidden="true">
            {item.kind === 'link' ? '↗' : image ? '▧' : '▤'}
          </span>
        )}
      </div>
      <div className="secure-material__info">
        <strong dir="auto">{item.name}</strong>
        <span className="tiny muted">
          {item.state === 'uploading'
            ? t('secureMaterials.uploading')
            : item.state === 'failed'
              ? t('secureMaterials.failed')
              : item.provider || formatBytes(item.size) || t('secureMaterials.ready')}
        </span>
        {item.error ? <span className="secure-material__error">{item.error}</span> : null}
        {item.kind === 'link' && href && !item.canEmbed ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="tiny">
            {t('secureMaterials.openLink')}
          </a>
        ) : null}
      </div>
      <button
        type="button"
        className="secure-material__remove"
        onClick={onRemove}
        aria-label={`${t('secureMaterials.remove')} ${item.name}`}
      >
        ×
      </button>
    </article>
  );
}

export function SecureMaterialsComposer({ controller, disabled = false }: {
  controller: ReturnTypeUseSecureMaterials;
  disabled?: boolean;
}) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [link, setLink] = useState('');
  const [linkOpen, setLinkOpen] = useState(false);

  async function addLink() {
    const value = link.trim();
    if (!value) return;
    if (await controller.addLink(value)) {
      setLink('');
      setLinkOpen(false);
    }
  }

  return (
    <section className="secure-materials" aria-label={t('secureMaterials.title')}>
      <div className="secure-materials__header">
        <div className="secure-materials__heading">
          <strong>{t('secureMaterials.title')}</strong>
          <span className="secure-materials__hint">{t('secureMaterials.help')}</span>
        </div>
        <div className="secure-materials__toolbar">
          <span className="secure-materials__count">{controller.materials.length}/5</span>
          <button
            type="button"
            className="secure-materials__tool"
            disabled={disabled || controller.busy || controller.materials.length >= 5}
            onClick={() => inputRef.current?.click()}
          >
            <span aria-hidden="true">＋</span>
            {t('secureMaterials.addFiles')}
          </button>
          <button
            type="button"
            className={`secure-materials__tool${linkOpen ? ' is-active' : ''}`}
            disabled={disabled || controller.busy || controller.materials.length >= 5}
            aria-expanded={linkOpen}
            onClick={() => setLinkOpen((current) => !current)}
          >
            <span aria-hidden="true">↗</span>
            {t('secureMaterials.addLink')}
          </button>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        hidden
        disabled={disabled || controller.materials.length >= 5}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = '';
          void controller.addFiles(files);
        }}
      />
      {linkOpen ? (
        <div className="secure-materials__link-row">
          <input
            className="input"
            type="url"
            inputMode="url"
            dir="ltr"
            placeholder="https://"
            value={link}
            disabled={disabled || controller.busy || controller.materials.length >= 5}
            onChange={(event) => setLink(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void addLink();
              }
            }}
          />
          <button
            type="button"
            className="btn btn--primary btn--sm"
            disabled={disabled || controller.busy || !link.trim() || controller.materials.length >= 5}
            onClick={() => void addLink()}
          >
            {t('secureMaterials.addLink')}
          </button>
          <button
            type="button"
            className="secure-materials__link-cancel"
            aria-label={t('common.cancel')}
            onClick={() => {
              setLink('');
              setLinkOpen(false);
            }}
          >
            ×
          </button>
        </div>
      ) : null}

      {controller.error ? <p className="secure-materials__alert" role="alert">{controller.error}</p> : null}
      {controller.materials.length ? (
        <div className="secure-materials__grid">
          {controller.materials.map((item) => (
            <MaterialCard key={item.clientItemId} item={item} onRemove={() => void controller.remove(item)} />
          ))}
        </div>
      ) : null}
      {controller.busy ? <p className="tiny" role="status">{t('secureMaterials.waitForUpload')}</p> : null}
    </section>
  );
}
