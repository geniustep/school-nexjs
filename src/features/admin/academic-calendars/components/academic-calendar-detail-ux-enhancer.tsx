'use client';

import { useEffect, useMemo } from 'react';
import {
  academicCalendarEventAllowsMutation,
} from '@/features/admin/academic-calendars/utils/academic-calendar-event-review';
import { mergeCalendarEventsForDisplay } from '@/features/admin/academic-calendars/utils/academic-calendar-present';
import { useLocale, useT } from '@/features/i18n/locale-context';
import type { AcademicCalendarDetail, AcademicCalendarEvent } from '@/types/academic-calendar';
import '@/features/admin/academic-calendars/academic-calendar-detail-ux-enhancer.css';

const GENERIC_EVENT_LABEL: Record<'ar' | 'en' | 'fr' | 'es', string> = {
  ar: 'حدث تقويمي',
  en: 'Calendar event',
  fr: 'Événement du calendrier',
  es: 'Evento del calendario',
};

const ALL_EVENTS_TITLE: Record<'ar' | 'en' | 'fr' | 'es', string> = {
  ar: 'جميع أحداث التقويم',
  en: 'All calendar events',
  fr: 'Tous les événements du calendrier',
  es: 'Todos los eventos del calendario',
};

const REGULATORY_READ_ONLY_LABEL: Record<'ar' | 'en' | 'fr' | 'es', string> = {
  ar: 'رسمي · للقراءة فقط',
  en: 'Official · read only',
  fr: 'Officiel · lecture seule',
  es: 'Oficial · solo lectura',
};

function text(value: string | null | undefined): string {
  return value?.trim() ?? '';
}

function findCardByHeading(root: HTMLElement, heading: string): HTMLElement | null {
  const headings = Array.from(root.querySelectorAll<HTMLElement>('h2'));
  const match = headings.find((node) => text(node.textContent) === heading);
  return match?.closest<HTMLElement>('.card') ?? null;
}

function findEventsCard(root: HTMLElement, heading: string): HTMLElement | null {
  const known = root.querySelector<HTMLElement>('[data-raqeem-events-card="1"]');
  if (known) return known;
  const card = findCardByHeading(root, heading);
  if (card) card.dataset.raqeemEventsCard = '1';
  return card;
}

function relabelEventsCard(card: HTMLElement, title: string) {
  const heading = card.querySelector<HTMLElement>('.academic-calendar-detail__section-head h2');
  if (!heading || text(heading.textContent) === title) return;
  heading.textContent = title;
  heading.dataset.raqeemCalendarEventsTitle = '1';
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

function applyRegulatoryLockedActions(
  card: HTMLElement,
  events: AcademicCalendarEvent[],
  actionsLabel: string,
  readOnlyLabel: string,
) {
  const table = card.querySelector<HTMLTableElement>('table');
  if (!table) return;

  const headers = Array.from(table.querySelectorAll<HTMLTableCellElement>('thead th'));
  const actionIndex = headers.findIndex((header) => text(header.textContent) === actionsLabel);
  if (actionIndex < 0) return;

  const rows = Array.from(table.querySelectorAll<HTMLTableRowElement>('tbody tr'));
  rows.forEach((row, index) => {
    const cell = row.cells.item(actionIndex);
    const event = events[index];
    if (!cell || !event) return;

    const actionNodes = Array.from(
      cell.querySelectorAll<HTMLElement>('button, a, [role="button"]'),
    );
    const existingLabel = cell.querySelector<HTMLElement>('[data-raqeem-regulatory-read-only="1"]');
    const locked = !academicCalendarEventAllowsMutation(event);

    if (locked) {
      for (const action of actionNodes) {
        action.dataset.raqeemRegulatoryAction = '1';
        action.style.display = 'none';
        action.setAttribute('aria-hidden', 'true');
        if ('tabIndex' in action) action.tabIndex = -1;
      }
      if (!existingLabel) {
        const label = document.createElement('span');
        label.className = 'muted tiny';
        label.dataset.raqeemRegulatoryReadOnly = '1';
        label.textContent = readOnlyLabel;
        cell.append(label);
      } else if (text(existingLabel.textContent) !== readOnlyLabel) {
        existingLabel.textContent = readOnlyLabel;
      }
      cell.dataset.raqeemRegulatoryLocked = '1';
      return;
    }

    existingLabel?.remove();
    delete cell.dataset.raqeemRegulatoryLocked;
    for (const action of actionNodes) {
      if (action.dataset.raqeemRegulatoryAction !== '1') continue;
      action.style.removeProperty('display');
      action.removeAttribute('aria-hidden');
      action.removeAttribute('tabindex');
      delete action.dataset.raqeemRegulatoryAction;
    }
  });
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

  headers[actionIndex].style.removeProperty('display');
  delete headers[actionIndex].dataset.raqeemHiddenAction;
  for (const cell of actionCells) {
    cell.style.removeProperty('display');
    delete cell.dataset.raqeemHiddenAction;
  }

  const hasAction = actionCells.some((cell) =>
    Array.from(cell.querySelectorAll<HTMLElement>('button, a, [role="button"]')).some(
      (action) => action.style.display !== 'none' && action.getAttribute('aria-hidden') !== 'true',
    ),
  );
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

export function AcademicCalendarDetailUxEnhancer({
  calendar,
}: {
  calendar: AcademicCalendarDetail;
}) {
  const t = useT();
  const { locale } = useLocale();
  const events = useMemo(
    () => mergeCalendarEventsForDisplay(calendar.events, calendar.provisional_events),
    [calendar.events, calendar.provisional_events],
  );

  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.academic-calendar-detail');
    if (!root) return;

    const apply = () => {
      const eventsCard = findEventsCard(root, t('admin.academicCalendars.events.title'));
      if (eventsCard) {
        simplifySingleDayPeriods(eventsCard, t('admin.academicCalendars.columns.period'));
        replaceRawEventTypeLabels(eventsCard, GENERIC_EVENT_LABEL[locale]);
        applyRegulatoryLockedActions(
          eventsCard,
          events,
          t('common.actions'),
          REGULATORY_READ_ONLY_LABEL[locale],
        );
        hideEmptyActionsColumn(eventsCard, t('common.actions'));
        relabelEventsCard(eventsCard, ALL_EVENTS_TITLE[locale]);
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
  }, [events, locale, t]);

  return null;
}
