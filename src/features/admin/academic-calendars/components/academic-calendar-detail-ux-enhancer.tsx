'use client';

import { useEffect } from 'react';
import { useLocale, useT } from '@/features/i18n/locale-context';
import '@/features/admin/academic-calendars/academic-calendar-detail-ux-enhancer.css';

const GENERIC_EVENT_LABEL: Record<'ar' | 'en' | 'fr' | 'es', string> = {
  ar: 'حدث تقويمي',
  en: 'Calendar event',
  fr: 'Événement du calendrier',
  es: 'Evento del calendario',
};

function text(value: string | null | undefined): string {
  return value?.trim() ?? '';
}

function findCardByHeading(root: HTMLElement, heading: string): HTMLElement | null {
  const headings = Array.from(root.querySelectorAll<HTMLElement>('h2'));
  const match = headings.find((node) => text(node.textContent) === heading);
  return match?.closest<HTMLElement>('.card') ?? null;
}

function simplifySingleDayPeriods(card: HTMLElement, periodLabel: string) {
  const table = card.querySelector<HTMLTableElement>('table');
  if (!table) return;

  const headers = Array.from(table.querySelectorAll<HTMLTableCellElement>('thead th'));
  const periodIndex = headers.findIndex((header) => text(header.textContent) === periodLabel);
  if (periodIndex < 0) return;

  for (const row of Array.from(table.querySelectorAll<HTMLTableRowElement>('tbody tr'))) {
    const cell = row.cells.item(periodIndex);
    if (!cell || cell.dataset.raqeemSingleDay === '1') continue;

    const value = text(cell.textContent);
    const parts = value.split(/\s+[–—-]\s+/).map((part) => part.trim()).filter(Boolean);
    if (parts.length === 2 && parts[0] === parts[1]) {
      cell.textContent = parts[0];
      cell.dataset.raqeemSingleDay = '1';
    }
  }
}

function replaceRawEventTypeLabels(card: HTMLElement, genericLabel: string) {
  const labels = Array.from(
    card.querySelectorAll<HTMLElement>('.academic-calendar-detail__event-name .muted.tiny'),
  );
  for (const label of labels) {
    const value = text(label.textContent);
    if (/^[a-z][a-z0-9_]*$/i.test(value)) {
      label.textContent = genericLabel;
      label.dataset.raqeemTechnicalLabelReplaced = '1';
    }
  }
}

function hideEmptyActionsColumn(card: HTMLElement, actionsLabel: string) {
  const table = card.querySelector<HTMLTableElement>('table');
  if (!table) return;

  const headers = Array.from(table.querySelectorAll<HTMLTableCellElement>('thead th'));
  const actionIndex = headers.findIndex((header) => text(header.textContent) === actionsLabel);
  if (actionIndex < 0) return;

  const rows = Array.from(table.querySelectorAll<HTMLTableRowElement>('tbody tr'));
  if (rows.length === 0) return;

  const actionCells = rows
    .map((row) => row.cells.item(actionIndex))
    .filter((cell): cell is HTMLTableCellElement => cell != null);

  const hasAction = actionCells.some((cell) => cell.querySelector('button, a, [role="button"]'));
  if (hasAction) return;

  headers[actionIndex].style.display = 'none';
  headers[actionIndex].dataset.raqeemHiddenAction = '1';
  for (const cell of actionCells) {
    cell.style.display = 'none';
    cell.dataset.raqeemHiddenAction = '1';
  }
}

function makeAdvancedCardCollapsible(
  card: HTMLElement,
  viewLabel: string,
  closeLabel: string,
) {
  if (card.dataset.raqeemCollapsible === '1') return;

  const head = card.querySelector<HTMLElement>('.academic-calendar-detail__section-head');
  if (!head) return;

  card.dataset.raqeemCollapsible = '1';
  card.dataset.collapsed = 'true';
  card.classList.add('academic-calendar-detail__advanced-card');

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'btn btn--ghost btn--sm academic-calendar-detail__advanced-toggle';
  toggle.textContent = viewLabel;
  toggle.setAttribute('aria-expanded', 'false');

  toggle.addEventListener('click', () => {
    const collapsed = card.dataset.collapsed === 'true';
    card.dataset.collapsed = collapsed ? 'false' : 'true';
    toggle.textContent = collapsed ? closeLabel : viewLabel;
    toggle.setAttribute('aria-expanded', collapsed ? 'true' : 'false');
  });

  head.append(toggle);
}

export function AcademicCalendarDetailUxEnhancer() {
  const t = useT();
  const { locale } = useLocale();

  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.academic-calendar-detail');
    if (!root) return;

    const apply = () => {
      const eventsCard = findCardByHeading(root, t('admin.academicCalendars.events.title'));
      if (eventsCard) {
        simplifySingleDayPeriods(eventsCard, t('admin.academicCalendars.columns.period'));
        replaceRawEventTypeLabels(eventsCard, GENERIC_EVENT_LABEL[locale]);
        hideEmptyActionsColumn(eventsCard, t('common.actions'));
      }

      const effectiveCard = findCardByHeading(root, t('admin.academicCalendars.effectiveEvents.title'));
      if (effectiveCard) {
        makeAdvancedCardCollapsible(effectiveCard, t('common.view'), t('common.close'));
      }

      const closureCard = findCardByHeading(root, t('admin.academicCalendars.closureContext.title'));
      if (closureCard) {
        makeAdvancedCardCollapsible(closureCard, t('common.view'), t('common.close'));
      }
    };

    apply();
    const observer = new MutationObserver(apply);
    observer.observe(root, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [locale, t]);

  return null;
}
