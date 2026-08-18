'use client';

import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/primitives';
import { api } from '@/lib/api/client';
import { entryRequirementEndpoints } from '@/lib/api/entry-requirements-endpoints';
import { familyRequirementItems, requirementItemTypeLabel, requirementProgressLabel, type ParentRequirementChild, type ParentRequirementFamily, type RequirementItem, type RequirementProgress } from '@/features/entry-requirements/entry-requirements-contract';
import { buildFamilyRequirementAggregate } from '@/features/entry-requirements/family-requirement-aggregate';
import styles from '@/features/library/product-workspaces.module.css';

function groupLabel(key: string): string { return ({books:'الكتب',notebooks:'الدفاتر',stationery:'الأدوات',uniform:'الزي',materials:'المستلزمات',other:'أخرى'} as Record<string,string>)[key] ?? key; }

export function ParentEntryRequirementsWorkspace() {
  const [family, setFamily] = useState<ParentRequirementFamily | null>(null);
  const [child, setChild] = useState<ParentRequirementChild | null>(null);
  const [error, setError] = useState('');
  const [busyKey, setBusyKey] = useState('');

  async function loadFamily() { const result = await api.get<ParentRequirementFamily>(entryRequirementEndpoints.parent.family); if (!result.success) setError(result.error.message); else { setFamily(result.data); if (result.data.children.length===1) void openChild(result.data.children[0].student.id); } }
  async function openChild(id: number) { setError(''); const result = await api.get<ParentRequirementChild>(entryRequirementEndpoints.parent.child(id)); if (!result.success) setError(result.error.message); else setChild(result.data); }
  useEffect(() => { void loadFamily(); }, []);

  const progress = useMemo(() => new Map((child?.progress ?? []).map(p => [p.item_stable_key,p.status])), [child]);
  const familyAggregate = useMemo(() => family ? buildFamilyRequirementAggregate(family) : [], [family]);

  async function setProgress(item: RequirementItem, status: RequirementProgress) {
    if (!child) return; setBusyKey(item.stable_key);
    const result = await api.patch<{item_stable_key:string;status:RequirementProgress}>(entryRequirementEndpoints.parent.progress(child.student.id), { item_stable_key:item.stable_key, status });
    setBusyKey('');
    if (!result.success) setError(result.error.message); else setChild({...child,progress:[...child.progress.filter(p=>p.item_stable_key!==item.stable_key),result.data]});
  }

  const percent = family && family.total_family_provided_count > 0 ? Math.round((family.completed_count/family.total_family_provided_count)*100) : 0;
  return <div className={styles.workspace}>
    <PageHeader title="تجهيزات الدخول المدرسي" subtitle="الكتب والأدوات المطلوبة لأبنائك مع قائمة متابعة بسيطة." actions={child ? <button className={`btn btn--ghost ${styles.noPrint}`} onClick={()=>window.print()}>طباعة اللائحة</button> : undefined} />
    {error ? <div className={`${styles.notice} ${styles.error}`}>{error}</div> : null}
    {family ? <div className={styles.card}><div className={styles.cardHeader}><strong>جاهزية الأسرة</strong><span>{family.completed_count} من {family.total_family_provided_count}</span></div><div className={styles.progress}><span style={{width:`${percent}%`}} /></div><span className={styles.muted}>متبقٍ {family.pending_count} عنصرًا</span></div> : null}

    {!child && family && family.children.length>1 ? <section className={styles.card}><div className={styles.cardHeader}><div><h2 className={styles.sectionTitle}>لائحة الأسرة</h2><span className={styles.muted}>تجميع للشراء فقط؛ كل عنصر يبقى مرتبطًا بالابن الذي يخصه.</span></div></div><div className={styles.list}>{familyAggregate.map(row=><div key={row.key} className={styles.row}><div className={styles.rowMain}><strong>{row.name} × {row.quantity}</strong><span className={styles.tiny}>{row.type}</span><span className={styles.muted}>{row.children.map(c=>`${c.name} × ${c.quantity}`).join(' · ')}</span></div></div>)}</div>{!familyAggregate.length?<div className={styles.empty}>لا توجد عناصر على الأسرة توفيرها.</div>:null}</section>:null}

    {!child && family ? <div className={styles.grid}>{family.children.map(c => { const items=familyRequirementItems(c).filter(i=>i.provision_source==='family'); const done=new Set(c.progress.filter(p=>p.status!=='pending').map(p=>p.item_stable_key)); return <button key={c.student.id} className={styles.card} style={{textAlign:'start',cursor:'pointer'}} onClick={()=>void openChild(c.student.id)}><strong>{c.student.name}</strong><span className={styles.muted}>{c.level ?? ''} {c.class_name ? `· ${c.class_name}`:''}</span><span>{done.size} من {items.length} جاهز</span>{c.updated?<span className={styles.badge}>تم تحديث اللائحة</span>:null}</button>;})}</div> : null}

    {child ? <>
      {family && family.children.length>1 ? <button className={`btn btn--ghost ${styles.noPrint}`} onClick={()=>setChild(null)}>العودة إلى الأبناء</button> : null}
      <section className={styles.card}><div className={styles.cardHeader}><div><h2 style={{margin:0}}>{child.student.name}</h2><span className={styles.muted}>{child.academic_year} · {child.level} {child.class_name ? `· ${child.class_name}`:''}</span></div>{child.revision ? <span className={styles.badge}>النسخة {child.revision}</span>:null}</div>{child.updated && child.changes ? <details><summary>تم تحديث اللائحة — عرض التغييرات</summary><div className={styles.list}><span>أضيف: {child.changes.added.length}</span><span>تغير: {child.changes.changed.length}</span><span>حذف: {child.changes.removed.length}</span></div></details>:null}</section>
      {child.list_id ? (Object.entries({books:child.books,notebooks:child.notebooks,stationery:child.stationery,uniform:child.uniform,materials:child.materials,other:child.other}) as Array<[string,RequirementItem[]]>).filter(([,items])=>items.length).map(([key,items]) => <section key={key} className={styles.card}><h2 className={styles.sectionTitle}>{groupLabel(key)}</h2><div className={styles.list}>{items.map(item => { const status=progress.get(item.stable_key) ?? 'pending'; return <div key={item.stable_key} className={styles.row}><div className={styles.rowMain}><strong>{item.name} {item.quantity!==1?`× ${item.quantity}`:''}</strong><span className={styles.tiny}>{item.subject ?? requirementItemTypeLabel(item.item_type)}{item.publisher?` · ${item.publisher}`:''}{item.edition?` · ${item.edition}`:''}</span>{item.isbn?<span className={styles.tiny}>ISBN: <bdi>{item.isbn}</bdi></span>:null}<div className={styles.mobileStack}>{item.provided_by_school?<span className={styles.badge}>توفره المدرسة</span>:null}{item.reusable?<span className={styles.badge}>يمكن إعادة استعماله</span>:null}{item.importance==='optional'?<span className={styles.badge}>اختياري</span>:null}</div></div>{item.provision_source==='family'?<select className={`select ${styles.noPrint}`} disabled={busyKey===item.stable_key} value={status} onChange={e=>void setProgress(item,e.target.value as RequirementProgress)}><option value="pending">{requirementProgressLabel('pending')}</option><option value="already_have">{requirementProgressLabel('already_have')}</option><option value="purchased">{requirementProgressLabel('purchased')}</option></select>:null}</div>;})}</div></section>) : <div className={styles.empty}>لم تنشر المدرسة لائحة تجهيزات لهذا المستوى بعد.</div>}
    </> : null}
  </div>;
}
