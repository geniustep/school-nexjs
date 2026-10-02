'use client';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, PageHeader } from '@/components/ui/primitives';
import { fetchAllStaffAttendanceMonthly, fetchStaffAttendanceHistory, fetchStaffAttendanceMonthly, fetchStaffAttendanceMonthlyDetail, fetchStaffAttendanceToday } from './api';
import type { StaffAttendanceHistoryRow, StaffAttendanceMonthlyDetail, StaffAttendanceMonthlyRow, StaffAttendanceTodayMeta, StaffAttendanceTodayRow } from './types';
import './staff-attendance.css';

const EMPTY={total_staff:0,present_today:0,no_record_today:0};
const now=new Date();
const nameOf=(r:{name:string;name_ar?:string|null;name_fr?:string|null})=>r.name_ar||r.name_fr||r.name||'—';
const timeOf=(v?:string|null)=>{if(!v)return '—';const m=v.match(/(\d{2}:\d{2})(?::\d{2})?$/);return m?.[1]??v;};
const durationOf=(m?:number|null,d?:string|null)=>d||(m==null?'—':`${Math.floor(m/60)}س ${m%60}د`);
const dailyDurationOf=(s?:string,m?:number|null,d?:string|null)=>s==='insufficient_interval'?'غير مكتملة':(m==null?'غير محسوبة':durationOf(m,d));
const monthName=(month:number,year:number)=>new Intl.DateTimeFormat('ar-MA',{month:'long',year:'numeric'}).format(new Date(year,month-1,1));
const dayLabel=(s?:string)=>({present_complete:'مدة مكتملة',single_morning_record:'تسجيل صباحي واحد',single_record:'تسجيل واحد',insufficient_interval:'فاصل أقل من 4 ساعات',no_record:'لم يسجل'}[s||'']||'مسجل');
const tone=(s?:string)=>s==='present_complete'?'green':s==='no_record'?'slate':'amber';

