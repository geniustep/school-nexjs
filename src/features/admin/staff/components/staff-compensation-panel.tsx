'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge, Card, SectionHead } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { useLocale } from '@/features/i18n/locale-context';
import {
  approveCompensationPeriod,
  calculateCompensationPeriod,
  createCompensationAgreement,
  createCompensationPeriod,
  fetchStaffCompensationSummary,
  fetchTeacherCompensationSummary,
  reviewCompensationPeriod,
} from '@/features/admin/staff/api/staff-compensation-api';
import type {
  CompensationAgreementWrite,
  CompensationMethod,
  CompensationPeriod,
  StaffCompensationSummary,
} from '@/types/staff-compensation';
import '@/features/admin/staff/staff-compensation.css';

type Labels = {
  title: string; subtitle: string; agreement: string; noAgreement: string; method: string;
  effectiveFrom: string; effectiveTo: string; amount: string; variableMethod: string; variableRate: string;
  notes: string; saveAgreement: string; history: string; periods: string; noPeriods: string; newPeriod: string;
  start: string; end: string; createPeriod: string; calculate: string; review: string; approve: string;
  quantity: string; sourceNotice: string; current: string; net: string; gross: string; deductions: string;
  allowances: string; bonuses: string; base: string; variable: string; state: string; paymentBoundary: string;
  pendingFinance: string; loading: string; forbidden: string; retry: string; agreementCreated: string;
  periodCreated: string; calculated: string; reviewed: string; approved: string; teacherNotice: string;
  contractRef: string; rate: string; currentPeriod: string; recentPeriods: string;
};

