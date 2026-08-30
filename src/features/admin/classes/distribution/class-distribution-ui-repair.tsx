'use client';

import { useEffect } from 'react';

function applyTargetDirection(root: ParentNode) {
  const direction = document.documentElement.dir === 'rtl' ? 'rtl' : 'ltr';
  const textAlign = direction === 'rtl' ? 'right' : 'left';

  root
    .querySelectorAll<HTMLSelectElement>('.class-distribution-direct__mobile-target select')
    .forEach((select) => {
      select.setAttribute('dir', direction);
      select.style.textAlign = textAlign;
      select.style.setProperty('text-align-last', textAlign);

      select.querySelectorAll<HTMLOptionElement>('option').forEach((option) => {
        option.setAttribute('dir', direction);
      });
    });
}

export function ClassDistributionUiRepair() {
  useEffect(() => {
    const root = document.querySelector('.class-distribution-page-shell');
    if (!root) return;

    applyTargetDirection(root);

    const observer = new MutationObserver(() => applyTargetDirection(root));
    observer.observe(root, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return null;
}
