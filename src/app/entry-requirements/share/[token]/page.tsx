import type { Metadata } from 'next';

import {
  fetchPublicEntryRequirementList,
  type PublicRequirementList,
} from '@/features/entry-requirements/public-entry-requirements-server';
import {
  requirementItemTypeLabel,
  type RequirementItemType,
} from '@/features/entry-requirements/entry-requirements-contract';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'تجهيزات الدخول المدرسي',
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nocache: true,
  },
};

const GROUPS: RequirementItemType[] = [
  'textbook',
  'book',
  'notebook',
  'stationery',
  'uniform',
  'material',
  'other',
];

function PublicList({ list, token }: { list: PublicRequirementList; token: string }) {
  return <main dir="rtl" style={{maxWidth:920,margin:'0 auto',padding:'32px 20px',fontFamily:'Arial, Tahoma, sans-serif'}}>
    <header style={{borderBottom:'1px solid #ddd',paddingBottom:20,marginBottom:24}}>
      <div style={{fontSize:14,color:'#666',marginBottom:6}}>{list.school_name || 'المدرسة'}</div>
      <h1 style={{margin:'0 0 10px',fontSize:28}}>{list.name}</h1>
      <div style={{display:'flex',gap:16,flexWrap:'wrap',fontSize:14,color:'#555'}}>
        {list.academic_year ? <span>السنة الدراسية: {list.academic_year}</span> : null}
        {list.level ? <span>المستوى: {list.level}</span> : null}
        {list.class_name ? <span>القسم: {list.class_name}</span> : null}
        {list.track ? <span>المسار: {list.track}</span> : null}
        <span>النسخة: {list.revision}</span>
      </div>
      <p style={{margin:'14px 0 0',fontSize:13,color:'#666'}}>نسخة قراءة فقط منشورة من المدرسة. لا تتضمن حالة شراء التلميذ أو أي بيانات أسرية.</p>
    </header>

    {list.notes ? <section style={{padding:'12px 14px',background:'#f7f7f7',borderRadius:8,marginBottom:22}}>{list.notes}</section> : null}

    {GROUPS.map(type => {
      const rows = list.items.filter(item => item.item_type === type);
      if (!rows.length) return null;
      return <section key={type} style={{marginBottom:24}}>
        <h2 style={{fontSize:18,borderBottom:'1px solid #e2e2e2',paddingBottom:7}}>{requirementItemTypeLabel(type)}</h2>
        <div style={{display:'grid',gap:10}}>{rows.map(item => <article key={item.id} style={{border:'1px solid #e5e5e5',borderRadius:8,padding:'12px 14px'}}>
          <strong>{item.name}{item.quantity !== 1 ? ` × ${item.quantity}` : ''}</strong>
          <div style={{fontSize:13,color:'#666',marginTop:4}}>
            {item.subject ? <span>{item.subject}</span> : null}
            {item.publisher ? <span>{item.subject ? ' · ' : ''}{item.publisher}</span> : null}
            {item.edition ? <span> · {item.edition}</span> : null}
            {item.isbn ? <span> · ISBN {item.isbn}</span> : null}
            {item.provision_source === 'school' ? <span> · توفره المدرسة</span> : null}
            {item.importance === 'optional' ? <span> · اختياري</span> : null}
          </div>
          {item.notes ? <div style={{fontSize:13,marginTop:6}}>{item.notes}</div> : null}
        </article>)}</div>
      </section>;
    })}

    {list.attachments.length ? <section style={{marginTop:28}}>
      <h2 style={{fontSize:18}}>الوثائق المرفقة</h2>
      <div style={{display:'grid',gap:8}}>{list.attachments.map(attachment => <a
        key={attachment.id}
        href={`/api/public/entry-requirements/${encodeURIComponent(token)}/attachments/${attachment.id}/download`}
        rel="nofollow"
        style={{display:'block',padding:'10px 12px',border:'1px solid #ddd',borderRadius:8,color:'inherit',textDecoration:'none'}}
      >{attachment.name}</a>)}</div>
    </section> : null}

    <footer style={{marginTop:36,paddingTop:18,borderTop:'1px solid #ddd',fontSize:12,color:'#777'}}>
      هذا الرابط مخصص للقراءة فقط ويمكن للمدرسة إبطاله أو تدويره في أي وقت.
    </footer>
  </main>;
}

export default async function PublicEntryRequirementSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const list = await fetchPublicEntryRequirementList(token);
  if (!list) {
    return <main dir="rtl" style={{maxWidth:680,margin:'80px auto',padding:24,textAlign:'center',fontFamily:'Arial, Tahoma, sans-serif'}}>
      <h1>الرابط غير متاح</h1>
      <p>قد يكون الرابط غير صالح، أو تم إبطاله، أو لم تعد اللائحة منشورة.</p>
    </main>;
  }
  return <PublicList list={list} token={token}/>;
}