const LABELS: Record<string, Labels> = {
  ar: {
    title: 'المالية والتعويضات', subtitle: 'الاتفاق المالي والمستحقات الشهرية لهذا العضو من الطاقم.',
    agreement: 'الاتفاق المالي الحالي', noAgreement: 'لا يوجد اتفاق مالي فعّال بعد.', method: 'طريقة الاحتساب',
    effectiveFrom: 'ساري من', effectiveTo: 'ساري إلى', amount: 'القيمة', variableMethod: 'طريقة الجزء المتغير',
    variableRate: 'سعر الوحدة المتغيرة', notes: 'ملاحظات الاتفاق', saveAgreement: 'حفظ الاتفاق', history: 'تاريخ الاتفاقات',
    periods: 'المستحقات الشهرية', noPeriods: 'لا توجد فترات مستحقات بعد.', newPeriod: 'إنشاء مستحق شهري',
    start: 'من', end: 'إلى', createPeriod: 'إنشاء الفترة', calculate: 'احتساب', review: 'مراجعة', approve: 'اعتماد',
    quantity: 'الوحدات المعتمدة', sourceNotice: 'الحساب يتم في Odoo فقط. الحصص أو الساعات المجدولة لا تُعتبر مستحقة تلقائيًا.',
    current: 'الحالي', net: 'الصافي', gross: 'الإجمالي', deductions: 'الاقتطاعات', allowances: 'التعويضات', bonuses: 'المكافآت',
    base: 'الأساسي', variable: 'المتغير', state: 'الحالة', paymentBoundary: 'بعد الاعتماد ينتقل المستحق إلى المالية للأداء؛ هذه الشاشة لا تنفذ دفعًا نقديًا أو بنكيًا.',
    pendingFinance: 'في انتظار المالية', loading: 'جار التحميل…', forbidden: 'لا تملك صلاحية الاطلاع على أجور الطاقم.', retry: 'إعادة المحاولة',
    agreementCreated: 'تم إنشاء الاتفاق المالي.', periodCreated: 'تم إنشاء فترة المستحق.', calculated: 'تم احتساب المستحق.', reviewed: 'تمت مراجعة المستحق.', approved: 'تم اعتماد المستحق.',
    teacherNotice: 'للأستاذ: الإسنادات والحمل معلومات مساعدة فقط؛ الاستحقاق المتغير يعتمد وحدات معتمدة حتى ربط Teaching Execution لاحقًا.',
    contractRef: 'مرجع العقد', rate: 'السعر', currentPeriod: 'المستحق الحالي', recentPeriods: 'الفترات الأخيرة',
  },
  fr: {
    title: 'Rémunération', subtitle: 'Accord financier et droits mensuels de ce membre du personnel.', agreement: 'Accord actuel', noAgreement: 'Aucun accord financier actif.', method: 'Mode de calcul', effectiveFrom: 'Début', effectiveTo: 'Fin', amount: 'Montant', variableMethod: 'Mode variable', variableRate: 'Taux variable', notes: 'Notes', saveAgreement: 'Enregistrer', history: 'Historique des accords', periods: 'Droits mensuels', noPeriods: 'Aucune période.', newPeriod: 'Nouvelle période', start: 'Du', end: 'Au', createPeriod: 'Créer', calculate: 'Calculer', review: 'Réviser', approve: 'Approuver', quantity: 'Unités validées', sourceNotice: 'Le calcul est effectué par Odoo. Le planning ne vaut pas droit au paiement.', current: 'Actuel', net: 'Net', gross: 'Brut', deductions: 'Retenues', allowances: 'Indemnités', bonuses: 'Primes', base: 'Base', variable: 'Variable', state: 'État', paymentBoundary: 'Après approbation, le payable passe à Finance. Aucun paiement caisse/banque ici.', pendingFinance: 'En attente Finance', loading: 'Chargement…', forbidden: 'Vous n’avez pas accès aux rémunérations.', retry: 'Réessayer', agreementCreated: 'Accord créé.', periodCreated: 'Période créée.', calculated: 'Calcul terminé.', reviewed: 'Période révisée.', approved: 'Période approuvée.', teacherNotice: 'Pour un enseignant, les affectations restent informatives jusqu’à validation des unités ou Teaching Execution.', contractRef: 'Référence contrat', rate: 'Taux', currentPeriod: 'Période actuelle', recentPeriods: 'Périodes récentes',
  },
  en: {
    title: 'Compensation', subtitle: 'Financial agreement and monthly entitlements for this staff member.', agreement: 'Current agreement', noAgreement: 'No active financial agreement.', method: 'Method', effectiveFrom: 'Effective from', effectiveTo: 'Effective to', amount: 'Amount', variableMethod: 'Variable method', variableRate: 'Variable rate', notes: 'Notes', saveAgreement: 'Save agreement', history: 'Agreement history', periods: 'Monthly entitlements', noPeriods: 'No compensation periods yet.', newPeriod: 'Create monthly entitlement', start: 'From', end: 'To', createPeriod: 'Create period', calculate: 'Calculate', review: 'Review', approve: 'Approve', quantity: 'Validated units', sourceNotice: 'Odoo is the calculation source. Scheduled work is not automatically payroll eligible.', current: 'Current', net: 'Net', gross: 'Gross', deductions: 'Deductions', allowances: 'Allowances', bonuses: 'Bonuses', base: 'Base', variable: 'Variable', state: 'State', paymentBoundary: 'Approved payable is handed to Finance; this screen does not execute cash/bank payment.', pendingFinance: 'Pending Finance', loading: 'Loading…', forbidden: 'You do not have payroll access.', retry: 'Retry', agreementCreated: 'Agreement created.', periodCreated: 'Period created.', calculated: 'Period calculated.', reviewed: 'Period reviewed.', approved: 'Period approved.', teacherNotice: 'Teacher assignments/workload are informational until validated units or Teaching Execution are available.', contractRef: 'Contract reference', rate: 'Rate', currentPeriod: 'Current entitlement', recentPeriods: 'Recent periods',
  },
  es: {
    title: 'Compensación', subtitle: 'Acuerdo financiero y derechos mensuales del personal.', agreement: 'Acuerdo actual', noAgreement: 'No hay acuerdo activo.', method: 'Método', effectiveFrom: 'Desde', effectiveTo: 'Hasta', amount: 'Importe', variableMethod: 'Método variable', variableRate: 'Tarifa variable', notes: 'Notas', saveAgreement: 'Guardar', history: 'Historial', periods: 'Derechos mensuales', noPeriods: 'No hay períodos.', newPeriod: 'Nuevo período', start: 'Desde', end: 'Hasta', createPeriod: 'Crear', calculate: 'Calcular', review: 'Revisar', approve: 'Aprobar', quantity: 'Unidades validadas', sourceNotice: 'Odoo realiza el cálculo. Lo programado no genera derecho automático.', current: 'Actual', net: 'Neto', gross: 'Bruto', deductions: 'Deducciones', allowances: 'Complementos', bonuses: 'Bonos', base: 'Base', variable: 'Variable', state: 'Estado', paymentBoundary: 'Tras aprobar, pasa a Finanzas. Aquí no se paga por caja/banco.', pendingFinance: 'Pendiente Finanzas', loading: 'Cargando…', forbidden: 'Sin acceso a nómina.', retry: 'Reintentar', agreementCreated: 'Acuerdo creado.', periodCreated: 'Período creado.', calculated: 'Período calculado.', reviewed: 'Período revisado.', approved: 'Período aprobado.', teacherNotice: 'Las asignaciones docentes son informativas hasta validar unidades o Teaching Execution.', contractRef: 'Referencia', rate: 'Tarifa', currentPeriod: 'Período actual', recentPeriods: 'Períodos recientes',
  },
};

