# Raqeem Design System — مرجع تنفيذي لوكلاء Next.js

> **الغرض:** مرجع عملي يحافظ على اتساق واجهات **رَقِيم (Raqeem)** انطلاقًا من الأنماط الموجودة فعليًا في المنتج.
> **ليس:** إعادة تصميم، هوية جديدة، أو دليل نظري عام.
> **المستودع:** `school-nexjs` فقط.

---

## 1. Product Character

### الهوية البصرية الحالية

| Token | القيمة | الاستخدام |
|-------|--------|-----------|
| `--raqeem-primary` | `#243B6B` | أزرار أساسية، sidebar admin، hero |
| `--raqeem-secondary` | `#24A6A1` | لمسات ثانوية |
| `--raqeem-accent` | `#F2A541` | تمييز، KPIs |
| `--raqeem-background` / `--c-bg` | `#F6F8FC` | خلفية التطبيق |
| `--c-surface` | `#ffffff` | بطاقات، panels |
| `--c-surface-2` | `#EEF2F8` | رؤوس جداول، hover rows |
| `--c-border` | `#E2E8F0` | حدود |

**المصدر:** `src/app/globals.css` — `:root`

### شخصية المنتج (ما يجب الحفاظ عليه)

- **عمليات مدرسية، لا consumer app:** واجهة admin مدمجة (compact)، معلومات كثيفة، إجراءات واضحة.
- **RTL-first:** العربية هي اللغة الافتراضية (`lang="ar" dir="rtl"`).
- **CSS مخصص + BEM-like:** **لا Tailwind** ولا مكتبة UI خارجية.
- **Tokens في CSS variables:** لا تُستبدل دون ضرورة مثبتة.
- **Domain layers مسموحة:** Finance، Admissions، Student 360 لها CSS خاص — لكن **الأساس** يبقى من primitives المشتركة.

### ما لا تفعله

- لا تُدخل Tailwind أو shadcn أو MUI.
- لا تُخترع palette جديدة.
- لا تُعيد تصميم navigation العام (`AppShell`).
- لا تُنشئ badge/modal/table محليًا إذا وُجد مكوّن مشترك.

---

## 2. Layout

### App Shell (ثابت — لا تغيّره)

```
AppShell → sidebar + topbar + content
```

| العنصر | Classes | الملف |
|--------|---------|-------|
| Shell | `app-shell`, `app-shell--admin`, `app-shell--teacher` | `src/components/layout/app-shell.tsx` |
| Sidebar | `sidebar`, `sidebar--admin`, `sidebar--open` | `globals.css` |
| Topbar | `topbar`, `topbar__title` | `globals.css` |
| Content | `content`, `content--admin` (max-width 1280px) | `globals.css` |
| Portal wiring | `PortalLayout` | `src/components/layout/portal-layout.tsx` |

### Admin page wrapper

لف صفحات admin الكثيفة بـ:

```tsx
<div className="admin-workspace">
  {/* PageHeader + toolbar + content */}
</div>
```

**CSS:** `src/app/admin-workspace.css` — gap مضغوط (`10px`)، hero variants للـ dashboard.

### Teacher workspace

استخدم `teacher-workspace` + `TeacherPageHeader` من `@/features/teacher/ui/teacher-primitives` — **لا** تخلط مع admin primitives في نفس الصفحة.

### Page headers — القاعدة الافتراضية

```tsx
import { PageHeader } from '@/components/ui/primitives';

<PageHeader
  title={t('...')}
  subtitle={t('...')}       // اختياري
  actions={<button>...</button>}  // اختياري
/>
```

| Class | القيمة |
|-------|--------|
| `.page-header h1` | 24px, weight ~650 |
| `.page-header p` | 14px, `--c-text-muted` |
| margin-bottom | 24px + border-bottom |

**Admin override:** `.content--admin .page-header { margin-block-end: 12px }`

### Headers مخصصة (مسموحة فقط عند الحاجة)

| الصفحة | المكوّن | متى |
|--------|---------|-----|
| Finance hub | `FinanceHubHeader` | dashboard مالي مركزي |
| Admissions | `admissions-list-header` | Kanban/table hub |
| Student 360 | `Student360Header` | profile hero |
| Dashboard executive | `admin-hero` | KPI hero |
| Academic Setup | `AcademicPageHeader` | settings nested |

**قاعدة:** header مخصص **فقط** إذا كان layout الصفحة يختلف جذريًا (hero، kanban، profile). وإلا `PageHeader`.

---

## 3. Typography

