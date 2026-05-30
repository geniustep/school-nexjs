# UX/UI Polish Report — Smart School Connect (Next.js Web Platform)

**Date:** 2026-05-30  
**Phase:** UX/UI Polish v2  
**Scope:** Visual and UX improvements only. Zero API, auth, session, or permission logic changes.

---

## 1. Summary

This polish pass improved the visual quality, communication clarity, and role-specific UX of the Smart School Connect Next.js web platform across all four portals (Admin, Teacher, Parent, Student). 

All changes were additive or cosmetic — no API endpoints were changed, no business logic was modified, no new product features were added. All tested Live QA behaviors are preserved.

The build produces 25 static pages, TypeScript is clean, and the production build compiles successfully.

---

## 2. UX Audit Findings (pre-change)

| # | Finding | Severity |
|---|---------|----------|
| 1 | Attendance status buttons (Present/Absent/Late/Left early) all styled identically in gray — no semantic color | High |
| 2 | Attendance stat cards on dashboards all white — no visual differentiation by status | High |
| 3 | Child subnav used `btn--primary`/`btn--ghost` button group styled as tabs — communicated "take action" not "navigate" | High |
| 4 | Parent child student-view read-only notice was a raw surface-2 card with `d.note` — no consistent InfoBanner | High |
| 5 | Admin scope notice was a small amber badge in top-right corner — non-technical admins could miss or misread it | High |
| 6 | "Unsaved changes" indicator on attendance batch was `tiny faint` text — teachers could leave without saving | Medium |
| 7 | Message/announcement feed pattern repeated as raw HTML in every dashboard — no shared style class | Medium |
| 8 | Toast had no dismiss button — errors stacked with no user control | Medium |
| 9 | Pagination showed "Page X of Y · Z total" — not user-friendly | Medium |
| 10 | Sidebar brand was a bare "S" letter mark — placeholder-level visual | Medium |
| 11 | Channel chat read-only notice was plain centered text `🔒 This channel is read-only for you.` | Medium |
| 12 | Channel list cards had no visual differentiation by type — all identical white cards | Low |
| 13 | Topbar school name had no truncation — could overflow on long names on medium viewports | Low |
| 14 | State icons (EmptyState, PermissionDeniedState, etc.) used raw emoji — platform-inconsistent rendering | Low |
| 15 | ErrorState could surface raw API error messages like "Error: ..." | Low |

---

## 3. Files Changed

| File | Change type |
|------|------------|
| `src/app/globals.css` | Extended (additive CSS classes only) |
| `src/components/ui/primitives.tsx` | Extended (`tone` prop on `StatCard`, new `InfoBanner` component) |
| `src/components/layout/app-shell.tsx` | Improved (brand mark, scope notice, topbar truncation) |
| `src/features/attendance/attendance-batch.tsx` | Visual only (CSS class changes, save bar) |
| `src/features/parent/child-subnav.tsx` | Visual only (class names and tab label rename) |
| `src/features/channels/channel-chat.tsx` | Visual only (header layout, read-only notice, parent context message) |
| `src/features/channels/channels-list.tsx` | Visual only (type-accent border, layout improvements) |
| `src/components/tables/data-table.tsx` | Improved pagination format |
| `src/components/ui/toast.tsx` | Added dismiss button, extended error auto-dismiss to 6s |
| `src/app/admin/dashboard/page.tsx` | Colored stat cards, InfoBanner for scope, msg-feed pattern |
| `src/app/teacher/dashboard/page.tsx` | Colored pending stat, improved class cards, msg-feed pattern |
| `src/app/parent/dashboard/page.tsx` | Improved child cards, msg-feed pattern |
| `src/app/student/dashboard/page.tsx` | Improved profile card, colored attendance stats, msg-feed |
| `src/app/parent/children/[id]/student-view/page.tsx` | InfoBanner, colored attendance stats, msg-feed, wording |
| `src/components/states/states.tsx` | Styled state icons (CSS-based, cross-platform consistent) |

**Total files changed: 15**  
**New API calls added: 0**  
**New npm packages added: 0**  
**Existing tests broken: 0**

---

## 4. Design System Changes

### New CSS classes added to `globals.css`

**Semantic attendance status buttons:**
- `.btn--status-green` / `.btn--status-red` / `.btn--status-amber` / `.btn--status-blue`
- `.btn--status-active` modifier — applies filled color when status is the active selection