const METHOD_LABELS: Record<CompensationMethod, Record<string, string>> = {
  monthly_fixed: { ar: 'راتب شهري ثابت', fr: 'Mensuel fixe', en: 'Monthly fixed', es: 'Mensual fijo' },
  daily: { ar: 'حسب اليوم', fr: 'Journalier', en: 'Daily', es: 'Diario' },
  hourly: { ar: 'حسب الساعة', fr: 'Horaire', en: 'Hourly', es: 'Por hora' },
  per_session: { ar: 'حسب الحصة', fr: 'Par séance', en: 'Per session', es: 'Por sesión' },
  mixed: { ar: 'ثابت + متغير', fr: 'Fixe + variable', en: 'Fixed + variable', es: 'Fijo + variable' },
  stipend: { ar: 'منحة', fr: 'Indemnité', en: 'Stipend', es: 'Estipendio' },
  unpaid_internship: { ar: 'تدريب غير مؤدى', fr: 'Stage non rémunéré', en: 'Unpaid internship', es: 'Prácticas no remuneradas' },
};

const METHODS = Object.keys(METHOD_LABELS) as CompensationMethod[];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function monthBounds() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { start: iso(start), end: iso(end) };
}

function methodAmount(agreement: StaffCompensationSummary['current_agreement']) {
  if (!agreement) return null;
  switch (agreement.compensation_method) {
    case 'monthly_fixed': return agreement.fixed_monthly_amount;
    case 'daily': return agreement.daily_rate;
    case 'hourly': return agreement.hourly_rate;
    case 'per_session': return agreement.session_rate;
    case 'mixed': return agreement.fixed_amount;
    case 'stipend': return agreement.stipend_amount;
    case 'unpaid_internship': return 0;
  }
}

