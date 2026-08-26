import type { AdminRequest } from './types';
import { requestTitle } from './types';

export type AdminRequestListFilters = {
  query: string;
  typeId: string;
  state: string;
  showClosed: boolean;
};

function typeIdOf(request: AdminRequest): string {
  return typeof request.type === 'object' && request.type?.id ? String(request.type.id) : '';
}

function typeNameOf(request: AdminRequest): string {
  return typeof request.type === 'object' ? request.type?.name ?? '' : request.type ?? '';
}

function searchableText(request: AdminRequest): string {
  return [
    requestTitle(request),
    request.reference,
    request.description,
    typeNameOf(request),
    request.student?.name,
    request.assigned?.name,
  ]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase();
}

export function filterAdminRequests(
  requests: AdminRequest[],
  filters: AdminRequestListFilters,
): AdminRequest[] {
  const query = filters.query.trim().toLocaleLowerCase();
  return requests.filter((request) => {
    if (!filters.showClosed && request.state === 'closed') return false;
    if (filters.typeId && typeIdOf(request) !== filters.typeId) return false;
    if (filters.state && request.state !== filters.state) return false;
    if (query && !searchableText(request).includes(query)) return false;
    return true;
  });
}

export function adminRequestTypeOptions(requests: AdminRequest[]): Array<{ id: string; name: string }> {
  const options = new Map<string, string>();
  for (const request of requests) {
    const id = typeIdOf(request);
    const name = typeNameOf(request);
    if (id && name && !options.has(id)) options.set(id, name);
  }
  return Array.from(options, ([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function adminRequestStateOptions(requests: AdminRequest[], showClosed: boolean): string[] {
  return Array.from(new Set(requests.map((request) => request.state)))
    .filter((state) => showClosed || state !== 'closed')
    .sort();
}
