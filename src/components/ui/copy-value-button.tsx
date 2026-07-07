'use client';

import { useState } from 'react';
import { copyTextToClipboard } from '@/lib/utils/copy-text';

export function CopyValueButton({
  value,
  label,
  copiedLabel,
  className = 'btn btn--ghost btn--sm',
}: {
  value: string;
  label: string;
  copiedLabel: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const trimmed = value.trim();
  if (!trimmed) return null;

  async function copy() {
    const ok = await copyTextToClipboard(trimmed);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button type="button" className={className} onClick={() => void copy()}>
      {copied ? copiedLabel : label}
    </button>
  );
}