export function StaffCompensationPanel({ staffId, teacherId }: { staffId?: number; teacherId?: number }) {
  const { locale } = useLocale();
  const l = LABELS[locale] ?? LABELS.ar;
  const toast = useToast();
  const [summary, setSummary] = useState<StaffCompensationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showAgreementForm, setShowAgreementForm] = useState(false);
  const [showPeriodForm, setShowPeriodForm] = useState(false);
  const [method, setMethod] = useState<CompensationMethod>('monthly_fixed');
  const [effectiveFrom, setEffectiveFrom] = useState(today());
  const [amount, setAmount] = useState('');
  const [variableMethod, setVariableMethod] = useState<'daily' | 'hourly' | 'per_session'>('per_session');
  const [variableRate, setVariableRate] = useState('');
  const [terms, setTerms] = useState('');
  const [contractRef, setContractRef] = useState('');
  const bounds = useMemo(monthBounds, []);
  const [periodStart, setPeriodStart] = useState(bounds.start);
  const [periodEnd, setPeriodEnd] = useState(bounds.end);
  const [units, setUnits] = useState('');

  const money = useMemo(() => new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), [locale]);
  const formatMoney = (value?: number | null, currency?: string | null) => value == null ? '—' : `${money.format(value)} ${currency ?? ''}`.trim();
  const can = (action: string) => summary?.allowed_actions?.includes(action) ?? false;

  async function load() {
    setLoading(true);
    setError(null);
    const res = teacherId ? await fetchTeacherCompensationSummary(teacherId) : await fetchStaffCompensationSummary(staffId!);
    setLoading(false);
    if (!res.success) {
      setError(res.error.code === 'forbidden' || res.error.code === 'payroll_capability_missing' ? l.forbidden : res.error.message);
      setSummary(null);
      return;
    }
    setSummary(res.data);
  }

  useEffect(() => { void load(); }, [staffId, teacherId]);

  async function saveAgreement() {
    if (!summary?.staff.id || !effectiveFrom || busy) return;
    const value = Number(amount || 0);
    const variable = Number(variableRate || 0);
    const payload: CompensationAgreementWrite = {
      compensation_method: method,
      effective_from: effectiveFrom,
      state: 'active',
      is_base: true,
      link_teacher: Boolean(summary.staff.teacher_id),
      terms_note: terms || undefined,
      contract_reference: contractRef || undefined,
    };
    if (method === 'monthly_fixed') payload.fixed_monthly_amount = value;
    if (method === 'daily') payload.daily_rate = value;
    if (method === 'hourly') payload.hourly_rate = value;
    if (method === 'per_session') payload.session_rate = value;
    if (method === 'stipend') payload.stipend_amount = value;
    if (method === 'mixed') {
      payload.fixed_amount = value;
      payload.variable_method = variableMethod;
      payload.variable_rate = variable;
    }
    setBusy(true);
    const res = await createCompensationAgreement(summary.staff.id, payload);
    setBusy(false);
    if (!res.success) { toast.error(res.error.message); return; }
    toast.success(l.agreementCreated);
    setShowAgreementForm(false);
    setAmount(''); setVariableRate(''); setTerms(''); setContractRef('');
    await load();
  }

  async function createPeriod() {
    if (!summary?.staff.id || !summary.current_agreement || busy) return;
    setBusy(true);
    const created = await createCompensationPeriod(summary.staff.id, {
      period_start: periodStart,
      period_end: periodEnd,
      agreement_id: summary.current_agreement.id,
    });
    if (!created.success) { setBusy(false); toast.error(created.error.message); return; }
    let result: CompensationPeriod = created.data;
    const quantity = Number(units || 0);
    const m = summary.current_agreement.compensation_method;
    if (m === 'monthly_fixed' || m === 'stipend' || m === 'unpaid_internship' || quantity > 0 || m === 'mixed') {
      const payload: Record<string, unknown> = {};
      if (quantity > 0 && ['daily', 'hourly', 'per_session', 'mixed'].includes(m)) {
        payload.validated_units = { quantity, source_type: 'manual_validated', description: 'Validated compensation units' };
      }
      const calculated = await calculateCompensationPeriod(result.id, payload);
      if (calculated.success) result = calculated.data;
    }
    setBusy(false);
    toast.success(result.state === 'calculated' ? l.calculated : l.periodCreated);
    setShowPeriodForm(false); setUnits('');
    await load();
  }

  async function transition(period: CompensationPeriod, action: 'calculate' | 'review' | 'approve') {
    if (busy) return;
    setBusy(true);
    const res = action === 'calculate'
      ? await calculateCompensationPeriod(period.id, {})
      : action === 'review'
        ? await reviewCompensationPeriod(period.id)
        : await approveCompensationPeriod(period.id);
    setBusy(false);
    if (!res.success) { toast.error(res.error.message); return; }
    toast.success(action === 'calculate' ? l.calculated : action === 'review' ? l.reviewed : l.approved);
    await load();
  }

  if (loading) return <Card className="staff-compensation"><p className="muted">{l.loading}</p></Card>;
  if (error) return <Card className="staff-compensation"><p className="staff-compensation__error">{error}</p><button className="btn btn--ghost btn--sm" onClick={() => void load()}>{l.retry}</button></Card>;
  if (!summary) return null;

  const agreement = summary.current_agreement;
  const currentPeriod = summary.current_period;
  const currency = agreement?.currency ?? currentPeriod?.currency ?? 'MAD';
  const amountValue = methodAmount(agreement);
  const isTeacher = Boolean(summary.staff.teacher_id);

  return (
    <div className="staff-compensation">
      <div className="staff-compensation__hero">
        <div>
          <span className="staff-compensation__eyebrow">Staff Compensation V1</span>
          <h2>{l.title}</h2>
          <p>{l.subtitle}</p>
        </div>
        <div className="staff-compensation__hero-actions">
          {can('create_agreement') ? <button className="btn btn--ghost" onClick={() => setShowAgreementForm((v) => !v)}>{agreement ? l.history : l.saveAgreement}</button> : null}
          {agreement && can('create_period') ? <button className="btn btn--primary" onClick={() => setShowPeriodForm((v) => !v)}>{l.newPeriod}</button> : null}
        </div>
      </div>

      <div className="staff-compensation__notice">{l.sourceNotice}</div>
      {isTeacher ? <div className="staff-compensation__notice staff-compensation__notice--teacher">{l.teacherNotice}</div> : null}

      {showAgreementForm ? (
        <Card className="staff-compensation__form-card">
          <SectionHead title={l.agreement} />
          <div className="staff-compensation__form-grid">
            <label className="field"><span>{l.method}</span><select value={method} onChange={(e) => setMethod(e.target.value as CompensationMethod)}>{METHODS.map((m) => <option key={m} value={m}>{METHOD_LABELS[m][locale] ?? METHOD_LABELS[m].ar}</option>)}</select></label>
            <label className="field"><span>{l.effectiveFrom}</span><input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} /></label>
            {method !== 'unpaid_internship' ? <label className="field"><span>{method === 'mixed' ? l.base : l.amount}</span><input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></label> : null}
            {method === 'mixed' ? <><label className="field"><span>{l.variableMethod}</span><select value={variableMethod} onChange={(e) => setVariableMethod(e.target.value as typeof variableMethod)}><option value="daily">{METHOD_LABELS.daily[locale]}</option><option value="hourly">{METHOD_LABELS.hourly[locale]}</option><option value="per_session">{METHOD_LABELS.per_session[locale]}</option></select></label><label className="field"><span>{l.variableRate}</span><input inputMode="decimal" value={variableRate} onChange={(e) => setVariableRate(e.target.value)} /></label></> : null}
            <label className="field"><span>{l.contractRef}</span><input value={contractRef} onChange={(e) => setContractRef(e.target.value)} /></label>
            <label className="field staff-compensation__form-wide"><span>{l.notes}</span><textarea rows={3} value={terms} onChange={(e) => setTerms(e.target.value)} /></label>
          </div>
          <button className="btn btn--primary" disabled={busy || !effectiveFrom} onClick={() => void saveAgreement()}>{l.saveAgreement}</button>
        </Card>
      ) : null}

      {showPeriodForm && agreement ? (
        <Card className="staff-compensation__form-card">
          <SectionHead title={l.newPeriod} />
          <div className="staff-compensation__form-grid">
            <label className="field"><span>{l.start}</span><input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} /></label>
            <label className="field"><span>{l.end}</span><input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} /></label>
            {['daily', 'hourly', 'per_session', 'mixed'].includes(agreement.compensation_method) ? <label className="field"><span>{l.quantity}</span><input inputMode="decimal" value={units} onChange={(e) => setUnits(e.target.value)} /></label> : null}
          </div>
          <button className="btn btn--primary" disabled={busy || !periodStart || !periodEnd} onClick={() => void createPeriod()}>{l.createPeriod}</button>
        </Card>
      ) : null}

      <div className="staff-compensation__grid">
        <Card className="staff-compensation__agreement-card">
          <SectionHead title={l.agreement} action={agreement ? <Badge tone="green">{l.current}</Badge> : undefined} />
          {agreement ? (
            <div className="staff-compensation__agreement-main">
              <strong>{METHOD_LABELS[agreement.compensation_method]?.[locale] ?? agreement.compensation_method}</strong>
              <span className="staff-compensation__money">{formatMoney(amountValue, agreement.currency)}</span>
              {agreement.compensation_method === 'mixed' ? <span className="muted">+ {formatMoney(agreement.variable_rate, agreement.currency)} / {agreement.variable_method}</span> : null}
              <div className="staff-compensation__meta"><span>{l.effectiveFrom}: {agreement.effective_from}</span><span>{l.effectiveTo}: {agreement.effective_to ?? '—'}</span>{agreement.contract_reference ? <span>{l.contractRef}: {agreement.contract_reference}</span> : null}</div>
            </div>
          ) : <p className="muted">{l.noAgreement}</p>}
        </Card>

        <Card className="staff-compensation__period-card">
          <SectionHead title={l.currentPeriod} />
          {currentPeriod ? <PeriodSummary period={currentPeriod} labels={l} locale={locale} onTransition={transition} allowed={summary.allowed_actions ?? []} busy={busy} /> : <p className="muted">{l.noPeriods}</p>}
        </Card>
      </div>

      {(summary.recent_periods?.length ?? 0) > 0 ? (
        <Card>
          <SectionHead title={l.recentPeriods} />
          <div className="staff-compensation__period-list">
            {summary.recent_periods!.map((period) => <PeriodSummary key={period.id} period={period} labels={l} locale={locale} onTransition={transition} allowed={summary.allowed_actions ?? []} busy={busy} compact />)}
          </div>
        </Card>
      ) : null}

      {(summary.agreement_history_summary?.length ?? 0) > 1 ? (
        <Card>
          <SectionHead title={l.history} />
          <div className="staff-compensation__history">
            {summary.agreement_history_summary!.map((item) => <div key={item.id}><strong>{METHOD_LABELS[(item.compensation_method ?? item.method) as CompensationMethod]?.[locale] ?? item.method}</strong><span>{item.effective_from} → {item.effective_to ?? '…'}</span><Badge tone={item.state === 'active' ? 'green' : 'slate'}>{item.state ?? '—'}</Badge></div>)}
          </div>
        </Card>
      ) : null}

      <p className="staff-compensation__payment-boundary">{l.paymentBoundary}</p>
    </div>
  );
}