export default function StaffAttendancePage(){
 const [view,setView]=useState<'today'|'monthly'|'history'>('today');
 const [rows,setRows]=useState<StaffAttendanceTodayRow[]>([]),[meta,setMeta]=useState<StaffAttendanceTodayMeta|null>(null);
 const [loading,setLoading]=useState(false),[error,setError]=useState(''),[searchInput,setSearchInput]=useState(''),[search,setSearch]=useState('');
 const [status,setStatus]=useState<'all'|'present'|'no_record'|'present_complete'|'single_morning_record'|'single_record'|'insufficient_interval'>('all');
 const [localDate,setLocalDate]=useState('');
 const [month,setMonth]=useState(now.getMonth()+1),[year,setYear]=useState(now.getFullYear()),[monthly,setMonthly]=useState<StaffAttendanceMonthlyRow[]>([]);
 const [monthlyLoading,setMonthlyLoading]=useState(false),[monthlyError,setMonthlyError]=useState(''),[exporting,setExporting]=useState(false),[detail,setDetail]=useState<StaffAttendanceMonthlyDetail|null>(null),[detailLoading,setDetailLoading]=useState(false);
 const [history,setHistory]=useState<StaffAttendanceHistoryRow[]>([]),[historyLoading,setHistoryLoading]=useState(false),[historyError,setHistoryError]=useState('');
 const [dateFrom,setDateFrom]=useState(''),[dateTo,setDateTo]=useState(''),[historySearch,setHistorySearch]=useState('');

 const loadToday=useCallback(async()=>{setLoading(true);setError('');const r=await fetchStaffAttendanceToday({search,status,local_date:localDate||undefined,page:1,page_size:100});if(r.success){setRows(r.data||[]);setMeta(r.meta as unknown as StaffAttendanceTodayMeta);}else{setRows([]);setError(r.error.message||'تعذر تحميل الحضور.');}setLoading(false);},[search,status,localDate]);
 const loadMonthly=useCallback(async()=>{setMonthlyLoading(true);setMonthlyError('');const r=await fetchStaffAttendanceMonthly({month,year,search:search||undefined,page:1,page_size:100});if(r.success)setMonthly(r.data||[]);else{setMonthly([]);setMonthlyError(r.error.message||'تعذر تحميل التقرير الشهري.');}setMonthlyLoading(false);},[month,year,search]);
 const loadHistory=useCallback(async()=>{setHistoryLoading(true);setHistoryError('');const r=await fetchStaffAttendanceHistory({date_from:dateFrom||undefined,date_to:dateTo||undefined,page:1,page_size:100});if(r.success)setHistory(r.data||[]);else{setHistory([]);setHistoryError(r.error.message||'تعذر تحميل سجل التسجيلات.');}setHistoryLoading(false);},[dateFrom,dateTo]);
 useEffect(()=>{if(view==='today')void loadToday();if(view==='monthly')void loadMonthly();if(view==='history')void loadHistory();},[view,loadToday,loadMonthly,loadHistory]);
 const staffById=useMemo(()=>new Map(rows.map(r=>[r.staff_relationship_id,r])),[rows]);
 const filteredHistory=useMemo(()=>{const q=historySearch.trim().toLowerCase();if(!q)return history;return history.filter(e=>{const s=staffById.get(e.staff_relationship_id);return [s?.name,s?.name_ar,s?.name_fr,e.external_person_id,e.source_device?.name].filter(Boolean).join(' ').toLowerCase().includes(q);});},[history,historySearch,staffById]);
 const summary=meta?.summary??EMPTY;
 const submit=(e:FormEvent)=>{e.preventDefault();setSearch(searchInput.trim());};
 const openDetail=async(r:StaffAttendanceMonthlyRow)=>{setDetailLoading(true);const x=await fetchStaffAttendanceMonthlyDetail(r.staff_relationship_id,month,year);if(x.success)setDetail(x.data||null);setDetailLoading(false);};
 const exportExcel=async()=>{
  setExporting(true);setMonthlyError('');
  try{
   const all=await fetchAllStaffAttendanceMonthly({month,year,search:search||undefined});
   if(!all.success){setMonthlyError(all.error.message||'تعذر تجهيز ملف Excel.');return;}
   const ExcelJS=(await import('exceljs')).default;
   const wb=new ExcelJS.Workbook();wb.creator='Raqeem';wb.created=new Date();
   const ws=wb.addWorksheet('التقرير الشهري',{views:[{rightToLeft:true}]});
   ws.addRow([`تقرير حضور الطاقم — ${monthName(month,year)}`]);ws.mergeCells(1,1,1,7);
   ws.addRow(['الموظف','الفئة','أيام العمل المسجلة','أيام بها تسجيل','أيام المدة المكتملة','إجمالي مدة الحضور','متوسط مدة الحضور']);
   for(const r of all.data||[])ws.addRow([nameOf(r),r.relationship_category||r.role||'',r.recorded_work_days,r.days_with_records,r.duration_complete_days??r.complete_days,durationOf(r.total_attendance_duration_minutes),r.average_attendance_duration_minutes==null?'غير محسوبة':durationOf(r.average_attendance_duration_minutes,r.average_attendance_duration_display)]);
   ws.columns=[{width:30},{width:18},{width:20},{width:18},{width:20},{width:22},{width:22}];ws.getRow(2).font={bold:true};
   const details=wb.addWorksheet('تفاصيل الأيام',{views:[{rightToLeft:true}]});
   details.addRow(['الموظف','التاريخ','أول تسجيل','آخر تسجيل','عدد التسجيلات','حالة اليوم','يوم عمل مسجل','مدة الحضور','ملاحظة']);details.getRow(1).font={bold:true};
   for(const r of all.data||[]){const x=await fetchStaffAttendanceMonthlyDetail(r.staff_relationship_id,month,year);if(!x.success)continue;for(const d of x.data?.days||[])details.addRow([nameOf(r),d.local_date,timeOf(d.first_seen_at),timeOf(d.last_seen_at),d.observations_count,dayLabel(d.day_status),d.recorded_work_day?'نعم':'لا',dailyDurationOf(d.day_status,d.attendance_duration_minutes,d.attendance_duration_display),d.note||'']);}
   details.columns=[{width:30},{width:14},{width:14},{width:14},{width:14},{width:22},{width:16},{width:20},{width:45}];
   const buf=await wb.xlsx.writeBuffer();const blob=new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`raqeem-attendance-${year}-${String(month).padStart(2,'0')}.xlsx`;a.click();URL.revokeObjectURL(url);
  }catch{setMonthlyError('تعذر إنشاء ملف Excel.');}finally{setExporting(false);}
 };
 const printMonthly=()=>window.print();

 return <div className="admin-workspace staff-attendance-page">
  <PageHeader title="حضور الطاقم" />
  <div className="staff-attendance-tabs" role="tablist">
   <button className={view==='today'?'is-active':''} onClick={()=>setView('today')}>اليوم</button>
   <button className={view==='monthly'?'is-active':''} onClick={()=>setView('monthly')}>التقرير الشهري</button>
   <button className={view==='history'?'is-active':''} onClick={()=>setView('history')}>سجل التسجيلات</button>
  </div>
  <p className="staff-attendance-lead">يظهر فقط الطاقم المرتبط فعليًا بجهاز الحضور. عدم وجود تسجيل لا يعني الغياب.</p>

  {view==='today'&&<>
   <div className="staff-attendance-summary">
    <button className={status==='all'?'is-active':''} onClick={()=>setStatus('all')}><span>الطاقم المرتبط</span><strong>{summary.total_staff}</strong></button>
    <button className={status==='present'?'is-active':''} onClick={()=>setStatus('present')}><span>له تسجيل اليوم</span><strong>{summary.present_today}</strong></button>
    <button className={status==='no_record'?'is-active':''} onClick={()=>setStatus('no_record')}><span>لم يسجل اليوم</span><strong>{summary.no_record_today}</strong></button>
   </div>
   <form className="staff-attendance-toolbar" onSubmit={submit}>
    <input className="input" value={searchInput} onChange={e=>setSearchInput(e.target.value)} placeholder="ابحث باسم الموظف…" />
    <input className="input attendance-date" type="date" value={localDate} onChange={e=>setLocalDate(e.target.value)} />
    <select className="input attendance-status" value={status} onChange={e=>setStatus(e.target.value as typeof status)}>
     <option value="all">كل الحالات</option><option value="present">له تسجيل</option><option value="present_complete">مدة مكتملة</option><option value="single_morning_record">تسجيل صباحي واحد</option><option value="single_record">تسجيل واحد</option><option value="insufficient_interval">فاصل أقل من 4 ساعات</option><option value="no_record">لم يسجل</option>
    </select>
    <button className="btn btn--primary btn--sm">بحث</button><button className="btn btn--secondary btn--sm" type="button" onClick={()=>void loadToday()}>تحديث البيانات</button>
   </form>
   {error&&<div className="staff-attendance-error">{error}</div>}{loading&&<div className="staff-attendance-state">جارٍ تحميل الحضور…</div>}
   {!loading&&!error&&<div className="staff-attendance-table-wrap"><table className="staff-attendance-table"><thead><tr><th>الموظف</th><th>الحالة</th><th>أول تسجيل</th><th>آخر تسجيل</th><th>مدة الحضور</th><th>التسجيلات</th></tr></thead><tbody>
    {rows.map(r=><tr key={r.staff_relationship_id}><td><strong dir="auto">{nameOf(r)}</strong>{r.name_fr&&r.name_fr!==nameOf(r)&&<small dir="auto">{r.name_fr}</small>}</td><td><Badge tone={tone(r.day_status)}>{dayLabel(r.day_status)}</Badge>{r.note&&<small className="attendance-note">{r.note}</small>}</td><td>{timeOf(r.first_seen_at)}</td><td>{timeOf(r.last_seen_at)}</td><td><strong>{durationOf(r.attendance_duration_minutes,r.attendance_duration_display)}</strong></td><td>{r.observations_count}</td></tr>)}
    {!rows.length&&<tr><td colSpan={6} className="staff-attendance-empty">لا توجد نتائج مطابقة.</td></tr>}
   </tbody></table></div>}
  </>}

  {view==='monthly'&&<section className="attendance-monthly">
   <div className="staff-attendance-toolbar attendance-monthly-actions"><select className="input" value={month} onChange={e=>setMonth(Number(e.target.value))}>{Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>{new Intl.DateTimeFormat('ar-MA',{month:'long'}).format(new Date(2026,i,1))}</option>)}</select><input className="input attendance-year" type="number" min="2000" value={year} onChange={e=>setYear(Number(e.target.value))}/><button className="btn btn--secondary btn--sm" onClick={()=>void loadMonthly()}>تحديث التقرير</button><button className="btn btn--secondary btn--sm no-print" disabled={exporting} onClick={()=>void exportExcel()}>{exporting?'جارٍ التصدير…':'تصدير Excel'}</button><button className="btn btn--secondary btn--sm no-print" onClick={printMonthly}>طباعة / حفظ PDF</button></div><div className="attendance-print-heading"><h2>تقرير حضور الطاقم</h2><p>{monthName(month,year)}</p></div>
   <p className="attendance-policy">اليوم ذو تسجيل صباحي واحد يُحتسب يوم عمل مسجلًا، لكن لا تُفترض له ساعات. المدة تُحسب فقط عندما يفصل بين أول وآخر تسجيل 4 ساعات على الأقل.</p>
   {monthlyError&&<div className="staff-attendance-error">{monthlyError}</div>}{monthlyLoading&&<div className="staff-attendance-state">جارٍ إعداد التقرير الشهري…</div>}
   {!monthlyLoading&&!monthlyError&&<div className="staff-attendance-table-wrap"><table className="staff-attendance-table"><thead><tr><th>الموظف</th><th>أيام العمل المسجلة</th><th>أيام بتسجيل</th><th>إجمالي مدة الحضور</th><th>المتوسط اليومي</th><th></th></tr></thead><tbody>{monthly.map(r=><tr key={r.staff_relationship_id}><td><strong dir="auto">{nameOf(r)}</strong></td><td><strong>{r.recorded_work_days}</strong></td><td>{r.days_with_records}</td><td>{durationOf(r.total_attendance_duration_minutes)}</td><td>{durationOf(r.average_attendance_duration_minutes,r.average_attendance_duration_display)}</td><td><button className="btn btn--secondary btn--sm" onClick={()=>void openDetail(r)}>تفاصيل الأيام</button></td></tr>)}{!monthly.length&&<tr><td colSpan={6} className="staff-attendance-empty">لا توجد بيانات لهذا الشهر.</td></tr>}</tbody></table></div>}
  </section>}

  {view==='history'&&<section className="staff-attendance-history-view">
   <div className="staff-attendance-history-filters"><label>من تاريخ<input className="input" type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}/></label><label>إلى تاريخ<input className="input" type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}/></label><label className="staff-attendance-history-search">بحث<input className="input" value={historySearch} onChange={e=>setHistorySearch(e.target.value)} placeholder="اسم الموظف أو الجهاز…"/></label><button className="btn btn--secondary btn--sm" onClick={()=>void loadHistory()}>تحديث البيانات</button></div>
   {historyError&&<div className="staff-attendance-error">{historyError}</div>}{historyLoading&&<div className="staff-attendance-state">جارٍ تحميل سجل التسجيلات…</div>}
   {!historyLoading&&!historyError&&<div className="staff-attendance-table-wrap"><table className="staff-attendance-table"><thead><tr><th>التاريخ</th><th>وقت التسجيل</th><th>الموظف</th><th>الجهاز</th><th>طريقة التحقق</th></tr></thead><tbody>{filteredHistory.map(e=>{const s=staffById.get(e.staff_relationship_id);return <tr key={e.id}><td>{e.local_date}</td><td>{timeOf(e.local_time)}</td><td><strong dir="auto">{s?nameOf(s):`#${e.staff_relationship_id}`}</strong></td><td>{e.source_device?.name||e.source_device?.source_device_id||'جهاز الحضور'}</td><td>{e.verification_method||'—'}</td></tr>})}{!filteredHistory.length&&<tr><td colSpan={5} className="staff-attendance-empty">لا توجد تسجيلات في الفترة المحددة.</td></tr>}</tbody></table></div>}
  </section>}

  {(detail||detailLoading)&&<div className="staff-attendance-history" role="dialog" aria-modal="true"><button className="staff-attendance-history__backdrop" onClick={()=>setDetail(null)} aria-label="إغلاق"/><section><header><div><h2>{detail?nameOf(detail):'تفاصيل الشهر'}</h2><p>{month}/{year}</p></div><button className="btn btn--secondary btn--sm" onClick={()=>setDetail(null)}>إغلاق</button></header>{detailLoading?<div className="staff-attendance-state">جارٍ تحميل التفاصيل…</div>:detail&&<><div className="attendance-detail-summary"><strong>{detail.recorded_work_days}</strong><span>أيام عمل مسجلة</span><strong>{durationOf(detail.total_attendance_duration_minutes)}</strong><span>إجمالي مدة الحضور</span></div><div className="staff-attendance-history__list">{detail.days.map(d=><article key={d.local_date}><strong>{d.local_date}</strong><span>{timeOf(d.first_seen_at)} ← {timeOf(d.last_seen_at)} · {dailyDurationOf(d.day_status,d.attendance_duration_minutes,d.attendance_duration_display)}</span><Badge tone={tone(d.day_status)}>{dayLabel(d.day_status)}</Badge>{d.note&&<small>{d.note}</small>}</article>)}</div></>}</section></div>}
 </div>;
}
