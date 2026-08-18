import type { LibraryCirculationFilter, LibraryTab } from './library-contract';

export type CatalogPolicyFilter = '' | 'loanable' | 'library_only';
export type CopyStateFilter = '' | 'available' | 'on_loan' | 'lost' | 'damaged' | 'repair' | 'withdrawn';

export type LibraryViewState = {
  tab: LibraryTab;
  circulationFilter: LibraryCirculationFilter;
  catalogPolicy: CatalogPolicyFilter;
  copyState: CopyStateFilter;
  query: string;
  page: number;
};

export const defaultLibraryViewState: LibraryViewState = {
  tab: 'catalog',
  circulationFilter: 'checked_out',
  catalogPolicy: '',
  copyState: '',
  query: '',
  page: 1,
};

const tabs = new Set<LibraryTab>(['catalog', 'copies', 'circulation']);
const circulationFilters = new Set<LibraryCirculationFilter>(['checked_out', 'overdue', 'returned']);
const catalogPolicies = new Set<CatalogPolicyFilter>(['', 'loanable', 'library_only']);
const copyStates = new Set<CopyStateFilter>(['', 'available', 'on_loan', 'lost', 'damaged', 'repair', 'withdrawn']);

export function parseLibraryViewSearch(search: string): LibraryViewState {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const tabValue = params.get('tab') as LibraryTab | null;
  const circulationValue = params.get('circulation') as LibraryCirculationFilter | null;
  const policyValue = params.get('policy') as CatalogPolicyFilter | null;
  const stateValue = params.get('state') as CopyStateFilter | null;
  const rawPage = Number(params.get('page') || 1);

  return {
    tab: tabValue && tabs.has(tabValue) ? tabValue : defaultLibraryViewState.tab,
    circulationFilter: circulationValue && circulationFilters.has(circulationValue)
      ? circulationValue
      : defaultLibraryViewState.circulationFilter,
    catalogPolicy: policyValue != null && catalogPolicies.has(policyValue)
      ? policyValue
      : defaultLibraryViewState.catalogPolicy,
    copyState: stateValue != null && copyStates.has(stateValue)
      ? stateValue
      : defaultLibraryViewState.copyState,
    query: params.get('q') || '',
    page: Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1,
  };
}

export function buildLibraryViewSearch(state: LibraryViewState): string {
  const params = new URLSearchParams();
  if (state.tab !== defaultLibraryViewState.tab) params.set('tab', state.tab);
  if (state.query.trim()) params.set('q', state.query.trim());
  if (state.page > 1) params.set('page', String(state.page));

  if (state.tab === 'catalog' && state.catalogPolicy) params.set('policy', state.catalogPolicy);
  if (state.tab === 'copies' && state.copyState) params.set('state', state.copyState);
  if (state.tab === 'circulation' && state.circulationFilter !== 'checked_out') {
    params.set('circulation', state.circulationFilter);
  }

  return params.toString();
}
