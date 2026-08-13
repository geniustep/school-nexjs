import { createRequire } from 'node:module';
import path from 'node:path';
import { parseWorkspaceListStateFromSearchParams, type AdmissionWorkspaceListState } from './admission-workspace';

export function baseState(overrides: Partial<AdmissionWorkspaceListState> = {}): AdmissionWorkspaceListState {
  return { ...parseWorkspaceListStateFromSearchParams(new URLSearchParams()), ...overrides };
}

export const ALL_ACTIONS = {
  edit: true,
  change_state: true,
  change_processing_stage: true,
  schedule_appointment: true,
  add_assessment: true,
  decide: true,
  create_offer: true,
  send_offer: true,
  accept_offer: true,
  decline_offer: true,
  get_prefill: true,
  link_student: true,
  reopen: true,
};

const require = createRequire(import.meta.url);
const messagesRoot = path.resolve(process.cwd(), 'messages');
export function loadMessages(locale: string) {
  return require(path.join(messagesRoot, `${locale}.json`));
}
