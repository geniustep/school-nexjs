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

function MaterialCard({
  item,
  disabled,
  onRemove,
  onRetry,
  onReplace,
  onPreview,
}: {
  item: SecureMaterial;
  disabled: boolean;
  onRemove: () => Promise<boolean>;
  onRetry: () => Promise<boolean>;
  onReplace: (file: File) => Promise<boolean>;
  onPreview: (item: SecureMaterial) => void;
}) {
  const t = useT();
  const replaceRef = useRef<HTMLInputElement>(null);
  const [working, setWorking] = useState(false);
  const image = item.kind === 'file' && (item.mimetype?.startsWith('image/') || item.localPreviewUrl);
  const href = item.canonicalUrl || item.url;
  const embedUrl = trustedVideoEmbedUrl(item.embedUrl);
  const [videoOpen, setVideoOpen] = useState(() => Boolean(item.canEmbed && embedUrl));
  const controlsDisabled = disabled || working || item.state === 'uploading';

  async function run(action: () => Promise<boolean>) {
    setWorking(true);
    try {
      await action();
    } finally {
      setWorking(false);
    }
  }

  return (
    <article className={`secure-material secure-material--${item.kind}${videoOpen ? ' is-video-open' : ''}`}>
      <div className="secure-material__visual">
        {image && item.localPreviewUrl ? (
          <button
            type="button"
            className="secure-material__image-preview"
            onClick={() => onPreview(item)}
            aria-label={`${t('attachments.preview')} ${item.name}`}
          >
            {/* Local object URL is used only before finalization and never leaves the browser. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.localPreviewUrl} alt={item.name} />
          </button>
        ) : item.canEmbed && embedUrl ? (
          videoOpen ? (
            <div className="secure-material__video-frame">
              <iframe
                src={embedUrl}
                title={item.name}
                loading="lazy"
                allow="fullscreen; picture-in-picture"
                sandbox="allow-scripts allow-same-origin allow-presentation"
                referrerPolicy="strict-origin-when-cross-origin"
              />
              <button
                type="button"
                className="secure-material__video-close"
                onClick={() => setVideoOpen(false)}
                aria-label="إغلاق الفيديو"
                title="إغلاق الفيديو"
              >×</button>
            </div>
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
        {item.kind === 'file' && item.state !== 'uploading' ? (
          <div className="secure-material__actions">
            {item.state === 'failed' ? (
              <button
                type="button"
                className="secure-material__action"
                disabled={controlsDisabled}
                onClick={() => void run(onRetry)}
              >
                {t('common.retry')}
              </button>
            ) : null}
            <button
              type="button"
              className="secure-material__action"
              disabled={controlsDisabled}
              onClick={() => replaceRef.current?.click()}
            >
              {t('attachments.replace')}
            </button>
          </div>
        ) : null}
      </div>

      <input
        ref={replaceRef}
        type="file"
        accept={ACCEPT}
        hidden
        disabled={controlsDisabled}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void run(() => onReplace(file));
        }}
      />

      <button
        type="button"
        className="secure-material__remove"
        disabled={controlsDisabled}
        onClick={() => void run(onRemove)}
        title={t('secureMaterials.remove')}
        aria-label={`${t('secureMaterials.remove')} ${item.name}`}
      >
        <span aria-hidden="true">×</span>
        <span>{t('secureMaterials.remove')}</span>
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
  const dragDepthRef = useRef(0);
  const [link, setLink] = useState('');
  const [linkOpen, setLinkOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<SecureMaterial | null>(null);
  const canAdd = !disabled && !controller.busy && controller.materials.length < 5;

  async function addLink() {
    const value = link.trim();
    if (!value) return;
    if (await controller.addLink(value)) {
      setLink('');
      setLinkOpen(false);
    }
  }

  function handleDrop(files: FileList | null) {
    const items = Array.from(files ?? []);
    if (!canAdd || items.length === 0) return;
    void controller.addFiles(items);
  }

  return (
    <section
      className={`secure-materials${dragging ? ' is-dragging' : ''}`}
      aria-label={t('secureMaterials.title')}
      onDragEnter={(event) => {
        if (!canAdd || !event.dataTransfer.types.includes('Files')) return;
        event.preventDefault();
        dragDepthRef.current += 1;
        setDragging(true);
      }}
      onDragOver={(event) => {
        if (!canAdd || !event.dataTransfer.types.includes('Files')) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
      }}
      onDragLeave={(event) => {
        if (!dragging) return;
        event.preventDefault();
        dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
        if (dragDepthRef.current === 0) setDragging(false);
      }}
      onDrop={(event) => {
        if (!canAdd) return;
        event.preventDefault();
        dragDepthRef.current = 0;
        setDragging(false);
        handleDrop(event.dataTransfer.files);
      }}
    >
      {dragging ? (
        <div className="secure-materials__drop-hint" aria-hidden="true">
          {t('secureMaterials.addFiles')}
        </div>
      ) : null}

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
            disabled={!canAdd}
            onClick={() => inputRef.current?.click()}
          >
            <span aria-hidden="true">＋</span>
            {t('secureMaterials.addFiles')}
          </button>
          <button
            type="button"
            className={`secure-materials__tool${linkOpen ? ' is-active' : ''}`}
            disabled={!canAdd}
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
        disabled={!canAdd}
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
            disabled={!canAdd}
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
            disabled={!canAdd || !link.trim()}
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
            <MaterialCard
              key={item.clientItemId}
              item={item}
              disabled={disabled}
              onRemove={() => controller.remove(item)}
              onRetry={() => controller.retryFile(item)}
              onReplace={(file) => controller.replaceFile(item, file)}
              onPreview={setPreview}
            />
          ))}
        </div>
      ) : null}

      {controller.busy ? <p className="tiny" role="status">{t('secureMaterials.waitForUpload')}</p> : null}

      {preview?.localPreviewUrl ? (
        <div
          className="secure-materials__preview-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={`${t('attachments.preview')} ${preview.name}`}
          onClick={() => setPreview(null)}
        >
          <div className="secure-materials__preview-panel" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="secure-materials__preview-close"
              aria-label={t('common.close')}
              onClick={() => setPreview(null)}
            >
              ×
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview.localPreviewUrl} alt={preview.name} />
            <strong dir="auto">{preview.name}</strong>
          </div>
        </div>
      ) : null}
    </section>
  );
}
