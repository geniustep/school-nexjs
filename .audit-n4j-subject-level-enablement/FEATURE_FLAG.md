# Feature flag — subject level enablement write

| Item | Value |
|------|--------|
| Name | `NEXT_PUBLIC_SUBJECT_LEVEL_ENABLEMENT_WRITE` |
| Default | unset / off |
| Enable (isolated test) | `NEXT_PUBLIC_SUBJECT_LEVEL_ENABLEMENT_WRITE=1` |
| Explicit off | `NEXT_PUBLIC_SUBJECT_LEVEL_ENABLEMENT_WRITE=0` |
| Production | Always forced off when `VERCEL_ENV=production` |

## Why production stays off

Odoo candidate `18.0.1.0.236` (SHA `dd87c692be0542369715e2e90fb5b47ed0421899`) is published as a branch candidate only. Nibras production runtime was still on 234 at Odoo O1 close. Enabling the write UI in Vercel Production before the tenant upgrade would call missing routes or unsafe partial contracts.

## How to test locally / preview

```bash
# .env.local (never commit secrets)
NEXT_PUBLIC_SUBJECT_LEVEL_ENABLEMENT_WRITE=1
```

Restart `next dev` / rebuild preview. Confirm `VERCEL_ENV` is not `production`.

Server-side RBAC (`subject.enablement.manage` / `manage_classes`) still applies; the flag only unlocks the client write chrome.
