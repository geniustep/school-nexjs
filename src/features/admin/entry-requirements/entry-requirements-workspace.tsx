'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/primitives';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { entryRequirementEndpoints } from '@/lib/api/entry-requirements-endpoints';
import { hasPermission } from '@/lib/permissions/permissions';
import { useSession } from '@/features/auth/session-context';
import { requirementItemTypeLabel, requirementStateLabel, type RequirementItem, type RequirementItemType, type RequirementList, type TeachingOfferingChoice } from '@/features/entry-requirements/entry-requirements-contract';
import styles from '@/features/library/product-workspaces.module.css';

type RefRow = { id: number; name?: string; full_name?: string; code?: string; level_id?: number };
const ITEM_TYPES: RequirementItemType[] = ['textbook','book','notebook','stationery','uniform','material','other'];

export function AdminEntryRequirementsWorkspace() {
  const user = useSession();
  const { activeAcademicYearId, academicYears, academicYearLoading } = useAdminSession();
  const canManage = hasPermission(user, 'entry_requirements.manage');
  const canPublish = hasPermission(user, 'entry_requirements.publish');
  const [lists,setLists] = useState<RequirementList[]>([]);
  const [selected,setSelected] = useState<RequirementList|null>(null);
  const [levels,setLevels] = useState<RefRow[]>([]);
  const [classes,setClasses] = useState<RefRow[]>([]);
  const [subjects,setSubjects] = useState<RefRow[]>([]);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  const [loading,setLoading] = useState(false);
  const [newOpen,setNewOpen] = useState(false);
  const [newName,setNewName] = useState('تجهيزات الدخول المدرسي');
  const [newLevel,setNewLevel] = useState('');
  const [newClass,setNewClass] = useState('');
  const [itemType,setItemType] = useState<RequirementItemType>('textbook');
  const [itemName,setItemName] = useState('');
  const [itemQty,setItemQty] = useState('1');
  const [itemSubject,setItemSubject] = useState('');
  const [offeringId,setOfferingId] = useState('');
  const [offerings,setOfferings] = useState<TeachingOfferingChoice[]>([]);
  const [itemImportance,setItemImportance] = useState<'required'|'optional'>('required');
  const [itemProvision,setItemProvision] = useState<'family'|'school'>('family');
  const [itemReusable,setItemReusable] = useState<'yes'|'no'|''>('');

  const loadLists = useCallback(async () => {
    if (!activeAcademicYearId) return;
    setLoading(true); setError('');
    const result = await api.get<RequirementList[]>(entryRequirementEndpoints.admin.lists,{academic_year_id:activeAcademicYearId,page:1,page_size:100});
    setLoading(false);
    if (!result.success) setError(result.error.message); else setLists(result.data);
  },[activeAcademicYearId]);

  useEffect(()=>{void loadLists();},[loadLists]);
  useEffect(()=>{void Promise.all([
    api.get<RefRow[]>(endpoints.admin.levels,{page:1,page_size:200,active:1}),
    api.get<RefRow[]>(endpoints.admin.classes,{page:1,page_size:300,academic_year_id:activeAcademicYearId??undefined}),
    api.get<RefRow[]>(endpoints.admin.subjects,{page:1,page_size:300,active:1}),
  ]).then(([l,c,s])=>{if(l.success)setLevels(l.data);if(c.success)setClasses(c.data);if(s.success)setSubjects(s.data);});},[activeAcademicYearId]);

  async function openList(id:number){ setError(''); const r=await api.get<RequirementList>(entryRequirementEndpoints.admin.list(id)); if(!r.success)setError(r.error.message);else setSelected(r.data); }
  async function mutate(path:string,body:unknown={}){ setError('');setNotice('');const r=await api.post<RequirementList|Record<string,unknown>>(path,body);if(!r.success){setError(r.error.message);return false;}setNotice('تم حفظ العملية بنجاح.');await loadLists();if(selected)await openList(selected.id);return true; }

  async function createList(e:FormEvent){e.preventDefault();if(!activeAcademicYearId||!newLevel)return;const r=await api.post<RequirementList>(entryRequirementEndpoints.admin.lists,{academic_year_id:activeAcademicYearId,level_id:Number(newLevel),class_id:newClass?Number(newClass):undefined,name:newName});if(!r.success){setError(r.error.message);return;}setNewOpen(false);setNotice('تم إنشاء المسودة.');await loadLists();await openList(r.data.id);}

  useEffect(()=>{ if(itemType!=='textbook'||!selected||!itemSubject){setOfferings([]);setOfferingId('');return;} void api.get<TeachingOfferingChoice[]>(entryRequirementEndpoints.admin.teachingOfferings,{academic_year_id:selected.academic_year_id,level_id:selected.level_id,subject_id:Number(itemSubject),track_id:selected.track_id??undefined,page:1,page_size:80}).then(r=>{if(r.success)setOfferings(r.data);}); },[itemSubject,itemType,selected]);

  async function addItem(e:FormEvent){e.preventDefault();if(!selected)return;const body:Record<string,unknown>={item_type:itemType,quantity:Number(itemQty)||1,importance:itemImportance,provision_source:itemProvision,reusable_allowed:itemReusable||undefined};if(itemType==='textbook'){if(!offeringId){setError('اختر المقرر المعتمد أولًا.');return;}body.teaching_offering_id=Number(offeringId);body.subject_id=Number(itemSubject);const off=offerings.find(o=>String(o.id)===offeringId);body.name=off?.reference.title||'كتاب مقرر';}else{if(!itemName.trim()){setError('أدخل اسم العنصر.');return;}body.name=itemName.trim();if(itemSubject)body.subject_id=Number(itemSubject);}const r=await api.post<RequirementItem>(entryRequirementEndpoints.admin.items(selected.id),body);if(!r.success){setError(r.error.message);return;}setItemName('');setOfferingId('');setNotice('تمت إضافة العنصر.');await openList(selected.id);}

  async function deleteItem(item:RequirementItem){if(!selected)return;const r=await api.delete<{deleted:boolean}>(entryRequirementEndpoints.admin.item(selected.id,item.id));if(!r.success)setError(r.error.message);else await openList(selected.id);}

  async function publish(){if(!selected)return;setError('');const r=await api.post<{warnings:Array<{message:string}>;published_revision:RequirementList}>(entryRequirementEndpoints.admin.publish(selected.id),{});if(!r.success){const details=r.error.details as {blockers?:Array<{message:string}>;warnings?:Array<{message:string}>}|undefined;const blockers=details?.blockers?.map(x=>x.message).join(' · ');setError(blockers||r.error.message);return;}setNotice(r.data.warnings?.length?`تم النشر مع ${r.data.warnings.length} تنبيه.`:'تم نشر اللائحة.');await loadLists();await openList(selected.id);}

  const editable=selected?.state==='draft'||selected?.state==='under_review';
  const currentYear=academicYears.find(y=>y.id===activeAcademicYearId);
  const classesForLevel=useMemo(()=>classes.filter(c=>!newLevel||!c.level_id||String(c.level_id)===newLevel),[classes,newLevel]);

  return <div className={styles.workspace}>
    <PageHeader title="تجهيزات الدخول المدرسي" subtitle={currentYear?.name ? `السنة الدراسية: ${currentYear.name}`:'الكتب والأدوات واللوازم التي تنشرها المدرسة للأسر.'} actions={canManage?<button className="btn btn--primary" onClick={()=>setNewOpen(v=>!v)}>إنشاء لائحة</button>:undefined}/>
    {academicYearLoading?<div className={styles.notice}>جارٍ حسم السنة الدراسية…</div>:null}
    {notice?<div className={`${styles.notice} ${styles.success}`}>{notice}</div>:null}{error?<div className={`${styles.notice} ${styles.error}`}>{error}</div>:null}
    {newOpen?<form className={styles.card} onSubmit={createList}><h2 className={styles.sectionTitle}>لائحة جديدة</h2><div className={styles.formGrid}><label className={styles.field}>اسم اللائحة<input className="input" value={newName} onChange={e=>setNewName(e.target.value)}/></label><label className={styles.field}>المستوى<select className="select" required value={newLevel} onChange={e=>{setNewLevel(e.target.value);setNewClass('');}}><option value="">اختر المستوى</option>{levels.map(x=><option key={x.id} value={x.id}>{x.name??`#${x.id}`}</option>)}</select></label><label className={styles.field}>القسم — اختياري<select className="select" value={newClass} onChange={e=>setNewClass(e.target.value)}><option value="">كل أقسام المستوى</option>{classesForLevel.map(x=><option key={x.id} value={x.id}>{x.name??`#${x.id}`}</option>)}</select></label></div><div className={styles.actions}><button className="btn btn--primary">حفظ المسودة</button><button type="button" className="btn btn--ghost" onClick={()=>setNewOpen(false)}>إلغاء</button></div></form>:null}

    <div className={styles.grid}>{lists.map(row=><button key={row.id} className={styles.card} style={{textAlign:'start',cursor:'pointer'}} onClick={()=>void openList(row.id)}><div className={styles.cardHeader}><strong>{row.name}</strong><span className={styles.badge}>{requirementStateLabel(row.state)}</span></div><span className={styles.muted}>{row.level}{row.class_name?` · ${row.class_name}`:''}{row.track?` · ${row.track}`:''}</span><span>{row.item_count} عنصرًا · النسخة {row.revision}</span>{row.state==='published'&&row.is_current?<span className={styles.badge}>النسخة الحالية</span>:null}</button>)}</div>
    {!loading&&!lists.length?<div className={styles.empty}>لا توجد لائحة لهذه السنة بعد.</div>:null}

    {selected?<section className={styles.card}><div className={styles.cardHeader}><div><h2 style={{margin:0}}>{selected.name}</h2><span className={styles.muted}>{selected.level}{selected.class_name?` · ${selected.class_name}`:''} · النسخة {selected.revision}</span></div><button className="btn btn--ghost btn--sm" onClick={()=>setSelected(null)}>إغلاق</button></div><div className={styles.actions}>{canManage&&selected.state==='draft'?<button className="btn btn--ghost" onClick={()=>void mutate(entryRequirementEndpoints.admin.submitForReview(selected.id))}>إرسال للمراجعة</button>:null}{canPublish&&(selected.state==='draft'||selected.state==='under_review')?<button className="btn btn--primary" onClick={()=>void publish()}>نشر اللائحة</button>:null}{canManage&&selected.state==='published'?<button className="btn btn--primary" onClick={()=>void mutate(entryRequirementEndpoints.admin.createRevision(selected.id))}>إنشاء نسخة محدثة</button>:null}{canPublish&&selected.state==='published'?<button className="btn btn--ghost" onClick={()=>void mutate(entryRequirementEndpoints.admin.archive(selected.id))}>أرشفة</button>:null}</div>
      {selected.changes?<details><summary>التغييرات عن النسخة السابقة</summary><div className={styles.summary}><div className={styles.summaryItem}><strong>{selected.changes.added.length}</strong>أضيف</div><div className={styles.summaryItem}><strong>{selected.changes.changed.length}</strong>تغير</div><div className={styles.summaryItem}><strong>{selected.changes.removed.length}</strong>حذف</div></div></details>:null}
      <h3 className={styles.sectionTitle}>عناصر اللائحة</h3><div className={styles.list}>{selected.items?.map(item=><div key={item.id} className={styles.row}><div className={styles.rowMain}><strong>{item.name} {item.quantity!==1?`× ${item.quantity}`:''}</strong><span className={styles.tiny}>{requirementItemTypeLabel(item.item_type)}{item.subject?` · ${item.subject}`:''}{item.provision_source==='school'?' · توفره المدرسة':''}{item.reusable?' · قابل لإعادة الاستعمال':''}</span>{item.needs_resolution?<span className={styles.badge}>يحتاج مراجعة المقرر</span>:null}</div>{canManage&&editable?<button className="btn btn--ghost btn--sm" onClick={()=>void deleteItem(item)}>حذف</button>:null}</div>)}</div>
      {canManage&&editable?<form className={styles.card} onSubmit={addItem}><h3 className={styles.sectionTitle}>إضافة عنصر</h3><div className={styles.formGrid}><label className={styles.field}>النوع<select className="select" value={itemType} onChange={e=>setItemType(e.target.value as RequirementItemType)}>{ITEM_TYPES.map(t=><option key={t} value={t}>{requirementItemTypeLabel(t)}</option>)}</select></label><label className={styles.field}>الكمية<input className="input" type="number" min="0.1" step="0.1" value={itemQty} onChange={e=>setItemQty(e.target.value)}/></label>{itemType==='textbook'?<><label className={styles.field}>المادة<select className="select" required value={itemSubject} onChange={e=>setItemSubject(e.target.value)}><option value="">اختر المادة</option>{subjects.map(s=><option key={s.id} value={s.id}>{s.name??`#${s.id}`}</option>)}</select></label><label className={`${styles.field} ${styles.fieldFull}`}>المقرر المعتمد<select className="select" required value={offeringId} onChange={e=>setOfferingId(e.target.value)}><option value="">اختر المقرر</option>{offerings.map(o=><option key={o.id} value={o.id}>{o.subject} — {o.reference.title}{o.reference.edition?` — ${o.reference.edition}`:''}</option>)}</select>{itemSubject&&offerings.length===0?<span className={styles.muted}>لا يوجد مقرر معتمد لهذه المادة بعد.</span>:null}</label></>:<label className={`${styles.field} ${styles.fieldFull}`}>اسم العنصر<input className="input" required value={itemName} onChange={e=>setItemName(e.target.value)} placeholder="مثال: دفتر 100 ورقة"/></label>}<label className={styles.field}>الأهمية<select className="select" value={itemImportance} onChange={e=>setItemImportance(e.target.value as 'required'|'optional')}><option value="required">إلزامي</option><option value="optional">اختياري</option></select></label><label className={styles.field}>من يوفره؟<select className="select" value={itemProvision} onChange={e=>setItemProvision(e.target.value as 'family'|'school')}><option value="family">الأسرة</option><option value="school">المدرسة</option></select></label><label className={styles.field}>إعادة الاستعمال<select className="select" value={itemReusable} onChange={e=>setItemReusable(e.target.value as 'yes'|'no'|'')}><option value="">غير محدد</option><option value="yes">يمكن إعادة استعماله</option><option value="no">لا</option></select></label></div><button className="btn btn--primary">إضافة</button></form>:<div className={styles.notice}>اللائحة المنشورة لا تعدّل مباشرة. أنشئ نسخة محدثة لإجراء التغييرات.</div>}
    </section>:null}
  </div>;
}