function PeriodSummary({ period, labels, locale, allowed, busy, compact = false, onTransition }: {
  period: CompensationPeriod; labels: Labels; locale: string; allowed: string[]; busy: boolean; compact?: boolean;
  onTransition: (period: CompensationPeriod, action: 'calculate' | 'review' | 'approve') => Promise<void>;
}) {
  const calc = period.calculation ?? {};
  const fmt = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const money = (v?: number) => v == null ? '—' : `${fmt.format(v)} ${period.currency ?? ''}`.trim();
  return (
    <div className={compact ? 'staff-compensation__period staff-compensation__period--compact' : 'staff-compensation__period'}>
      <div className="staff-compensation__period-head"><div><strong>{period.period_start} → {period.period_end}</strong><span>{labels.state}: {period.state}</span></div><Badge tone={period.state === 'approved' ? 'green' : period.state === 'under_review' ? 'blue' : 'slate'}>{period.state}</Badge></div>
      <div className="staff-compensation__totals"><div><span>{labels.base}</span><strong>{money(calc.base_amount)}</strong></div><div><span>{labels.variable}</span><strong>{money(calc.variable_amount)}</strong></div><div><span>{labels.gross}</span><strong>{money(calc.gross_amount)}</strong></div><div><span>{labels.deductions}</span><strong>{money(calc.deductions_amount)}</strong></div><div className="staff-compensation__net"><span>{labels.net}</span><strong>{money(calc.net_amount)}</strong></div></div>
      {!compact ? <div className="staff-compensation__period-actions">{period.state === 'draft' && allowed.includes('calculate') ? <button className="btn btn--ghost btn--sm" disabled={busy} onClick={() => void onTransition(period, 'calculate')}>{labels.calculate}</button> : null}{period.state === 'calculated' && allowed.includes('review') ? <button className="btn btn--ghost btn--sm" disabled={busy} onClick={() => void onTransition(period, 'review')}>{labels.review}</button> : null}{['calculated', 'under_review'].includes(period.state) && allowed.includes('approve') ? <button className="btn btn--primary btn--sm" disabled={busy} onClick={() => void onTransition(period, 'approve')}>{labels.approve}</button> : null}{period.state === 'approved' ? <Badge tone="amber">{labels.pendingFinance}</Badge> : null}</div> : null}
    </div>
  );
}