| المستوى | الحجم | الوزن | Class / selector |
|---------|-------|-------|------------------|
| Page title | 24px | 650 | `.page-header h1` |
| Section title | 15px | 700 | `.section__head h2` |
| Body | 14px | 400 | `body` |
| Label / field | 13px | 600 | `.field label` |
| Table header | 12px | 600 | `table.data th` |
| Badge | 12px | 600 | `.badge` |
| Stat label | 11px | 600 uppercase | `.stat-card__label` |
| Muted text | 14px | — | `.muted` |
| Faint text | — | — | `.faint`, `.tiny` |
| Monospace | — | — | `.mono` |

### Fonts

| الاتجاه | Font | Token |
|---------|------|-------|
| RTL (ar) | IBM Plex Sans Arabic | `--font-arabic` |
| LTR (en/fr/es) | Plus Jakarta Sans | `--font-latin` |

**التبديل:** `html[dir='rtl'] body` / `html[dir='ltr'] body` في `globals.css`.
**المصدر:** `src/lib/fonts.ts`

---

## 4. Spacing

### Scale الرئيسي

| Pattern | القيمة | Class |
|---------|--------|-------|
| Content padding | 24px (desktop), 12px (≤900px) | `.content` |
| Card padding | 20px | `.card--pad` |
| Grid gap | 16px | `.grid` |
| Form grid gap | 14px | `.grid--form` |
| Form stack gap | 16px | `.form-stack` |
| Field internal gap | 6px | `.field` |
| Field margin-bottom | 14px | `.field` |
| Toolbar gap | 10px, margin-bottom 16px | `.toolbar` |
| Section top margin | 28px | `.section` |
| Utility | 8/16/24px | `.mt-2`, `.mt-4`, `.mt-6` |

### Admin workspace

gap مضغوط `10px` — **عمدًا** للعمليات الكثيفة. لا توسّع بدون سبب UX.

---

## 5. Cards

### البطاقة الأساسية

```tsx
import { Card } from '@/components/ui/primitives';

<Card>{children}</Card>           // pad=true افتراضي
<Card pad={false}>...</Card>      // جداول، wrappers
```

```css
.card { background: var(--c-surface); border: 1px solid var(--c-border);
        border-radius: var(--radius); box-shadow: var(--shadow-sm); }
.card--pad { padding: 20px; }
```

### Variants موجودة (استخدمها، لا تُنشئ جديدة)

| Class | الاستخدام |
|-------|-----------|
| `.stat-card` + `--{tone}` | KPIs |
| `.admin-card` | Dashboard command center |
| `.finance-metric-card` | Finance hub |
| `.settings-hub-card` | Settings hub links |
| `.info-banner` | تنبيهات سياقية (scope, warnings) |

### StatCard primitive

```tsx
<StatCard label="..." value="42" tone="green" icon="📊" />
```

Tones: `green | red | amber | blue | slate | none`

---

## 6. Tables

### المكوّن المعياري

```tsx
import { DataTable, Pagination } from '@/components/tables/data-table';

<DataTable
  columns={columns}
  rows={rows}
  rowKey={(row) => row.id}
  onRowClick={(row) => router.push(`...`)}
  stickyHeader={false}
/>
```

**Classes:** `table-wrapt-wrap card` → `table.data`

| Element | Style |
|---------|-------|
| `th` | 12px, muted, `--c-surface-2` bg, padding 11–14px |
| `td` | 13.5px, padding 12–14px |
| hover row | `--c-surface-2` |
| clickable row | `.row-link` |

**Pagination:** `Pagination` component — `.pagination`

### متى لا تستخدم DataTable

- Kanban (Admissions) — layout مخصص مسموح
- جداول داخل modal/form — `table.data` مباشرة مقبول

---

## 7. Forms

### Stack form (النمط الافتراضي)

```tsx
<form className="card form-stack" onSubmit={...}>
  <h3>{title}</h3>
  {error && <p className="form-error">{error}</p>}
  <label>
    {label}
    <input className="input" ... />
  </label>
  <div className="form-actions">
    <button type="submit" className="btn btn--primary">...</button>
    <button type="button" className="btn btn--ghost">...</button>
  </div>
</form>
```

### Input classes

| Class | Usage |
|-------|-------|
| `.input` | text, email, number |
| `.select` | dropdowns |
| `.textarea` | multiline |
| `.field` | wrapper مع label (alternative) |

**Focus:** `border-color: var(--c-primary)` + `box-shadow: 0 0 0 3px var(--c-primary-soft)`

### Grid forms

```html
<div className="grid grid--form">...</div>
```

### Toolbar filters (قوائم)

