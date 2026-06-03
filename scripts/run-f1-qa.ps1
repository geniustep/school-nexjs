# F-1 live QA runner — never commits passwords or cookies.
# Prereq: .env.local and/or .env.qa.local (see .env.qa.local.example) — never commit.
param(
  [string]$BaseUrl = 'http://localhost:3001',
  [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

foreach ($file in @('.env.local', '.env.qa.local')) {
  $local = Join-Path $root $file
  if (-not (Test-Path $local)) { continue }
  Get-Content $local | ForEach-Object {
    if ($_ -match '^\s*#') { return }
    if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$') {
      $key = $matches[1]
      if ($key -match '^(QA_|ODOO_|ODOO_QA_)') {
        $val = $matches[2].Trim().Trim('"').Trim("'")
        Set-Item -Path "Env:$key" -Value $val
      }
    }
  }
}

$hasCred = node --input-type=module -e @"
import { primeQaEnvFromLocal, hasAnyQaCredential } from './scripts/qa-env.mjs';
primeQaEnvFromLocal();
process.exit(hasAnyQaCredential() ? 0 : 1);
"@
if ($LASTEXITCODE -ne 0) {
  Write-Error 'Set QA_PASSWORD and/or QA_*_PASSWORD (see .env.qa.local.example).'
}

if (-not $SkipBuild) {
  if (Test-Path .next) { Remove-Item -Recurse -Force .next }
  npm run typecheck
  npm run build
}

$env:PORT = '3001'
$existing = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Select-Object -First 1
if ($existing) {
  Stop-Process -Id $existing.OwningProcess -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 2
}
$proc = Start-Process -FilePath 'npm.cmd' -ArgumentList 'run', 'start' -WorkingDirectory $root -PassThru -WindowStyle Hidden
try {
  $deadline = (Get-Date).AddSeconds(30)
  do {
    Start-Sleep -Milliseconds 500
    try {
      $r = Invoke-WebRequest -Uri "$BaseUrl/login" -UseBasicParsing -TimeoutSec 3
      if ($r.StatusCode -eq 200) { break }
    } catch { }
  } while ((Get-Date) -lt $deadline)

  node scripts/qa-f1-probe.mjs $BaseUrl
} finally {
  Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
}
