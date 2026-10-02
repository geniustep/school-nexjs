'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { Badge, PageHeader } from '@/components/ui/primitives';
import { fetchStaffAttendanceHistory, fetchStaffAttendanceToday } from './api';
import type {
  StaffAttendanceHistoryRow,
  StaffAttendanceStatus,
  StaffAttendanceSummary,
  StaffAttendanceTodayMeta,
  StaffAttendanceTodayRow,
} from './types';
import './staff-attendance.css';

const EMPTY_SUMMARY: StaffAttendanceSummary = {
  total_staff: 0,
  present_today: 0,
  no_record_today: 0,
};

function displayName(row: StaffAttendanceTodayRow) {
  return row.name_ar || row.name_fr || row.name || '—';
}

function formatTime(value?: string | null) {
  if (!value) return '—';
  const match = value.match(/(\d{2}:\d{2})(?::\d{2})?$/);
  return match?.[1] ?? value;
}

function StaffAttendanceContent() {
  const [rows, setRows] = useState<StaffAttendanceTodayRow[]>([]);
  const [meta, setMeta] = useState<StaffAttendanceTodayMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | StaffAttendanceStatus>('all');
  const [selected, setSelected] = useState<StaffAttendanceTodayRow | null>(null);
  const [history, setHistory] = useState<StaffAttendanceHistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');

  const loadToday = useCallback(async () => {
    setLoading(true);
    setError('');
    const response = await fetchStaffAttendanceToday({ search, status, page: 1, page_size: 100 });
    if (!response.success) {
      setError(response.error.message || 'تعذر تحميل حضور الطاقم.');
      setRows([]);
      setLoading(false);
      return;
    }
    setRows(response.data || []);
    setMeta(response.meta as unknown as StaffAttendanceTodayMeta);
    setLoading(false);
  }, [search, status]);

  useEffect(() => { void loadToday(); }, [loadToday]);

  useEffect(() => {
    if (!selected) {
      setHistory([]);
      return;
    }
    let active = true;
    setHistoryLoading(true);
    setHistoryError('');
    void fetchStaffAttendanceHistory({
      staff_relationship_id: selected.staff_relationship_id,
      page: 1,
      page_size: 50,
    }).then((response) => {
      if (!active) return;
      if (response.success) setHistory(response.data || []);
      else setHistoryError(response.error.message || 'تعذر تحميل السجل التاريخي.');
      setHistoryLoading(false);
    });
    return () => { active = false; };
  }, [selected]);

  const summary = meta?.summary ?? EMPTY_SUMMARY;
  const titleDate = useMemo(() => meta?.local_date ? ` — ${meta.local_date}` : '', [meta]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setSearch(searchInput.trim());
  };

  return (
    <div className="admin-workspace staff-attendance-page">
      <PageHeader title={`حضور الطاقم اليوم${titleDate}`} />
      <p className="staff-attendance-lead">
        تسجيلات الدخول الفعلية إلى المؤسسة. «لم يُسجل حضور اليوم» لا تعني الغياب.
        {meta?.timezone ? <span> المنطقة الزمنية: {meta.timezone}</span> : null}
      </p>

      <div className="staff-attendance-summary">
        <button type="button" className={status === 'all' ? 'is-active' : ''} onClick={() => setStatus('all')}>
          <span>إجمالي الطاقم</span><strong>{summary.total_staff}</strong>
        </button>
        <button type="button" className={status === 'present' ? 'is-active' : ''} onClick={() => setStatus('present')}>
          <span>حضر اليوم</span><strong>{summary.present_today}</strong>
        </button>
        <button type="button" className={status === 'no_record' ? 'is-active' : ''} onClick={() => setStatus('no_record')}>
          <span>لم يُسجل حضور اليوم</span><strong>{summary.no_record_today}</strong>
        </button>
      </div>

      <form className="staff-attendance-toolbar" onSubmit={submitSearch}>
        <input
          className="input"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="ابحث باسم الموظف…"
          aria-label="البحث في الطاقم"
        />
        <button className="btn btn--primary btn--sm" type="submit">بحث</button>
        {(search || searchInput) ? (
          <button className="btn btn--secondary btn--sm" type="button" onClick={() => { setSearchInput(''); setSearch(''); }}>
            مسح
          </button>
        ) : null}
        <button className="btn btn--secondary btn--sm" type="button" onClick={() => void loadToday()}>تحديث</button>
      </form>

      {error ? <div className="staff-attendance-error">{error}</div> : null}
      {loading ? <div className="staff-attendance-state">جارٍ تحميل الحضور…</div> : null}

      {!loading && !error ? (
        <div className="staff-attendance-table-wrap">
          <table className="staff-attendance-table">
            <thead><tr><th>الموظف</th><th>الحالة اليوم</th><th>أول تسجيل</th><th>آخر تسجيل</th><th>التسجيلات</th><th></th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.staff_relationship_id}>
                  <td>
                    <strong dir="auto">{displayName(row)}</strong>
                    {row.name_fr && row.name_fr !== displayName(row) ? <small dir="auto">{row.name_fr}</small> : null}
                    {row.role ? <small>{row.role}</small> : null}
                  </td>
                  <td>
                    <Badge tone={row.status === 'present' ? 'green' : 'slate'}>
                      {row.status === 'present' ? 'حضر اليوم' : 'لم يُسجل حضور اليوم'}
                    </Badge>
                  </td>
                  <td>{formatTime(row.first_seen_at)}</td>
                  <td>{formatTime(row.last_seen_at)}</td>
                  <td>{row.observations_count}</td>
                  <td><button className="btn btn--secondary btn--sm" type="button" onClick={() => setSelected(row)}>السجل</button></td>
                </tr>
              ))}
              {rows.length === 0 ? <tr><td colSpan={6} className="staff-attendance-empty">لا توجد نتائج مطابقة.</td></tr> : null}
            </tbody>
          </table>
        </div>
      ) : null}

      {selected ? (
        <div className="staff-attendance-history" role="dialog" aria-modal="true" aria-label="السجل التاريخي">
          <button className="staff-attendance-history__backdrop" aria-label="إغلاق" onClick={() => setSelected(null)} />
          <section>
            <header>
              <div><h2 dir="auto">{displayName(selected)}</h2><p>السجل التاريخي للتسجيلات المقبولة</p></div>
              <button className="btn btn--secondary btn--sm" type="button" onClick={() => setSelected(null)}>إغلاق</button>
            </header>
            {historyLoading ? <div className="staff-attendance-state">جارٍ تحميل السجل…</div> : null}
            {historyError ? <div className="staff-attendance-error">{historyError}</div> : null}
            {!historyLoading && !historyError ? (
              <div className="staff-attendance-history__list">
                {history.map((event) => (
                  <article key={event.id}>
                    <strong>{event.local_date} · {event.local_time}</strong>
                    <span>{event.source_device?.name || event.source_device?.source_device_id || 'جهاز الحضور'}</span>
                    {event.verification_method ? <small>{event.verification_method}</small> : null}
                  </article>
                ))}
                {history.length === 0 ? <div className="staff-attendance-state">لا توجد تسجيلات تاريخية.</div> : null}
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}

export default function StaffAttendancePage() {
  return (
    <RequireAdminPermission permission="view_attendance">
      <StaffAttendanceContent />
    </RequireAdminPermission>
  );
}