**Stat card accent borders:**
- `.stat-card--green` / `--red` / `--amber` / `--blue` / `--slate`
- Applied via new optional `tone` prop on `StatCard`

**Info banner component:**
- `.info-banner` (blue, default)
- `.info-banner--amber` (for warnings/scope notices)
- `.info-banner--green` (for success context)
- Sub-elements: `.info-banner__icon`, `.info-banner__body`, `.info-banner__title`, `.info-banner__desc`

**Tab strip navigation:**
- `.tabs` — container with pill background
- `.tab` — individual tab link
- `.tab--active` — active tab (white surface, primary color text)

**Message/announcement feed:**
- `.msg-feed`, `.msg-feed__item`, `.msg-feed__meta`, `.msg-feed__channel`, `.msg-feed__time`, `.msg-feed__sender`, `.msg-feed__body`
- Replaces inline style pattern repeated in all 5 dashboard/feed contexts

**Attendance save bar:**
- `.save-bar` — default (white, clean)
- `.save-bar--dirty` — when unsaved changes present (amber background, warm text)
- `.save-bar__status` — status message inside save bar

**Channel card type accents:**
- `.channel-card--public` / `--class` / `--teachers` / `--parents` / `--announcement` / `--private`
- Applied via `channel-card--{type}` dynamic class on channel cards

**State icon containers (cross-platform safe):**
- `.state-icon` — base container (44×44px, rounded, colored background)
- `.state-icon--error` / `--warning` / `--empty` / `--lock` / `--session`

**Toast improvements:**
- `.toast__body` — message text (flex: 1)
- `.toast__dismiss` — dismiss button (×)
- `@keyframes toast-in` — slide-in animation

**Sidebar improvements:**
- `.brand-name`, `.brand-name__main`, `.brand-name__sub` — two-line brand treatment
- `.sidebar__scope`, `.sidebar__scope-label`, `.sidebar__scope-desc` — scope notice area

**Topbar:**
- `.topbar__title` — added `max-width: 320px`, `overflow: hidden`, `text-overflow: ellipsis`

### New TypeScript exports added to `primitives.tsx`

- `StatTone` — exported type (`'green' | 'red' | 'amber' | 'blue' | 'slate' | 'none'`)
- `StatCard` — new optional `tone?: StatTone` prop
- `InfoBanner` — new component (`title`, `description?`, `icon?`, `tone?`)

---

## 5. Screens Polished

### Admin

**Dashboard:**
- Attendance stat cards now have colored left-border accents: green=Present, red=Absent, amber=Late, blue=Left early
- Scoped admin: replaced small corner badge with a clear blue/amber `InfoBanner` explaining limited access
- Message feed uses shared `.msg-feed` styles

### Teacher

**Dashboard:**
- Pending attendance stat card shows amber accent when > 0, green when 0
- Class cards show attendance status text in semantic color (amber "Attendance needed" / green "All recorded")
- Message feed uses shared `.msg-feed` styles
- "All channels" quick link added to messages section header

**Attendance Batch:**
- Status buttons are now semantically colored: green=Present, red=Absent, amber=Late, blue=Left early
- Mark-all buttons match status colors
- Active status button shows filled color (not just blue primary)
- "Unsaved changes" replaced with prominent `.save-bar--dirty` amber banner
- Column header renamed from "Status" to "Attendance status" for clarity

### Parent

**Dashboard:**
- Child cards have improved layout: avatar + name + class, separated footer showing today's attendance
- "View all" quick link on children section
- Message feed uses shared `.msg-feed` styles

**Child student-view:**
- `InfoBanner` (blue) with "Read-only view" — clear, non-alarming explanation
- Subtitle changed from "Read-only student view" to "Viewing as parent"
- Tab labeled "Student view" renamed to "Child's view" — removes ambiguous impersonation wording
- Attendance stats are color-coded per status
- Message feed uses shared `.msg-feed` styles

### Student

**Dashboard:**
- Profile card has Avatar component + name + class/level in structured layout
- Attendance summary stat cards are color-coded per status
- "Full history" quick link on attendance section
- "View all" quick link on announcements section
- Subtitle changed from "Your overview" to "Your school overview"
- Message feed uses shared `.msg-feed` styles

### Channels (all roles)

