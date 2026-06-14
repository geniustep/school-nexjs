# NEXTJS-RAQEEM-BRAND-RELEASE — Report

## Closure status

```txt
RAQEEM_BRAND_REVIEWED
BRAND_FILES_COMMITTED
TYPECHECK_PASS
BUILD_PASS
PUSHED_TO_ORIGIN_MAIN
VERCEL_DEPLOY_TRIGGERED
RAQEEM_BRAND_COMMITTED
PUSHED_TO_GITHUB
VERCEL_DEPLOYMENT_SUCCESS
NEW_LOGO_VISIBLE
OLD_BRAND_REMOVED
WORKTREE_REMAINDER_DOCUMENTED
```

---

## 1. Path

`D:\app\school-nexjs`

---

## 2. Branch

| Stage | Branch |
|-------|--------|
| Start | `feat/finance-cheque-web-1` |
| Brand commit | `feat/raqeem-brand` |
| Published (Vercel) | `origin/main` |

---

## 3. HEAD before

```txt
366a4e8 — fix(finance): close school-scoped cheque live QA findings
```

---

## 4. Local files discovered

| File | Classification |
|------|----------------|
| `public/brand/logo.svg` | Brand — commit |
| `public/brand/raqeem.svg` | Brand — commit |
| `public/brand/logo_black.svg` | Brand spare — excluded (unused) |
| `src/components/brand/brand-logo.tsx` | Brand — commit |
| `src/lib/brand-assets.ts` | Brand — commit |
| `src/lib/fonts.ts` | Brand — commit |
| `src/app/icon.svg` | Brand — commit |
| `src/app/layout.tsx` | Brand — commit |
| `src/app/globals.css` | Brand — commit |
| `src/app/admin-workspace.css` | Brand tokens — commit |
| `src/app/teacher-workspace.css` | Brand tokens — commit |
| `src/components/layout/app-shell.tsx` | Brand — commit |
| `src/features/auth/login-form.tsx` | Brand — commit |
| `FIN_*_*.md` (reports) | QA/report — excluded |
| `scripts/finance-parent-ui-qa.mjs` | Finance QA — excluded |
| `messages/*.json` (`brand.name`) | Already on `origin/main` — no change needed |
| `.env*` | Secrets — not tracked |

---

## 5. Files in commit `8905525`

12 files, +163 / −69:

- `public/brand/logo.svg`
- `public/brand/raqeem.svg`
- `src/app/icon.svg`
- `src/components/brand/brand-logo.tsx`
- `src/lib/brand-assets.ts`
- `src/lib/fonts.ts`
- `src/app/layout.tsx`
- `src/app/globals.css`
- `src/app/admin-workspace.css`
- `src/app/teacher-workspace.css`
- `src/components/layout/app-shell.tsx`
- `src/features/auth/login-form.tsx`

---

## 6. Files excluded

- Finance implementation/merge/QA reports (`FIN_*.md`)
- `RAQEEM_BRAND_REPORT.md` (prior draft)
- `scripts/finance-parent-ui-qa.mjs`
- `public/brand/logo_black.svg` (not referenced in code)
- `.env` / `.env.local` (gitignored)

---

## 7. Old identity removed (UI)

| Location | Before | After |
|----------|--------|-------|
| `app-shell.tsx` sidebar | `brand-mark` + Smart School / Connect | `<BrandLogo variant="full" />` |
| `login-form.tsx` | `brand-mark` + `auth.brand` text | `<BrandLogo variant="full" />` |
| `globals.css` | `.brand-mark`, `.brand-name__*` | `.brand-logo__full`, `.brand-logo__mark` |
| `layout.tsx` metadata | Smart School Connect | `رَقِيم — Raqeem` |

No `Smart School Connect`, `brand-mark`, or `brand-name__*` remain in `src/`.

Technical identifiers unchanged: `package.json` name `school-nexjs`, Odoo module names, API paths.

---

## 8. Metadata

| Field | Value |
|-------|-------|
| `title.default` | `رَقِيم — Raqeem` |
| `title.template` | `%s \| رَقِيم` |
| `description` | `منصة رَقِيم للإدارة المدرسية · Raqeem School Management Platform` |
| `icons.icon` | `/brand/logo.svg` |
| `icons.apple` | `/brand/logo.svg` |
| App route icon | `src/app/icon.svg` |

Fonts: `IBM Plex Sans Arabic` + `Plus Jakarta Sans` via `next/font/google`.

---

## 9. typecheck

```txt
npm run typecheck — PASS
```

---

## 10. build

```txt
npm run build — PASS
53 routes generated; /icon.svg and /login present
```

---

## 11. lint

ESLint not configured in repo (`next lint` prompts interactive setup). Skipped; build includes type/lint phase — PASS.

---

## 12. Commit

```txt
8905525 feat(brand): adopt Raqeem identity across web app
```

---

## 13. Push result

```txt
feat/raqeem-brand → origin/feat/raqeem-brand (new branch)
main → origin/main: 366a4e8..8905525 (fast-forward merge in finance-release worktree)
```

Merge method:

```bash
# D:\app\school-nexjs-finance-release
git pull --ff-only origin main
git merge --ff-only feat/raqeem-brand
git push origin main
```

No force push.

---

## 14. Published branch

`origin/main` @ `8905525`

---

## 15. Vercel deployment

| Item | Value |
|------|-------|
| URL | `https://school-nexjs.vercel.app` |
| Trigger | Push to `main` |
| Initial check (~T+0) | Old build (`brand-mark`, title Smart School Connect) |
| Post-deploy (~T+45s) | New build live |

---

## 16. Commit visible on Vercel

Build ID changed `yBukZh7pKhQTm9qAW4A7I` → `JMlLDJKFpkCLh8BR_xpi9` after deploy.

GitHub `origin/main`: `890552546f676be7bf2323d4b9827fec0ea68e3b`

---

## 17. Live logo check

`https://school-nexjs.vercel.app/login`:

- `<img src="/brand/raqeem.svg" class="brand-logo__full" />` — present
- `brand-mark` / `Smart School Connect` — absent
- Favicon: `/brand/logo.svg` — present
- `/brand/raqeem.svg` — HTTP 200

---

## 18. Remaining local changes (`git status --short`)

```txt
 M FIN_CHEQUE_WEB_1_IMPLEMENTATION_REPORT.md
 M FIN_WEB_2_INTEGRATION_REPORT.md
?? FIN_CHEQUE_WEB_1_FINAL_LIVE_QA_REPORT.md
?? FIN_CHEQUE_WEB_1_FINAL_MERGE_REPORT.md
?? FIN_WEB_2_FINAL_MERGE_REPORT.md
?? FIN_WEB_2_PARENT_LIVE_QA_REPORT.md
?? RAQEEM_BRAND_REPORT.md
?? public/brand/logo_black.svg
?? scripts/finance-parent-ui-qa.mjs
```

Finance reports and unused `logo_black.svg` remain local only — not pushed.

---

## SVG review notes

- `logo.svg` / `raqeem.svg`: valid `viewBox`, embedded PNG in SVG (approved local assets); paths served from `/brand/*`.
- `BrandLogo`: central assets, `alt` from i18n `brand.name`, `full` / `compact` variants, no `window` usage, SSR-safe `<img>`.

---

**Release worktree:** `D:\app\school-nexjs-finance-release` @ `8905525` on `main`
