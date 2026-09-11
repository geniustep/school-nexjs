'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

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
  const [formNode, setFormNode] = useState<HTMLFormElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rootRef = useCallback((node: T | null) => {
    setFormNode(findAmendmentForm(node));
  }, []);

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
      if (!formNode) return;
      dispatchPreviewSubmit(formNode);
    }, AUTO_PREVIEW_DELAY_MS);
  }, [cancelScheduledPreview, formNode]);

  useEffect(() => {
    if (!formNode) return;

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

    formNode.addEventListener('input', handleInput);
    formNode.addEventListener('change', handleChange);
    formNode.addEventListener('click', handleClick);

    return () => {
      formNode.removeEventListener('input', handleInput);
      formNode.removeEventListener('change', handleChange);
      formNode.removeEventListener('click', handleClick);
      cancelScheduledPreview();
    };
  }, [cancelScheduledPreview, formNode, scheduleAutoPreview]);

  return { rootRef, scheduleAutoPreview };
}
