import { useSyncExternalStore } from 'react';
import {
  normalizeStaffTemplateScopeSelection,
  resetStaffTemplateScopeSelectionForType,
  type StaffTemplateScopeSelection,
  type StaffTemplateScopeType,
} from './staff-template-scope-contract';

export interface StaffTemplateScopeState {
  templateCode: string | null;
  scopeType: StaffTemplateScopeType | null;
  selection: StaffTemplateScopeSelection;
}

const EMPTY_SELECTION: StaffTemplateScopeSelection = { level_ids: [], class_ids: [] };
let state: StaffTemplateScopeState = {
  templateCode: null,
  scopeType: null,
  selection: EMPTY_SELECTION,
};

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function setState(next: StaffTemplateScopeState) {
  state = next;
  emit();
}

export function getStaffTemplateScopeState(): StaffTemplateScopeState {
  return state;
}

export function setStaffTemplateScopeContext(
  templateCode: string,
  scopeType: StaffTemplateScopeType | null,
) {
  const templateChanged = state.templateCode !== templateCode;
  const scopeTypeChanged = state.scopeType !== scopeType;
  const nextSelection =
    templateChanged || scopeTypeChanged
      ? resetStaffTemplateScopeSelectionForType(EMPTY_SELECTION, scopeType)
      : resetStaffTemplateScopeSelectionForType(state.selection, scopeType);

  setState({
    templateCode,
    scopeType,
    selection: nextSelection,
  });
}

export function setStaffTemplateScopeSelection(selection: StaffTemplateScopeSelection) {
  const normalized = resetStaffTemplateScopeSelectionForType(
    normalizeStaffTemplateScopeSelection(selection),
    state.scopeType,
  );
  setState({ ...state, selection: normalized });
}

export function resetStaffTemplateScopeState() {
  setState({
    templateCode: null,
    scopeType: null,
    selection: { level_ids: [], class_ids: [] },
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useStaffTemplateScopeState(): StaffTemplateScopeState {
  return useSyncExternalStore(subscribe, getStaffTemplateScopeState, getStaffTemplateScopeState);
}
