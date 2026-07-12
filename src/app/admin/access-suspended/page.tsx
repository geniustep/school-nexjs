import { Card } from '@/components/ui/primitives';

/** Direct URL for suspended admin — layout also short-circuits when /me flag is set. */
export default function AdminAccessSuspendedPage() {
  return (
    <div className="admin-workspace" style={{ padding: '2rem', maxWidth: '40rem' }}>
      <Card>
        <h1 style={{ margin: '0 0 0.75rem', fontSize: '1.25rem' }}>الوصول الإداري معلّق</h1>
        <p style={{ margin: 0, lineHeight: 1.6 }}>
          تم تعليق الوصول إلى مساحة الإدارة لهذه المدرسة. يمكنك متابعة استخدام الأدوار الأخرى
          المتاحة لحسابك إن وُجدت.
        </p>
      </Card>
    </div>
  );
}