```html
<div className="toolbar">
  <input className="input" ... />
  <div className="spacer" />
  <button className="btn btn--primary btn--sm">...</button>
</div>
```

### Date picker

`@/components/ui/date-picker-input` — classes `date-picker__*`

### Form errors

```html
<p className="form-error">{message}</p>
```

---

## 8. Dialogs

### النمط المعياري (استخدمه للميزات الجديدة)

```tsx
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

<ConfirmationDialog
  open={open}
  title="..."
  body="..."
  variant="primary" | "danger"
  size="default" | "wide" | "form"
  onConfirm={...}
  onClose={...}
/>
```

**Classes:** `modal-backdrop` + `card modal-panel confirmation-dialog`

| Size class | Width |
|------------|-------|
| default | auto |
| `modal-panel--wide` | wider |
| `modal-panel--form` | min(720px, 100%) |

**CSS:** `src/features/admin/finance/finance-ui.css` (`.modal-backdrop`, `.modal-panel`)

### Mobile alternative

`MobileBottomSheet` — `@/components/ui/mobile-bottom-sheet`
استخدمه للإجراءات على ≤900px (admin account, mobile nav).

### ⚠️ تجنّب

`modal-overlay` + `modal-content` — نمط قديم (attachments). **لا تُنشئ dialogs جديدة به.**

---

## 9. Empty States

```tsx
import { EmptyState } from '@/components/states/states';

<EmptyState
  icon="📋"
  title={t('...')}
  description={t('...')}
  action={<button>...</button>}
  compact={false}
/>
```

| Variant | Component | متى |
|---------|-----------|-----|
| Default empty | `EmptyState` | لا بيانات |
| Permission | `PermissionDeniedState` | 403 |
| Not found | `NotFoundState` | 404 |
| Session expired | `SessionExpiredState` | 401 |
| No school scope | `SchoolEmptyState` | admin بدون مدرسة |
| Compact | `compact={true}` | داخل cards/sections |

**Classes:** `.state`, `.state--compact`, `.state-icon--empty`

---

## 10. Loading States

### Full section / page

```tsx
import { LoadingState } from '@/components/states/states';
<LoadingState label={t('common.loading')} />
```

**Class:** `.state` + `.spinner`

### Data pages — ResourceView (النمط الإلزامي)

```tsx
import { ResourceView } from '@/components/states/resource';

<ResourceView
  state={resourceState}
  loadingLabel={t('common.loading')}
  isEmpty={(data) => data.length === 0}
  empty={<EmptyState ... />}
>
  {(data) => <DataTable ... />}
</ResourceView>
```

**التسلسل:** loading → error (ApiErrorView) → empty → content

### Skeleton

`.skeleton` — placeholders inline (Academic setup headers)

### Button busy

disabled + spinner text (`t('common.submitting')`) — انظر `ConfirmationDialog`

---

## 11. Error States

```tsx
import { ApiErrorView, ErrorState } from '@/components/states/states';
```

| Code | Component |
|------|-----------|
| `unauthenticated` | `SessionExpiredState` |
| `permission_denied` / `forbidden` | `PermissionDeniedState` |
| `not_found` | `NotFoundState` |
| default | `ErrorState` + retry button |

**قاعدة:** استخدم `sanitizeUserFacingErrorMessage` — لا تعرض raw API errors.

**Class:** `.state-icon--error`, `.form-error` للأخطاء inline في forms

---

## 12. Status Semantics

### Badge tones (المعيار)

```tsx
import { Badge } from '@/components/ui/primitives';
<Badge tone="green">{label}</Badge>
```

Tones: `green | red | amber | blue | slate`

### Semantic mapping

```tsx
import { workflowTone, ATTENDANCE_TONE } from '@/lib/utils/labels';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { AttendanceBadge } from '@/components/badges/attendance-badge';
```

| Domain | Mapping | Component |
|--------|---------|-----------|
| Workflow states | `WORKFLOW_TONE` | `WorkflowBadge` |
| Attendance | `ATTENDANCE_TONE` | `AttendanceBadge` |
| Student status | `statusLabel()` + tone manual | `Badge` |
| Finance priority | domain-specific | `FinanceServicePriorityBadge` |

### قواعد الدلالة

| Tone | المعنى |
|------|--------|
| `green` | active, present, published, success |
| `red` | absent, cancelled, error, destructive result |
| `amber` | late, warning, pending, inactive |
| `blue` | info, submitted, left_early |
| `slate` | draft, neutral, unknown |

