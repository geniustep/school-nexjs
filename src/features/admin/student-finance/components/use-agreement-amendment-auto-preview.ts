'use client';

import { useCallback, useEffect, useRef } from 'react';

const AUTO_PREVIEW_DELAY_MS = 420;

function findAmendmentForm(node: HTMLElement | null): HTMLFormElement | null {
  return node?.closest<HTMLFormElement>('form.student-finance-amendment-form') ?? null;
}

function dispatchPreviewSubmit(form: HTMLFormElement): boolean {
  if (!form.isConnected) return false;
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  return true;
}

export function useAgreementAmendmentAutoPreview<T extends HTMLElement>() {
  const rootRef = useRef<T | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelScheduledPreview = useCallback(() => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const scheduleAutoPreview = useCallback(() => {
    cancelScheduledPreview();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      const form = findAmendmentForm(rootRef.current);
      if (!form) return;
      dispatchPreviewSubmit(form);
    }, AUTO_PREVIEW_DELAY_MS);
  }, [cancelScheduledPreview]);

  useEffect(() => {
    const form = findAmendmentForm(rootRef.current);
    if (!form) return;

    const handleInput = () => scheduleAutoPreview();
    const handleChange = () => scheduleAutoPreview();
    const handleClick = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (
        target.closest('.student-finance-amendment-line-picker__card') ||
        target.closest('.student-finance-amendment-ambiguous__list') ||
        target.closest('.student-finance-amendment-sparse-period__toggle') ||
        target.closest('.student-finance-amendment-sparse-period__override')
      ) {
        scheduleAutoPreview();
      }
    };

    form.addEventListener('input', handleInput);
    form.addEventListener('change', handleChange);
    form.addEventListener('click', handleClick);

    return () => {
      form.removeEventListener('input', handleInput);
      form.removeEventListener('change', handleChange);
      form.removeEventListener('click', handleClick);
      cancelScheduledPreview();
    };
  }, [cancelScheduledPreview, scheduleAutoPreview]);

  return { rootRef, scheduleAutoPreview };
}
