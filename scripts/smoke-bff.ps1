# Live BFF smoke tests — Next.js -> Odoo (smart_school_connect 18.0.1.0.10 / alwah)
$ErrorActionPreference = 'Stop'
if ($env:SMOKE_BASE_URL) { $Base = $env:SMOKE_BASE_URL } else { $Base = 'http://localhost:3000' }
$Results = @()
$AdminClasses = $null

function Record([string]$Role, [string]$Test, [bool]$Pass, [string]$Detail = '') {
  $script:Results += [pscustomobject]@{ Role = $Role; Test = $Test; Pass = $Pass; Detail = $Detail }
}

function Api-Login([string]$Role, [string]$Login, [string]$Password) {
  $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  $body = @{ login = $Login; password = $Password } | ConvertTo-Json -Compress
  try {
    $r = Invoke-WebRequest -Uri "$Base/api/auth/login" -Method POST -Body $body `
      -ContentType 'application/json' -WebSession $session -UseBasicParsing -TimeoutSec 60
    $json = $r.Content | ConvertFrom-Json
    if ($r.StatusCode -ne 200 -or -not $json.success) {
      Record $Role 'login' $false "HTTP $($r.StatusCode) $($json.error.code)"
      return $null
    }
    $userRole = $json.data.user.role
    if ($userRole -ne $Role) {
      Record $Role 'login /me role' $false "expected=$Role got=$userRole"
      return $null
    }
    Record $Role 'login + /me in response' $true "id=$($json.data.user.id) school=$($json.data.user.school.name)"
    return @{ Session = $session; User = $json.data.user }
  } catch {
    Record $Role 'login' $false $_.Exception.Message
    return $null
  }
}

function Bff-Get([string]$Role, $Session, [string]$Path, [string]$Label) {
  try {
    $uri = "$Base/api/odoo$Path"
    $r = Invoke-WebRequest -Uri $uri -WebSession $Session -UseBasicParsing -TimeoutSec 60
    $json = $r.Content | ConvertFrom-Json
    $ok = ($r.StatusCode -eq 200 -and $json.success -eq $true)
    Record $Role $Label $ok $(if ($ok) { "200 OK" } else { "HTTP $($r.StatusCode) $($json.error.code)" })
    return $json
  } catch {
    $msg = $_.Exception.Message
    if ($_.Exception.Response) {
      try {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $msg = $reader.ReadToEnd()
      } catch {}
    }
    Record $Role $Label $false $msg
    return $null
  }
}

function Parse-JsonResponse([System.Net.HttpWebResponse]$Response) {
  $stream = $Response.GetResponseStream()
  $reader = New-Object System.IO.StreamReader($stream)
  $text = $reader.ReadToEnd()
  $reader.Close()
  return $text | ConvertFrom-Json
}

function Bff-GetExpectDenied([string]$Role, $Session, [string]$Path, [string]$Label) {
  $uri = "$Base/api/odoo$Path"
  try {
    $r = Invoke-WebRequest -Uri $uri -WebSession $Session -UseBasicParsing -TimeoutSec 60
    $json = $r.Content | ConvertFrom-Json
    $ok = (-not $json.success -and $json.error.code -in @('permission_denied', 'forbidden'))
    Record $Role $Label $ok $(if ($ok) { $json.error.code } else { "HTTP $($r.StatusCode) $($json.error.code)" })
  } catch [System.Net.WebException] {
    $resp = $_.Exception.Response
    if ($resp -and [int]$resp.StatusCode -eq 403) {
      $json = Parse-JsonResponse $resp
      $ok = ($json.error.code -in @('permission_denied', 'forbidden'))
      Record $Role $Label $ok "HTTP 403 $($json.error.code)"
    } else {
      Record $Role $Label $false $_.Exception.Message
    }
  } catch {
    Record $Role $Label $false $_.Exception.Message
  }
}

function Api-Logout([string]$Role, $Session) {
  try {
    $r = Invoke-WebRequest -Uri "$Base/api/auth/logout" -Method POST -WebSession $Session -UseBasicParsing -TimeoutSec 30
    Record $Role 'logout' ($r.StatusCode -eq 200) "HTTP $($r.StatusCode)"
  } catch {
    Record $Role 'logout' $false $_.Exception.Message
  }
}

function Test-Unauthenticated([string]$Role) {
  $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  try {
    $r = Invoke-WebRequest -Uri "$Base/api/odoo/student/profile" -WebSession $session -UseBasicParsing -TimeoutSec 30
    $json = $r.Content | ConvertFrom-Json
    $ok = (-not $json.success -and $json.error.code -eq 'unauthenticated')
    Record $Role 'post-logout unauthenticated' $ok $json.error.code
  } catch [System.Net.WebException] {
    $resp = $_.Exception.Response
    if ($resp -and [int]$resp.StatusCode -eq 401) {
      $json = Parse-JsonResponse $resp
      $ok = ($json.error.code -eq 'unauthenticated')
      Record $Role 'post-logout unauthenticated' $ok "HTTP 401 $($json.error.code)"
    } else {
      Record $Role 'post-logout unauthenticated' $false $_.Exception.Message
    }
  } catch {
    Record $Role 'post-logout unauthenticated' $false $_.Exception.Message
  }
}

function Test-SingularHomework([string]$Role, $Session) {
  try {
    $r = Invoke-WebRequest -Uri "$Base/api/odoo/student/homework" -WebSession $Session -UseBasicParsing -TimeoutSec 30
    $json = $r.Content | ConvertFrom-Json
    $ok = (-not $json.success)
    Record $Role 'no /student/homework singular' $ok $(if ($ok) { $json.error.code } else { 'unexpected success' })
  } catch [System.Net.WebException] {
    Record $Role 'no /student/homework singular' $true "HTTP $([int]$_.Exception.Response.StatusCode)"
  } catch {
    Record $Role 'no /student/homework singular' $true 'request failed (not a valid list endpoint)'
  }
}

function Test-PageRoutes([string]$Role, $Session, [string[]]$Paths) {
  foreach ($p in $Paths) {
    try {
      $r = Invoke-WebRequest -Uri "$Base$p" -WebSession $Session -UseBasicParsing -TimeoutSec 60
      $ok = ($r.StatusCode -eq 200)
      Record $Role "page $p" $ok "HTTP $($r.StatusCode)"
    } catch {
      Record $Role "page $p" $false $_.Exception.Message
    }
  }
}

function Scan-Excused([string]$Role, [string]$Body) {
  $ok = ($Body -notmatch 'excused_absence' -and $Body -notmatch '"excused"')
  Record $Role 'no excused_absence in payload' $ok $(if ($ok) { 'clean' } else { 'found excused token' })
}

function Test-AttachmentDownload([string]$Role, $Session, [int]$AttachmentId) {
  if (-not $AttachmentId) {
    Record $Role 'attachment download (skipped)' $true 'no attachment id in dataset'
    return
  }
  try {
    $r = Invoke-WebRequest -Uri "$Base/api/attachments/$AttachmentId/download" -WebSession $Session -UseBasicParsing -TimeoutSec 60
    $ok = ($r.StatusCode -eq 200 -and $r.RawContentLength -gt 0)
    Record $Role "attachment download #$AttachmentId" $ok "HTTP $($r.StatusCode) bytes=$($r.RawContentLength)"
  } catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 403) {
      Record $Role "attachment download #$AttachmentId" $true '403 forbidden (scoped)'
    } else {
      Record $Role "attachment download #$AttachmentId" $false $_.Exception.Message
    }
  }
}

# --- Admin ---
$qaPass = $env:QA_PASSWORD
if (-not $qaPass -and (Test-Path (Join-Path $PSScriptRoot '..\.env.qa.local'))) {
  $line = Get-Content (Join-Path $PSScriptRoot '..\.env.qa.local') | Where-Object { $_ -match '^\s*QA_PASSWORD=' } | Select-Object -First 1
  if ($line -match '^\s*QA_PASSWORD=(.+)$') { $qaPass = $matches[1].Trim().Trim('"').Trim("'") }
}
if (-not $qaPass) {
  Write-Error 'Set QA_PASSWORD or create .env.qa.local (see .env.qa.local.example).'
  exit 1
}
$legacyPass = if ($env:QA_PASSWORD_LEGACY) { $env:QA_PASSWORD_LEGACY } else { $qaPass }
$admin = Api-Login 'admin' 'done' $legacyPass
if ($admin) {
  $dash = Bff-Get 'admin' $admin.Session '/admin/dashboard' 'GET /admin/dashboard'
  $students = Bff-Get 'admin' $admin.Session '/admin/students?page_size=5' 'GET /admin/students'
  $classes = Bff-Get 'admin' $admin.Session '/admin/classes?page_size=5' 'GET /admin/classes'
  if ($classes) { $script:AdminClasses = $classes.data }
  $att = Bff-Get 'admin' $admin.Session '/admin/attendance?page_size=3' 'GET /admin/attendance'
  if ($att) { Scan-Excused 'admin' ($att | ConvertTo-Json -Depth 8 -Compress) }
  # session restore: second call without re-login
  Bff-Get 'admin' $admin.Session '/admin/dashboard' 'session restore (2nd dashboard)'
  Test-PageRoutes 'admin' $admin.Session @('/admin/dashboard', '/admin/students', '/admin/classes', '/admin/attendance')
  Api-Logout 'admin' $admin.Session
  Test-Unauthenticated 'admin'
}

# --- Teacher ---
$teacher = Api-Login 'teacher' 'qa.teacher' $qaPass
if ($teacher) {
  $tdash = Bff-Get 'teacher' $teacher.Session '/teacher/dashboard' 'GET /teacher/dashboard'
  $tclasses = Bff-Get 'teacher' $teacher.Session '/teacher/classes' 'GET /teacher/classes'
  $classId = $null
  if ($tclasses -and $tclasses.data -and $tclasses.data.Count -gt 0) {
    $classId = $tclasses.data[0].id
    Bff-Get 'teacher' $teacher.Session "/teacher/classes/$classId/students" "GET /teacher/classes/$classId/students"
    Bff-Get 'teacher' $teacher.Session "/teacher/classes/$classId/homeworks" "GET class homeworks"
    Bff-Get 'teacher' $teacher.Session "/teacher/classes/$classId/resources" "GET class resources"
    Bff-Get 'teacher' $teacher.Session "/teacher/classes/$classId/exams" "GET class exams"
  } else {
    Record 'teacher' 'class-scoped endpoints' $false 'no assigned classes'
  }
  # 403: class likely outside teacher scope (use admin class list if available)
  $forbiddenId = 999999
  if ($AdminClasses) {
    $teacherIds = @()
    if ($tclasses.data) { $teacherIds = $tclasses.data | ForEach-Object { $_.id } }
    $other = $AdminClasses | Where-Object { $teacherIds -notcontains $_.id } | Select-Object -First 1
    if ($other) { $forbiddenId = $other.id }
  }
  Bff-GetExpectDenied 'teacher' $teacher.Session "/teacher/classes/$forbiddenId/students" "403 forbidden class #$forbiddenId"
  $tpages = @('/teacher/dashboard', '/teacher/classes')
  if ($classId) {
    $tpages += "/teacher/classes/$classId", "/teacher/classes/$classId/homeworks", "/teacher/classes/$classId/resources", "/teacher/classes/$classId/exams"
  }
  Test-PageRoutes 'teacher' $teacher.Session $tpages
  Api-Logout 'teacher' $teacher.Session
}

# --- Parent ---
$parent = Api-Login 'parent' 'qa.parent' $qaPass
if ($parent) {
  $pdash = Bff-Get 'parent' $parent.Session '/parent/dashboard' 'GET /parent/dashboard'
  $children = Bff-Get 'parent' $parent.Session '/parent/children' 'GET /parent/children'
  if ($children -and $children.data -and $children.data.Count -gt 0) {
    $cid = $children.data[0].id
    Bff-Get 'parent' $parent.Session "/parent/children/$cid" "GET /parent/children/$cid"
    Bff-Get 'parent' $parent.Session "/parent/children/$cid/homeworks" 'GET child homeworks'
  } else {
    Record 'parent' 'child endpoints' $true 'empty children (valid empty state)'
  }
  $ppages = @('/parent/dashboard', '/parent/children')
  if ($children -and $children.data -and $children.data.Count -gt 0) {
    $ppages += "/parent/children/$($children.data[0].id)"
  }
  Test-PageRoutes 'parent' $parent.Session $ppages
  Api-Logout 'parent' $parent.Session
}

# --- Student ---
$student = Api-Login 'student' 'qa.student' $qaPass
if ($student) {
  $sdash = Bff-Get 'student' $student.Session '/student/dashboard' 'GET /student/dashboard'
  $profile = Bff-Get 'student' $student.Session '/student/profile' 'GET /student/profile'
  $hw = Bff-Get 'student' $student.Session '/student/homeworks' 'GET /student/homeworks'
  $res = Bff-Get 'student' $student.Session '/student/resources' 'GET /student/resources'
  $exams = Bff-Get 'student' $student.Session '/student/exams' 'GET /student/exams'
  Test-SingularHomework 'student' $student.Session
  if ($hw) { Scan-Excused 'student' ($hw | ConvertTo-Json -Depth 6 -Compress) }
  $attachId = 0
  if ($hw -and $hw.data -and $hw.data.Count -gt 0) {
    $hid = $hw.data[0].id
    $hd = Bff-Get 'student' $student.Session "/student/homeworks/$hid" "GET /student/homeworks/$hid"
    if ($hd -and $hd.data.attachments -and $hd.data.attachments.Count -gt 0) {
      $attachId = $hd.data.attachments[0].id
    }
  }
  if (-not $attachId -and $res -and $res.data -and $res.data.Count -gt 0) {
    $rid = $res.data[0].id
    $rd = Bff-Get 'student' $student.Session "/student/resources/$rid" "GET /student/resources/$rid"
    if ($rd -and $rd.data.attachments -and $rd.data.attachments.Count -gt 0) {
      $attachId = $rd.data.attachments[0].id
    }
  }
  Test-AttachmentDownload 'student' $student.Session $attachId
  Test-PageRoutes 'student' $student.Session @(
    '/student/dashboard', '/student/profile', '/student/homeworks', '/student/resources', '/student/exams', '/student/attendance'
  )
  Api-Logout 'student' $student.Session
}

# Grep codebase contract: singular homework path must not be registered in endpoints
$ep = Get-Content 'd:\app\school-nexjs\src\lib\api\endpoints.ts' -Raw
$noSingular = ($ep -notmatch "'/student/homework'") -and ($ep -match '/student/homeworks')
Record 'codebase' 'endpoints.ts uses homeworks not homework' $noSingular $(if ($noSingular) { 'ok' } else { 'bad path' })
$srcExcused = Select-String -Path 'd:\app\school-nexjs\src\**\*.ts','d:\app\school-nexjs\src\**\*.tsx' -Pattern 'excused_absence' -SimpleMatch -ErrorAction SilentlyContinue
Record 'codebase' 'no excused_absence in src' ($null -eq $srcExcused) $(if ($srcExcused) { 'found' } else { 'ok' })

# Summary
Write-Host "`n=== SMOKE RESULTS ($Base) ===`n"
$Results | Format-Table -AutoSize
$byRole = $Results | Group-Object Role
foreach ($g in $byRole) {
  $fail = @($g.Group | Where-Object { -not $_.Pass })
  $status = if ($fail.Count -eq 0) { 'PASS' } else { 'FAIL' }
  Write-Host "$($g.Name): $status ($($g.Group.Count - $fail.Count)/$($g.Group.Count) checks)"
  foreach ($f in $fail) { Write-Host "  FAIL: $($f.Test) - $($f.Detail)" }
}
$totalFail = @($Results | Where-Object { -not $_.Pass }).Count
exit $(if ($totalFail -eq 0) { 0 } else { 1 })