**⚠️ تجنّب:** badges CSS مخصصة خارج `Badge` primitive في features جديدة. Student 360 و Executive dashboard لها legacy badges — لا تُنسخ.

---

## 13. Sensitive and Destructive Actions

### Confirmation

```tsx
<ConfirmationDialog
  variant="danger"
  title={t('...confirmDelete')}
  body={t('...irreversible')}
  confirmLabel={t('common.delete')}
  onConfirm={handleDelete}
  onClose={close}
/>
```

### قواعد

- **destructive:** `variant="danger"` — زر confirm بدون `btn--primary`
- **always confirm:** delete, archive, cancel payment, revoke access
- **loading state:** `loading` prop أو internal `submitting` — disable buttons أثناء العملية
- **no backdrop close** on destructive: `closeOnBackdrop={false}` عند الحاجة
- **permission gate قبل UI:** `RequireAdminPermission`, `AdminPageGuard`, `canManage*()` checks

---

## 14. RTL / LTR

### Mechanism

```tsx
// src/features/i18n/locale-context.tsx
document.documentElement.lang = locale;
document.documentElement.dir = localeDir(locale); // ar → rtl, else ltr
```

### CSS rules

- **Logical properties إلزامية:** `margin-inline`, `padding-inline`, `border-inline-start`, `inset-inline-end`
- **RTL overrides صريحة حيث يلزم:**
  - `[dir='rtl'] .form-actions { flex-direction: row-reverse }`
  - `[dir='rtl'] .sidebar { transform: translateX(110%) }` (drawer)
  - `[dir='rtl'] .confirmation-dialog__actions`
- **Bi-directional content:** `dir="auto"` على أسماء/ref numbers
- **Numbers/money/dates:** `dir="ltr"` على `.exec-kpi__money`, date picker controls

### Default

SSR: `lang="ar" dir="rtl"` في `src/app/layout.tsx`

---

## 15. Responsive Behavior

### Breakpoints global

| Breakpoint | السلوك |
|------------|--------|
| **≤900px** | Sidebar → drawer, content padding 12px, topbar 56px, mobile sheets |
| ≤1023px | Login stacked |
| ≤599px | Login mobile tweaks |

### Feature breakpoints (مرجع فقط — لا تُوحّد الآن)

| File | px |
|------|-----|
| `admin-workspace.css` | 640, 720, 960, 1024, 1200 |
| `admissions.css` | 640, 1024 |
| `staff-center.css` | 639, 767, 1023 |
| `student-360.css` | container queries |

### Touch targets

Mobile triggers: `min-width/height: 44px`

### قواعد

- لا تُنشئ breakpoint جديد global بدون مراجعة
- استخدم `@media (max-width: 900px)` للـ shell behavior
- `.toolbar` يستخدم `flex-wrap` — responsive by default

---

## 16. Reuse-before-create Rule

### قبل إنشاء أي UI جديد، تحقق من:

| الحاجة | استخدم |
|--------|--------|
| Page title area | `PageHeader` |
| Card container | `Card` |
| KPI | `StatCard` |
| Status pill | `Badge` / `WorkflowBadge` |
| Data list page | `ResourceView` + `DataTable` |
| Loading | `LoadingState` / `ResourceView` |
| Empty | `EmptyState` |
| Error | `ApiErrorView` |
| Confirm action | `ConfirmationDialog` |
| Alert banner | `InfoBanner` |
| Section title | `SectionHead` |
| Key-value display | `DefinitionList` |
| Avatar initials | `Avatar` |
| Date input | `DatePickerInput` |
| Mobile panel | `MobileBottomSheet` |
| class merge | `cn()` from `@/lib/utils/cn` |

### Import paths (canonical)

```
@/components/ui/primitives
@/components/states/states
@/components/states/resource
@/components/tables/data-table
@/components/ui/confirmation-dialog
@/components/ui/date-picker-input
@/components/ui/mobile-bottom-sheet
@/components/badges/workflow-badge
@/components/badges/attendance-badge
@/components/layout/app-shell
@/lib/utils/labels
```

---

## 17. Progressive Adoption Rules

### دورة حالة التصميم

```
unreviewed → review-needed → adopted
     ↑              ↓
     └──────────────┘ (re-review after major changes)
```

| الحالة | المعنى | الوسم |
|--------|--------|-------|
| **unreviewed** | لم تُراجع بعد | *لا وسم* |
| **review-needed** | مراجعة جزئية موثقة — بقية الصفحة تحتاج عمل | `@design-status review-needed` |
| **adopted** | رُاجعت بالكامل وتتوافق مع هذا المرجع | `@design-status adopted` |

### قواعد الوسوم

