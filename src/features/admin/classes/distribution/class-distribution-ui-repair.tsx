'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type TargetOption = {
  value: string;
  label: string;
  disabled: boolean;
};

type GenderLabels = {
  female: Set<string>;
  male: Set<string>;
};

function normalizeLabel(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

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

function SynchronizedTopScrollbar({ workspaceScroller }: { workspaceScroller: HTMLDivElement }) {
  const topScrollerRef = useRef<HTMLDivElement | null>(null);
  const [contentWidth, setContentWidth] = useState(0);
  const [scrollable, setScrollable] = useState(false);

  useEffect(() => {
    const topScroller = topScrollerRef.current;
    if (!topScroller) return;

    let syncing = false;
    let releaseFrame = 0;

    const release = () => {
      cancelAnimationFrame(releaseFrame);
      releaseFrame = requestAnimationFrame(() => {
        syncing = false;
      });
    };

    const measure = () => {
      const nextWidth = Math.max(workspaceScroller.scrollWidth, workspaceScroller.clientWidth);
      setContentWidth(nextWidth);
      setScrollable(workspaceScroller.scrollWidth > workspaceScroller.clientWidth + 2);
      if (Math.abs(topScroller.scrollLeft - workspaceScroller.scrollLeft) > 1) {
        topScroller.scrollLeft = workspaceScroller.scrollLeft;
      }
    };

    const syncFromWorkspace = () => {
      if (syncing) return;
      syncing = true;
      if (Math.abs(topScroller.scrollLeft - workspaceScroller.scrollLeft) > 1) {
        topScroller.scrollLeft = workspaceScroller.scrollLeft;
      }
      release();
    };

    const syncFromTop = () => {
      if (syncing) return;
      syncing = true;
      if (Math.abs(workspaceScroller.scrollLeft - topScroller.scrollLeft) > 1) {
        workspaceScroller.scrollLeft = topScroller.scrollLeft;
      }
      release();
    };

    measure();
    workspaceScroller.addEventListener('scroll', syncFromWorkspace, { passive: true });
    topScroller.addEventListener('scroll', syncFromTop, { passive: true });

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(workspaceScroller);
    Array.from(workspaceScroller.children).forEach((child) => resizeObserver.observe(child));

    const mutationObserver = new MutationObserver(() => {
      Array.from(workspaceScroller.children).forEach((child) => resizeObserver.observe(child));
      measure();
    });
    mutationObserver.observe(workspaceScroller, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(releaseFrame);
      workspaceScroller.removeEventListener('scroll', syncFromWorkspace);
      topScroller.removeEventListener('scroll', syncFromTop);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [workspaceScroller]);

  return (
    <div
      ref={topScrollerRef}
      className="class-distribution-top-scrollbar"
      data-scrollable={scrollable || undefined}
      tabIndex={scrollable ? 0 : -1}
      aria-label={workspaceScroller.getAttribute('aria-label') ?? undefined}
      dir={getComputedStyle(workspaceScroller).direction === 'rtl' ? 'rtl' : 'ltr'}
    >
      <div
        className="class-distribution-top-scrollbar__spacer"
        style={{ width: `${contentWidth}px` }}
        aria-hidden="true"
      />
    </div>
  );
}

function textBefore(node: Element, before: Element): string {
  const chunks: string[] = [];
  for (const child of Array.from(node.childNodes)) {
    if (child === before) break;
    chunks.push(child.textContent ?? '');
  }
  return normalizeLabel(chunks.join(''));
}

function textBetween(node: Element, start: Element, end: Element): string {
  const chunks: string[] = [];
  let collecting = false;
  for (const child of Array.from(node.childNodes)) {
    if (child === start) {
      collecting = true;
      continue;
    }
    if (child === end) break;
    if (collecting) chunks.push(child.textContent ?? '');
  }
  return normalizeLabel(chunks.join('').replace(/[·•|]+/g, ' '));
}

function genderLabelsFromSummaries(root: ParentNode): GenderLabels {
  const female = new Set<string>();
  const male = new Set<string>();

  root
    .querySelectorAll<HTMLElement>('.class-distribution-lane__capacity > span:nth-child(2)')
    .forEach((summary) => {
      const values = summary.querySelectorAll('bdi');
      if (values.length < 2) return;

      const femaleLabel = textBefore(summary, values[0]);
      const maleLabel = textBetween(summary, values[0], values[1]);
      const femaleCount = normalizeLabel(values[0]?.textContent ?? '');
      const maleCount = normalizeLabel(values[1]?.textContent ?? '');

      if (!femaleLabel || !maleLabel || !femaleCount || !maleCount) return;

      female.add(femaleLabel.toLocaleLowerCase());
      male.add(maleLabel.toLocaleLowerCase());
      summary.classList.add('class-distribution-gender-summary');
      summary.dataset.femaleLabel = femaleLabel;
      summary.dataset.femaleCount = femaleCount;
      summary.dataset.maleLabel = maleLabel;
      summary.dataset.maleCount = maleCount;
    });

  return { female, male };
}

function classifyGender(label: string, labels: GenderLabels): 'female' | 'male' | null {
  const normalized = normalizeLabel(label).toLocaleLowerCase();
  if (!normalized) return null;
  if (labels.female.has(normalized)) return 'female';
  if (labels.male.has(normalized)) return 'male';

  const femaleFallbacks = ['أنثى', 'انثى', 'female', 'féminin', 'feminin', 'fille'];
  const maleFallbacks = ['ذكر', 'male', 'masculin', 'garçon', 'garcon'];
  if (femaleFallbacks.includes(normalized)) return 'female';
  if (maleFallbacks.includes(normalized)) return 'male';
  return null;
}

function applyGenderEnhancements(root: ParentNode) {
  const labels = genderLabelsFromSummaries(root);

  root.querySelectorAll<HTMLElement>('.class-distribution-student').forEach((row) => {
    const badge = row.querySelector<HTMLElement>('.class-distribution-student__copy > span > small');
    if (!badge) return;

    badge.classList.add('class-distribution-student__gender-badge');
    const gender = classifyGender(badge.textContent ?? '', labels);
    if (gender) {
      row.dataset.gender = gender;
      badge.dataset.gender = gender;
    } else {
      delete row.dataset.gender;
      delete badge.dataset.gender;
    }
  });
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
  const [workspaceScroller, setWorkspaceScroller] = useState<HTMLDivElement | null>(null);
  const [workspace, setWorkspace] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const root = document.querySelector('.class-distribution-page-shell');
    if (!root) return;

    const restoreOverflow = lockPageHorizontalOverflow(root);
    const refresh = () => {
      const select = root.querySelector<HTMLSelectElement>(
        '.class-distribution-direct__mobile-target select',
      );
      const nextScroller = root.querySelector<HTMLDivElement>(
        '.class-distribution-workspace__scroller',
      );
      const nextWorkspace = root.querySelector<HTMLElement>('.class-distribution-workspace');

      setTargetSelect((current) => (current === select ? current : select));
      setWorkspaceScroller((current) => (current === nextScroller ? current : nextScroller));
      setWorkspace((current) => (current === nextWorkspace ? current : nextWorkspace));
      applyGenderEnhancements(root);
    };

    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(root, { childList: true, subtree: true, characterData: true });

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

  return (
    <>
      {targetSelect?.parentElement
        ? createPortal(<TargetPicker nativeSelect={targetSelect} />, targetSelect.parentElement)
        : null}
      {workspace && workspaceScroller
        ? createPortal(
            <SynchronizedTopScrollbar workspaceScroller={workspaceScroller} />,
            workspace,
          )
        : null}
    </>
  );
}
