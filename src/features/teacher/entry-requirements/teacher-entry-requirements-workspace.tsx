'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/primitives';
import { api } from '@/lib/api/client';
import { entryRequirementEndpoints } from '@/lib/api/entry-requirements-endpoints';
import { requirementItemTypeLabel, type TeacherRequirementAssignment } from '@/features/entry-requirements/entry-requirements-contract';
import styles from '@/features/library/product-workspaces.module.css';

export function TeacherEntryRequirementsWorkspace() {
  const [rows, setRows] = useState<TeacherRequirementAssignment[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { void api.get<{assignments:TeacherRequirementAssignment[]}>(entryRequirementEndpoints.teacher.mine).then(result => { if (!result.success) setError(result.error.message); else setRows(result.data.assignments); }); }, []);
  return <div className={styles.workspace}>
    <PageHeader title="المقرر والتجهيزات" subtitle="المقررات المعتمدة ومتطلبات المواد للأقسام التي تدرّسها." />
    {error ? <div className={`${styles.notice} ${styles.error}`}>{error}</div> : null}
    {rows.length ? <div className={styles.grid}>{rows.map(row => <article key={row.assignment_id} className={styles.card}>
      <div className={styles.cardHeader}><div><strong>{row.subject ?? 'المادة'}</strong><div className={styles.muted}>{row.class_name} · {row.level}</div></div><span className={styles.badge}>{row.academic_year}</span></div>
      <div><h3 className={styles.sectionTitle}>المقرر المعتمد</h3>{row.teaching_reference?.title ? <div className={styles.rowMain}><strong>{row.teaching_reference.title}</strong>{row.teaching_reference.publisher ? <span className={styles.muted}>الناشر: {row.teaching_reference.publisher}</span> : null}{row.teaching_reference.edition ? <span className={styles.muted}>الطبعة: {row.teaching_reference.edition}</span> : null}{row.teaching_reference.isbn ? <span className={styles.tiny}>ISBN: <bdi>{row.teaching_reference.isbn}</bdi></span> : null}</div> : <div className={styles.muted}>لم يُربط مقرر معتمد بهذا المسار بعد.</div>}</div>
      <div><h3 className={styles.sectionTitle}>متطلبات المادة</h3>{row.items.length ? <div className={styles.list}>{row.items.map(item => <div key={item.stable_key} className={styles.rowMain}><span>{item.name} {item.quantity !== 1 ? `× ${item.quantity}` : ''}</span><span className={styles.tiny}>{requirementItemTypeLabel(item.item_type)}{item.provision_source==='school'?' · توفره المدرسة':''}</span></div>)}</div> : <div className={styles.muted}>لا توجد متطلبات منشورة لهذه المادة.</div>}</div>
    </article>)}</div> : !error ? <div className={styles.empty}>لا توجد مقررات مرتبطة بإسناداتك الحالية.</div> : null}
  </div>;
}