```ts
/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */
```

```ts
/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status review-needed
 */
```

- **`@raqeem-design`:** يشير دائمًا إلى هذا الملف.
- **`adopted`:** فقط بعد مراجعة **كاملة** للصفحة/المكوّن.
- **`review-needed`:** فقط مع تعليق يوضح ما بقي (مثلاً: header OK، table legacy).
- **لا `legacy` tag** — لا تُوسم الصفحات القديمة legacy.
- **غياب أي وسم = unreviewed** — هذا هو الافتراضي.

### متى تضع `adopted`

✅ الصفحة تستخدم `PageHeader` + `ResourceView` + `DataTable` + tokens من globals
✅ RTL logical properties
✅ لا inline styles عشوائية
✅ badges عبر `Badge` primitive
✅ dialogs عبر `ConfirmationDialog`
✅ رُاجعت visually + code review

❌ لا تضع `adopted` على صفحة finance hub أو student 360 أو admissions — لها layers CSS خاصة لم تُراجع بعد بالكامل.

---

## 18. Known Inconsistencies (لا تُكرّر)

| المشكلة | الواقع الحالي | القاعدة للجديد |
|---------|---------------|----------------|
| Page headers متعددة | 5+ variants | `PageHeader` افتراضي |
| Modal systems | `modal-backdrop` vs `modal-overlay` | `modal-backdrop` + `ConfirmationDialog` |
| Token aliases | `--c-muted`, `--bg`, `--color-primary` في domain CSS | `--c-text-muted`, `--c-surface`, `--c-primary` |
| `--radius-md` | مستخدم لكن غير معرّف في `:root` | `--radius` (12px) أو `--radius-sm` (8px) |
| Badge CSS مخصص | Student 360, Executive | `Badge` primitive |
| CSS import scatter | finance في page، admissions في component | co-locate في feature folder، import مرة واحدة |
| Inline styles | user chip في app-shell | CSS classes فقط |
| Admin wrapper | بعض الصفحات بدون `admin-workspace` | لف admin pages الكثيفة |

---

## 19. Audit Reference — Canonical Admin List Page

**المرجع:** `src/features/admin/staff/components/staff-list-page.tsx`

```
admin-workspace
  → PageHeader (title + subtitle + actions)
  → toolbar/search
  → ResourceView (loading → error → empty → DataTable)
  → Badge for status
```

هذا النمط هو **gold standard** لصفحات CRUD admin الجديدة.

---

## 20. `/design` — قسم البرومبت القياسي

انسخ هذا القسم في برومبتات وكلاء Next.js المستقبلية:

```markdown
/design

## Raqeem Design Compliance

- Reference: `docs/design/RAQEEM-DESIGN.md`
- Stack: CSS custom properties + BEM-like classes in `globals.css`. **No Tailwind. No new UI library.**
- Default page pattern: `PageHeader` → `toolbar` → `ResourceView` → `DataTable` / content
- Primitives: `@/components/ui/primitives`, `@/components/states/*`, `@/components/tables/data-table`
- Dialogs: `ConfirmationDialog` (`modal-backdrop` + `modal-panel`)
- Badges: `Badge` + `workflowTone()` / `ATTENDANCE_TONE` from `@/lib/utils/labels`
- RTL: logical CSS properties; `dir` from locale; numbers/dates `dir="ltr"` where needed
- Admin dense pages: wrap in `admin-workspace`
- Destructive actions: `ConfirmationDialog variant="danger"`
- Do NOT redesign navigation, invent new tokens, or create local copies of shared components
- Design status: [unreviewed | review-needed | adopted] — see RAQEEM-DESIGN.md §17
```

---

## Appendix: File Map

| Concern | Primary file |
|---------|-------------|
| Global tokens & base styles | `src/app/globals.css` |
| Admin workspace | `src/app/admin-workspace.css` |
| Teacher workspace | `src/app/teacher-workspace.css` |
| Shared primitives | `src/components/ui/primitives.tsx` |
| States | `src/components/states/states.tsx` |
| Resource wrapper | `src/components/states/resource.tsx` |
| Tables | `src/components/tables/data-table.tsx` |
| Dialogs | `src/components/ui/confirmation-dialog.tsx` |
| Status labels | `src/lib/utils/labels.ts` |
| Locale/direction | `src/lib/i18n/config.ts`, `src/features/i18n/locale-context.tsx` |
| Fonts | `src/lib/fonts.ts` |

---

*آخر مراجعة foundation: NEXTJS-RAQEEM-DESIGN-SYSTEM-FOUNDATION-1*
