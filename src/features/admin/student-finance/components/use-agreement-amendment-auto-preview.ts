'use client';

import { useCallback, useEffect, useRef } from 'react';

const AUTO_PREVIEW_DELAY_MS = 420;
const BUSY_RETRY_DELAY_MS = 480;

function findAmendmentForm(node: HTMLElement | null): HTMLFormElement | null {
  return node?.closest<HTMLFormElement>('form.student-finance-amendment-form') ?? null;
}

function findPreviewSubmitter(form: HTMLFormElement): HTMLButtonElement | null {
  return form.querySelector<HTMLButtonElement>('button[type="submit"]');
}

function requestPreviewWhenReady(form: HTMLFormElement): boolean {
  if (!form.isConnected || !form.checkValidity()) return false;
  const submitter = findPreviewSubmitter(form);
  if (submitter?.disabled) return false;
  form.requestSubmit();
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
      if (!form || !form.checkValidity()) return;
      if (requestPreviewWhenReady(form)) return;

      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        const retryForm = findAmendmentForm(rootRef.current);
        if (retryForm) requestPreviewWhenReady(retryForm);
      }, BUSY_RETRY_DELAY_MS);
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
        target.closest('.student-finance-amendment-ambiguous__list')
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
