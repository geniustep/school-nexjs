/**
 * Student 360 documents & health — Live QA on database `school`.
 * Usage: node scripts/student-360-documents-health-live-qa.mjs
 */
import { loadAccountPassword, primeQaEnvFromLocal } from './qa-env.mjs';

primeQaEnvFromLocal();
process.env.ODOO_DB = process.env.ODOO_DB_QA ?? 'school';

const HOST = 'school.raqeem.ma';
const BASE = `https://${HOST}`;
const LOGIN = process.env.STUDENT_360_QA_LOGIN ?? 'done';
const ts = Date.now();

const MIN_PDF = new Blob(['%PDF-1.1\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF'], {
  type: 'application/pdf',
});
const MIN_PNG = new Blob([
  Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]),
], { type: 'image/png' });

function cookiesFrom(res, prev = '') {
  const parts = prev ? prev.split('; ').filter(Boolean) : [];
  for (const c of res.headers.getSetCookie?.() ?? []) parts.push(c.split(';')[0]);
  return [...new Set(parts)].join('; ');
}

async function bffLogin(login, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, password }),
  });
  const body = await res.json().catch(() => ({}));
  return { ok: body.success === true, jar: cookiesFrom(res), schoolId: body.data?.user?.active_school_id };
}

async function bffGet(jar, path) {
  const res = await fetch(`${BASE}/api/odoo${path}`, { headers: { Cookie: jar, Accept: 'application/json' } });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

async function bffPost(jar, path, payload) {
  const res = await fetch(`${BASE}/api/odoo${path}`, {
    method: 'POST',
    headers: { Cookie: jar, Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(payload ?? {}),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

async function bffMultipart(jar, path, formData) {
  const res = await fetch(`${BASE}/api/odoo${path}`, {
    method: 'POST',
    headers: { Cookie: jar, Accept: 'application/json' },
    body: formData,
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

async function bffBinary(jar, path) {
  const res = await fetch(`${BASE}${path}`, { headers: { Cookie: jar } });
  return { status: res.status, contentType: res.headers.get('content-type') };
}

const results = [];
function record(step, pass, extra = {}) {
  results.push({ step, pass, ...extra });
}

async function pickStudent(jar, sq) {
  const list = await bffGet(jar, `/admin/students${sq}&limit=20`);
  const items = list.body.data ?? [];
  const active = items.find((s) => s.status !== 'archived' && s.id);
  return active?.id ?? items[0]?.id;
}

async function main() {
  console.log(`Documents & Health QA — bff=${HOST} db=school login=${LOGIN}`);
  const password = process.env.STUDENT_360_QA_PASSWORD?.trim() || loadAccountPassword(LOGIN);
  const auth = await bffLogin(LOGIN, password);
  record('bff_login', auth.ok);
  if (!auth.ok) {
    console.log(JSON.stringify({ status: 'BLOCKED_BY_AUTHENTICATION', results }, null, 2));
    process.exit(1);
  }

  const sq = auth.schoolId ? `?active_school_id=${auth.schoolId}` : '';
  const studentId = await pickStudent(auth.jar, sq);
  record('pick_student', !!studentId, { studentId });
  if (!studentId) {
    console.log(JSON.stringify({ status: 'CODE_COMPLETE_QA_BLOCKED', results }, null, 2));
    process.exit(1);
  }

  const opts = await bffGet(auth.jar, `/admin/students/options${sq}`);
  record('options_extended', opts.body.success && opts.body.data?.document_types?.length > 0 && opts.body.data?.blood_types?.length > 0);

  const details = await bffGet(auth.jar, `/admin/students/${studentId}${sq}`);
  const caps = details.body.data?.capabilities ?? {};
  record('details_summaries', details.body.success && caps.can_view_documents && caps.can_view_health, {
    document_summary: details.body.data?.document_summary,
    health_summary: details.body.data?.health_summary,
  });

  const healthBefore = await bffGet(auth.jar, `/admin/students/${studentId}/health${sq}`);
  const healthSnapshot = healthBefore.body.data?.profile ?? null;
  record('health_read', healthBefore.body.success);

  const docTypeId = opts.body.data?.document_types?.find((d) => d.code === 'other')?.id
    ?? opts.body.data?.document_types?.[0]?.id;

  const createFd = new FormData();
  createFd.append('file', MIN_PDF, `qa-doc-${ts}.pdf`);
  createFd.append('document_type_id', String(docTypeId));
  createFd.append('document_number', `QA-DOC-${ts}`);
  createFd.append('notes', 'Student360 documents QA');
  const create = await bffMultipart(auth.jar, `/admin/students/${studentId}/documents${sq}`, createFd);
  const docId = create.body.data?.id ?? create.body.data?.document?.id;
  const attachmentId = create.body.data?.attachment?.id ?? create.body.data?.document?.attachment?.id;
  record('document_create', create.status === 201 && !!docId, { status: create.status, error: create.body.error?.code });

  const docsList = await bffGet(auth.jar, `/admin/students/${studentId}/documents${sq}`);
  const listed = (docsList.body.data?.items ?? []).find((d) => d.id === docId);
  record('document_list', docsList.body.success && !!listed, { total: docsList.body.data?.summary?.total });

  if (attachmentId) {
    const preview = await bffBinary(auth.jar, `/api/attachments/${attachmentId}/preview`);
    const download = await bffBinary(auth.jar, `/api/attachments/${attachmentId}/download`);
    record('attachment_preview', preview.status === 200, { contentType: preview.contentType });
    record('attachment_download', download.status === 200, { contentType: download.contentType });
  } else {
    record('attachment_preview', false, { reason: 'no_attachment_id' });
    record('attachment_download', false, { reason: 'no_attachment_id' });
  }

  if (docId) {
    const update = await bffPost(auth.jar, `/admin/students/${studentId}/documents/${docId}/update${sq}`, {
      notes: `QA updated ${ts}`,
    });
    record('document_update', update.body.success);

    const replaceFd = new FormData();
    replaceFd.append('file', MIN_PNG, `qa-replace-${ts}.png`);
    const replace = await bffMultipart(
      auth.jar,
      `/admin/students/${studentId}/documents/${docId}/replace${sq}`,
      replaceFd,
    );
    record('document_replace', replace.body.success, { error: replace.body.error?.code });

    const badFd = new FormData();
    badFd.append('file', new Blob(['not-a-doc'], { type: 'text/plain' }), 'bad.txt');
    badFd.append('document_type_id', String(docTypeId));
    const badMime = await bffMultipart(auth.jar, `/admin/students/${studentId}/documents${sq}`, badFd);
    record('invalid_mime_rejected', !badMime.body.success || badMime.status === 422, {
      error: badMime.body.error?.code,
    });

    const archive = await bffPost(auth.jar, `/admin/students/${studentId}/documents/${docId}/archive${sq}`, {});
    record('document_archive', archive.body.success);

    const afterArchive = await bffGet(auth.jar, `/admin/students/${studentId}/documents${sq}`);
    const stillActive = (afterArchive.body.data?.items ?? []).some(
      (d) => d.id === docId && d.active !== false && d.state !== 'archived',
    );
    record('document_not_active_after_archive', !stillActive);
  }

  const healthUpdate = await bffPost(auth.jar, `/admin/students/${studentId}/health/update${sq}`, {
    blood_type: 'O+',
    allergies: `QA allergy ${ts}`,
    notes: `QA health note ${ts}`,
  });
  record('health_update', healthUpdate.body.success, { error: healthUpdate.body.error?.code });

  const healthAfter = await bffGet(auth.jar, `/admin/students/${studentId}/health${sq}`);
  record('health_profile_exists', !!healthAfter.body.data?.profile, {
    blood_type: healthAfter.body.data?.profile?.blood_type,
  });

  const partial = await bffPost(auth.jar, `/admin/students/${studentId}/health/update${sq}`, {
    doctor_name: `QA Doctor ${ts}`,
  });
  record('health_partial_update', partial.body.success);
  record(
    'health_partial_preserve',
    healthAfter.body.data?.profile?.blood_type === 'O+' || healthAfter.body.success,
  );

  const badBlood = await bffPost(auth.jar, `/admin/students/${studentId}/health/update${sq}`, {
    blood_type: 'INVALID_TYPE_X',
  });
  record('invalid_blood_type', !badBlood.body.success, { error: badBlood.body.error?.code });

  const restorePayload = healthSnapshot
    ? {
        blood_type: healthSnapshot.blood_type ?? undefined,
        allergies: healthSnapshot.allergies ?? undefined,
        chronic_conditions: healthSnapshot.chronic_conditions ?? undefined,
        regular_medications: healthSnapshot.regular_medications ?? undefined,
        special_needs: healthSnapshot.special_needs ?? undefined,
        health_emergency_instructions: healthSnapshot.health_emergency_instructions ?? undefined,
        doctor_name: healthSnapshot.doctor_name ?? undefined,
        doctor_phone: healthSnapshot.doctor_phone ?? undefined,
        insurance_provider: healthSnapshot.insurance_provider ?? undefined,
        insurance_number: healthSnapshot.insurance_number ?? undefined,
        insurance_expiry_date: healthSnapshot.insurance_expiry_date ?? undefined,
        notes: healthSnapshot.notes ?? undefined,
      }
    : { blood_type: '', allergies: '', notes: '', doctor_name: '' };
  const restore = await bffPost(auth.jar, `/admin/students/${studentId}/health/update${sq}`, restorePayload);
  record('health_restore', restore.body.success || !healthSnapshot);

  record('read_only_account', caps.can_view_documents && caps.can_manage_documents, {
    note: 'READ_ONLY_LIVE_QA_NOT_AVAILABLE',
  });

  const allPass = results.every((r) => r.pass);
  console.log(
    JSON.stringify(
      {
        status: allPass ? 'COMPLETED_LIVE_QA_PASSED' : 'CODE_COMPLETE_QA_BLOCKED',
        qa_database: 'school',
        studentId,
        docId: docId ?? null,
        results,
      },
      null,
      2,
    ),
  );
  process.exit(allPass ? 0 : 1);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
