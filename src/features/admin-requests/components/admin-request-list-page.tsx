'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useLocale } from '@/features/i18n/locale-context';
import { localeToBcp47 } from '@/lib/i18n/config';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { Badge, Card, PageHeader } from '@/components/ui/primitives';
import type { AdminRequest, AdminRequestRole, AdminRequestList } from '../types';
import {
  adminRequestApiBase,
  adminRequestUiBase,
  requestRows,
  requestTitle,
} from '../types';
import { adminRequestMessage, type AdminRequestMessageKey } from '../i18n';
import { adminRequestControlsMessage } from '../controls-i18n';
import {
  adminRequestStateOptions,
  adminRequestTypeOptions,
  filterAdminRequests,
} from '../list-filters';
import { adminRequestStateLabel, adminRequestTypeLabel } from '../presenters';

function copyKeys(role: AdminRequestRole): {
  title: AdminRequestMessageKey;
  subtitle: AdminRequestMessageKey;
  empty: AdminRequestMessageKey;
} {
  if (role === 'admin') {
    return { title: 'list.adminTitle', subtitle: 'list.subtitleAdmin', empty: 'list.emptyAdmin' };
  }
  if (role === 'staff') {
    return { title: 'list.staffTitle', subtitle: 'list.subtitleStaff', empty: 'list.emptyStaff' };
  }
  return { title: 'list.familyTitle', subtitle: 'list.subtitleFamily', empty: 'list.emptyFamily' };
}

export function AdminRequestListPage({ role }: { role: AdminRequestRole }) {
  const { locale } = useLocale();
  const apiBase = adminRequestApiBase(role);
  const uiBase = adminRequestUiBase(role);
  const resource = useResource<AdminRequest[] | AdminRequestList>(apiBase, undefined, { keepPreviousData: false });
  const copy = copyKeys(role);
  const canCreate = role === 'parent' || role === 'student';
  const dateLocale = localeToBcp47(locale);
  const [query, setQuery] = useState('');
  const [typeId, setTypeId] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [showClosed, setShowClosed] = useState(false);

  return (
    <>
      <PageHeader
        title={adminRequestMessage(locale, copy.title)}
        subtitle={adminRequestMessage(locale, copy.subtitle)}
        actions={canCreate ? (
          <Link href={`${uiBase}/new`} className="btn btn--primary">
            {adminRequestMessage(locale, 'list.new')}
          </Link>
        ) : undefined}
      />
      <ResourceView
        state={resource}
        isEmpty={(data) => requestRows(data).length === 0}
        empty={<Card>{adminRequestMessage(locale, copy.empty)}</Card>}
      >
        {(data) => {
          const rows = requestRows(data);
          const filteredRows = role === 'admin'
            ? filterAdminRequests(rows, { query, typeId, state: stateFilter, showClosed })
            : rows;
          const typeOptions = role === 'admin' ? adminRequestTypeOptions(rows) : [];
          const stateOptions = role === 'admin' ? adminRequestStateOptions(rows, showClosed) : [];

          return (
            <div className="col" style={{ gap: 16 }}>
              {role === 'admin' && (
                <Card>
                  <div className="grid grid--cards" style={{ alignItems: 'end' }}>
                    <div className="field">
                      <label htmlFor="admin-request-search">
                        {adminRequestControlsMessage(locale, 'list.search')}
                      </label>
                      <input
                        id="admin-request-search"
                        className="input"
                        type="search"
                        dir="auto"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder={adminRequestControlsMessage(locale, 'list.searchPlaceholder')}
                      />
                    </div>

                    <div className="field">
                      <label htmlFor="admin-request-type-filter">
                        {adminRequestControlsMessage(locale, 'list.filterType')}
                      </label>
                      <select
                        id="admin-request-type-filter"
                        className="input"
                        value={typeId}
                        onChange={(event) => setTypeId(event.target.value)}
                      >
                        <option value="">{adminRequestControlsMessage(locale, 'list.allTypes')}</option>
                        {typeOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {adminRequestTypeLabel(option.name, locale)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="field">
                      <label htmlFor="admin-request-state-filter">
                        {adminRequestControlsMessage(locale, 'list.filterState')}
                      </label>
                      <select
                        id="admin-request-state-filter"
                        className="input"
                        value={stateFilter}
                        onChange={(event) => setStateFilter(event.target.value)}
                      >
                        <option value="">{adminRequestControlsMessage(locale, 'list.allStates')}</option>
                        {stateOptions.map((state) => (
                          <option key={state} value={state}>{adminRequestStateLabel(state, locale)}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="between" style={{ gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
                    <label className="row" style={{ gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={showClosed}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          setShowClosed(checked);
                          if (!checked && stateFilter === 'closed') setStateFilter('');
                        }}
                      />
                      <span>{adminRequestControlsMessage(locale, 'list.showClosed')}</span>
                    </label>
                    <span className="tiny muted">
                      {adminRequestControlsMessage(locale, 'list.filteredCount', {
                        visible: filteredRows.length,
                        total: rows.length,
                      })}
                    </span>
                  </div>
                </Card>
              )}

              {filteredRows.length === 0 ? (
                <Card>
                  {role === 'admin'
                    ? adminRequestControlsMessage(locale, 'list.noResults')
                    : adminRequestMessage(locale, copy.empty)}
                </Card>
              ) : (
                <div className="grid grid--cards">
                  {filteredRows.map((request: AdminRequest) => {
                    const createdAt = request.created_at ?? request.create_date;
                    return (
                      <Link key={request.id} href={`${uiBase}/${request.id}`} className="row-link">
                        <Card>
                          <div className="between">
                            <strong dir="auto">{requestTitle(request)}</strong>
                            <Badge tone="blue">{adminRequestStateLabel(request.state, locale)}</Badge>
                          </div>
                          <p className="muted tiny" dir="auto">{request.reference ?? `#${request.id}`}</p>
                          {request.assigned?.name && (
                            <p className="muted tiny" dir="auto">
                              {adminRequestMessage(locale, 'list.currentAssignee', { name: request.assigned.name })}
                            </p>
                          )}
                          {createdAt && (
                            <p className="muted tiny">
                              {new Date(createdAt).toLocaleDateString(dateLocale)}
                            </p>
                          )}
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }}
      </ResourceView>
    </>
  );
}