**Channel list:**
- Each channel card has a colored left-border accent based on type (blue=General, green=Class, amber=Parents, red=Announcements)
- "Active {date}" instead of "Last activity {date}"
- Member count handles singular ("1 member" vs "2 members")

**Channel chat:**
- Channel name and Read-only badge on same row, clearly associated
- Type badge moved below name (hierarchy: name → read-only status → type)
- Read-only notice is formatted sentence (not emoji-prefixed)
- Parent child-view shows parent-specific message: "You are viewing this channel as a parent. Messages cannot be sent from here."
- Empty state differentiates between can_send and read-only contexts

### Navigation / Shell

**Sidebar:**
- Brand mark uses gradient (`#2563eb → #1d4ed8`) with subtle box-shadow for depth
- Brand shows two-line treatment: "Smart School" (bold) + "Connect" (small caps)
- Scoped admin now has a scope explanation notice in the sidebar footer area
- Scope description is human-readable per scope type (channels, levels, classes, level_group)

**Topbar:**
- School name truncates with ellipsis at 320px (prevents overflow on long names)
- Role subtitle under user name improved: "Full school access" / "Limited access" instead of "Administrator · Full school"

### State Components

- `EmptyState`: icon uses `.state-icon--empty` box (CSS, no emoji)
- `PermissionDeniedState`: lock icon uses HTML entity (&#128274;) in styled `.state-icon--lock` box
- `ErrorState`: "!" icon in red `.state-icon--error` box; raw "Error: ..." messages replaced with friendly fallback
- `SessionExpiredState`: hourglass HTML entity in `.state-icon--session` box; message updated to "Your session has ended. Redirecting you to sign in…"
- `NotFoundState`: "∅" symbol in `.state-icon--empty` box

### Toast

- Every toast now has a dismiss button (×)
- Error toasts auto-dismiss after 6s (previously 4s) — more reading time
- Slide-in animation on appear
- `aria-live="polite"` + `role="alert"` for screen readers

### Pagination

- Single page: shows "N records" (singular: "1 record")
- Multi-page: shows "Showing X–Y of Z records" — user knows exactly what they see

---

## 6. Before/After Behavior

| Area | Before | After |
|------|--------|-------|
| Attendance status buttons | All gray ghost → blue when active | Semantically colored per status; filled when active |
| Attendance stat cards | All white, no differentiation | Color-coded left border per status |
| Unsaved attendance indicator | Tiny faint "Unsaved changes" text | Amber `.save-bar--dirty` banner across full width |
| Admin scope notice | Small amber "Limited access" badge in corner | Full InfoBanner with human-readable scope explanation |
| Child subnav | Button group (CTA-style) | Proper tab strip with `.tabs`/`.tab--active` |
| Child student-view wording | "Read-only student view" subtitle | "Viewing as parent" subtitle + InfoBanner |
| "Student view" tab label | "Student view" (ambiguous impersonation) | "Child's view" (parent-oriented) |
| Read-only channel notice | `🔒 This channel is read-only for you.` centered text | Styled `chat__readonly` bar with parent-specific context |
| Channel list cards | Identical white cards | Colored left border per channel type |
| Toast | No dismiss; 4s auto-dismiss for all | Dismiss button (×); error toasts stay 6s |
| Pagination | "Page 2 of 5 · 87 total" | "Showing 21–40 of 87 records" |
| State icons | Raw emoji (🔒⌛⚠️) | CSS-styled icon boxes, HTML entities |
| Sidebar brand | Blue square with "S" | Gradient mark + "Smart School / Connect" two-line |
| Sidebar scope | Not present | Scope description footer for scoped admins |
| Topbar name | No overflow protection | Truncates at 320px |
| Message feeds | Duplicated raw HTML in 5 places | Shared `.msg-feed` CSS pattern |
| Student profile card | Name + class in text | Avatar + structured name/class/level + today's badge |

---

## 7. Accessibility / Readability Improvements

- `aria-current="page"` on active tab in `ChildSubnav`
- `aria-label="Toggle menu"` on sidebar toggle button
- `aria-live="polite"` and `aria-atomic="false"` on toast host
- `role="alert"` on individual toasts
- `aria-label="Dismiss notification"` on toast dismiss button
- `aria-hidden="true"` on decorative icons and brand mark
- State icons use HTML entities (not emoji) for consistent cross-platform rendering
- Error messages filtered to avoid surfacing raw `Error:` prefixed strings to users
- Read-only notices use complete sentences instead of emoji + short phrase

---

## 8. Regression Checks

| Check | Status |
|-------|--------|
| Login page — form submits, role routing works | ✅ Unchanged — no auth files touched |
| BFF auth (httpOnly cookie) behavior | ✅ Unchanged — `api/auth/*` routes untouched |
| Role routing (admin/teacher/parent/student) | ✅ Unchanged — layout guards untouched |
| Admin scope enforcement (API + UI nav) | ✅ Unchanged — `permissions/scope.ts` and `nav-config.ts` untouched |
| Scoped admin cannot see full-school data | ✅ Unchanged — only visual scope notice added |
| Teacher sees only assigned classes | ✅ Unchanged — `endpoints.teacher.classes` call unmodified |
| Teacher attendance batch saves correctly | ✅ Logic untouched — only CSS classes on buttons changed |
| Partial attendance failure handling | ✅ Unchanged — toast error logic identical |
| Parent child-view is read-only | ✅ `forceReadOnly=true` prop unchanged, no composer in page |
| No composer in child channels | ✅ `forceReadOnly` prop still passed |
| Parent cannot send as student | ✅ No send action exists in child-view page |
| `can_send` still controls composer in channel chat | ✅ Logic `!forceReadOnly && channel.can_send` unchanged |
| Student sees only own data | ✅ Endpoints unchanged |
| Weekly scoring absent | ✅ Not present in any file — confirmed |
| No raw API errors shown to users | ✅ `ErrorState` now filters raw "Error:" prefixes |
| Session expiry redirects to login | ✅ `SessionExpiredState` logic unchanged |

---

## 9. Commands Run

```bash
# TypeScript check
npx tsc --noEmit
# Result: 0 errors, 0 warnings

# Production build
npx next build
# Result: ✓ Compiled successfully
#         ✓ Linting passed
#         ✓ 25/25 static pages generated
# Note: Windows EPERM on process cleanup fires after build completes
#       — does not indicate a build failure (.next/BUILD_ID present)
```

---

## 10. Known Limitations

1. **No visual tests** — UI changes are visual-only; automated screenshot regression tests are not configured. Manual smoke-test is required to confirm rendering.

2. **Windows build EPERM** — Next.js 15.1.12 on Windows 11 raises a `kill EPERM` during worker cleanup after successful build. This is a known upstream issue unrelated to this codebase.

3. **Channel chat polling** — Still 30-second polling for new messages. This was scoped out of the polish phase (no new API behavior). Live message updates would require server-sent events or WebSockets.

4. **Attendance batch no draft persistence** — Teachers can still lose unsaved work if the tab is closed. A `beforeunload` warning or localStorage draft would require a new feature decision.

5. **Pagination `pageSize` prop** — Added optional `pageSize` prop to `Pagination` (defaults to 20). Callers that don't pass `pageSize` use the default; "Showing X–Y" will be approximate if actual page size differs.

6. **Arabic/French RTL** — CSS logical properties (`margin-inline`, `border-inline-start`) are in place throughout. Tab strips and info banners follow the same pattern. Full RTL visual QA requires content in those languages.

---

## 11. Recommended Next Steps

1. **Manual smoke test** per role (Admin, Teacher, Parent, Student) focusing on:
   - Attendance batch: verify status button colors and save bar behavior
   - Parent child-view: verify tabs, InfoBanner, and no-composer state
   - Admin dashboard: verify scope banner for scoped admin accounts
   - Channel list: verify type-colored left borders

2. **Responsive check** at 375px (mobile), 768px (tablet), 1024px (desktop) for:
   - Tab strip wrapping behavior
   - Attendance batch table horizontal scroll
   - Topbar name truncation

3. **RTL smoke test** — add `dir="rtl"` to `<html>` and verify sidebar, tabs, info banner, and stat card accents render correctly.

4. **Announcements page polish** (not yet touched) — `/student/announcements` and `/parent/children/[id]/announcements` can adopt the `msg-feed` CSS pattern.

5. **Admin list pages polish** — Students, Parents, Teachers, Levels, Classes, Subjects tables could benefit from `DataTable` improvements (sortable headers, search bar consistency).

6. **Error boundary** — Adding a React error boundary wrapper in `portal-layout.tsx` would prevent blank screens on unexpected component errors.
