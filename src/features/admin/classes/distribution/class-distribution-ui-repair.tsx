'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type TargetOption = {
  value: string;
  label: string;
  disabled: boolean;
};

function splitTargetLabel(label: string): { primary: string; meta: string | null } {
  const separator = ' — ';
  const index = label.indexOf(separator);
  if (index < 0) return { primary: label.trim(), meta: null };
  return {
    primary: label.slice(0, index).trim(),
    meta: label.slice(index + separator.length).trim() || null,
  };
}

function primaryDirection(value: string): 'ltr' | 'rtl' | 'auto' {
  if (/^[\d\sA-Za-z._/-]+$/.test(value)) return 'ltr';
  if (/[\u0600-\u06ff]/.test(value)) return 'rtl';
  return 'auto';
}

function TargetOptionCopy({ label }: { label: string }) {
  const { primary, meta } = splitTargetLabel(label);
  return (
    <span className="class-distribution-target-picker__copy">
      <bdi
        className="class-distribution-target-picker__primary"
        dir={primaryDirection(primary)}
      >
        {primary}
      </bdi>
      {meta ? (
        <span className="class-distribution-target-picker__meta" dir="rtl">
          {meta}
        </span>
      ) : null}
    </span>
  );
}

function TargetPicker({ nativeSelect }: { nativeSelect: HTMLSelectElement }) {
  const [open, setOpen] = useState(false);
  const [version, setVersion] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const direction = document.documentElement.dir === 'rtl' ? 'rtl' : 'ltr';

  useEffect(() => {
    const refresh = () => setVersion((current) => current + 1);
    const observer = new MutationObserver(refresh);
    observer.observe(nativeSelect, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ['disabled'],
    });
    nativeSelect.addEventListener('change', refresh);
    return () => {
      observer.disconnect();
      nativeSelect.removeEventListener('change', refresh);
    };
  }, [nativeSelect]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const options = useMemo<TargetOption[]>(() => {
    void version;
    return Array.from(nativeSelect.options).map((option) => ({
      value: option.value,
      label: option.textContent?.trim() ?? '',
      disabled: option.disabled,
    }));
  }, [nativeSelect, version]);

  const selected =
    options.find((option) => option.value === nativeSelect.value) ?? options[0] ?? null;
  const fieldLabel =
    nativeSelect.parentElement?.querySelector(':scope > span')?.textContent?.trim() ?? '';

  function choose(option: TargetOption) {
    if (option.disabled || nativeSelect.disabled || option.value === '') return;
    nativeSelect.value = option.value;
    nativeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    setVersion((current) => current + 1);
    setOpen(false);
  }

  return (
    <div
      ref={rootRef}
      className="class-distribution-target-picker"
      dir={direction}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      {fieldLabel ? (
        <span className="class-distribution-target-picker__label">{fieldLabel}</span>
      ) : null}
      <button
        type="button"
        className="class-distribution-target-picker__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={nativeSelect.disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <TargetOptionCopy label={selected?.label ?? ''} />
        <span className="class-distribution-target-picker__chevron" aria-hidden="true">
         ⌄
        </span>
      </button>

      {open ? (
        <div
          className="class-distribution-target-picker__menu"
          role="listbox"
          aria-label={fieldLabel || selected?.label || undefined}
        >
          {options
            .filter((option) => option.value !== '')
            .map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={nativeSelect.value === option.value}
                className="class-distribution-target-picker__option"
                disabled={option.disabled}
                onClick={() => choose(option)}
              >
                <TargetOptionCopy label={option.label} />
                {nativeSelect.value === option.value ? (
                  <span className="class-distribution-target-picker__check" aria-hidden="true">
                    ✓
                  </span>
                ) : null}
              </button>
            ))}
        </div>
      ) : null}
    </div>
  );
}

function lockPageHorizontalOverflow(root: Element) {
  const content = root.closest('main.content--admin') as HTMLElement | null;
  const main = content?.parentElement?.classList.contains('main')
    ? (content.parentElement as HTMLElement)
    : null;
  const targets = [content, main].filter((target): target is HTMLElement => Boolean(target));
  const previous = targets.map((target) => ({
    target,
    overflowX: target.style.overflowX,
    minWidth: target.style.minWidth,
  }));

  targets.forEach((target) => {
    target.dataset.classDistributionPage = 'true';
    target.style.overflowX = 'clip';
    target.style.minWidth = '0';
  });

  return () => {
    previous.forEach(({ target, overflowX, minWidth }) => {
      delete target.dataset.classDistributionPage;
      target.style.overflowX = overflowX;
      target.style.minWidth = minWidth;
    });
  };
}

export function ClassDistributionUiRepair() {
  const [targetSelect, setTargetSelect] = useState<HTMLSelectElement | null>(null);

  useEffect(() => {
    const root = document.querySelector('.class-distribution-page-shell');
    if (!root) return;

    const restoreOverflow = lockPageHorizontalOverflow(root);
    const findTarget = () => {
      const select = root.querySelector<HTMLSelectElement>(
        '.class-distribution-direct__mobile-target select',
      );
      setTargetSelect((current) => (current === select ? current : select));
    };

    findTarget();
    const observer = new MutationObserver(findTarget);
    observer.observe(root, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      restoreOverflow();
    };
  }, []);

  useEffect(() => {
    if (!targetSelect) return;
    targetSelect.classList.add('class-distribution-target-picker__native');
    return () => targetSelect.classList.remove('class-distribution-target-picker__native');
  }, [targetSelect]);

  if (!targetSelect?.parentElement) return null;
  return createPortal(<TargetPicker nativeSelect={targetSelect} />, targetSelect.parentElement);
}
