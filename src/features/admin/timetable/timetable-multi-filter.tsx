'use client';
import { useId, useState } from 'react';
import type { TranslateFn } from '@/features/i18n/locale-context';
import type { FilterOption } from './utils/timetable-workspace-filters';

/** Local domain facet: native disclosure + checkboxes, no custom listbox keyboard model. */
export function TimetableMultiFilter({label,options,selected,onChange,t}: {
  label: string; options: FilterOption[]; selected: string[]; onChange: (values: string[]) => void; t: TranslateFn;
}) {
  const id = useId();
  const [query,setQuery] = useState('');
  const visible = options.filter((option) => option.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  return <details className="timetable-facet" onBlur={(event) => {
    if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
  }} onKeyDown={(event) => {
    if (event.key === 'Escape') {
      event.currentTarget.open = false;
      event.currentTarget.querySelector('summary')?.focus();
    }
  }}>
    <summary>{label}<span className="muted tiny">{selected.length ? t('timetableFilters.selected', {count:selected.length}) : t('timetableFilters.all')}</span></summary>
    <div className="timetable-facet__panel">
      <label htmlFor={id}>{t('timetableFilters.search', {name:label})}</label>
      <input className="input" id={id} type="search" value={query} onChange={(event) => setQuery(event.target.value)} />
      <div className="timetable-facet__actions">
        <button type="button" className="btn btn--ghost btn--sm" disabled={!visible.length} onClick={() => onChange([...new Set([...selected,...visible.map((option) => option.id)])])}>{t('timetableFilters.selectResults')}</button>
        <button type="button" className="btn btn--ghost btn--sm" disabled={!selected.length} onClick={() => onChange([])}>{t('timetableFilters.clear')}</button>
      </div>
      <fieldset className="timetable-facet__options"><legend className="timetable-facet__legend">{label}</legend>
        {visible.map((option) => <label key={option.id}><input type="checkbox" checked={selected.includes(option.id)} onChange={(event) => onChange(event.target.checked ? [...selected, option.id] : selected.filter((value) => value !== option.id))} /><span dir="auto">{option.name}</span></label>)}
        {!visible.length && <p className="muted tiny">{t('timetableFilters.noOptions')}</p>}
      </fieldset>
    </div>
  </details>;
}
