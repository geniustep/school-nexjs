'use client';

import { useT } from '@/features/i18n/locale-context';
import type { StudentImportFlowPhase } from './student-import-server-types';

const STEP_ORDER: StudentImportStepId[] = [
  'download',
  'fill',
  'upload',
  'localValidate',
  'serverValidate',
  'review',
  'execute',
  'results',
];

export type StudentImportStepId =
  | 'download'
  | 'fill'
  | 'upload'
  | 'localValidate'
  | 'serverValidate'
  | 'review'
  | 'execute'
  | 'results';

function stepIndex(step: StudentImportStepId): number {
  return STEP_ORDER.indexOf(step);
}

export function resolveStudentImportUiStep(phase: StudentImportFlowPhase): StudentImportStepId {
  switch (phase) {
    case 'idle':
      return 'download';
    case 'file_loaded':
      return 'upload';
    case 'local_validating':
      return 'localValidate';
    case 'local_invalid':
    case 'local_valid':
      return 'localValidate';
    case 'server_validating':
      return 'serverValidate';
    case 'server_invalid':
    case 'server_valid':
      return 'serverValidate';
    case 'confirming':
      return 'review';
    case 'executing':
    case 'polling':
      return 'execute';
    case 'completed':
    case 'completed_with_errors':
    case 'failed':
      return 'results';
    default:
      return 'download';
  }
}

export function StudentImportStepper({ activeStep }: { activeStep: StudentImportStepId }) {
  const t = useT();
  const labels: Record<StudentImportStepId, string> = {
    download: t('admin.studentImport.steps.download'),
    fill: t('admin.studentImport.steps.fill'),
    upload: t('admin.studentImport.steps.upload'),
    localValidate: t('admin.studentImport.steps.localValidate'),
    serverValidate: t('admin.studentImport.steps.serverValidate'),
    review: t('admin.studentImport.steps.review'),
    execute: t('admin.studentImport.steps.execute'),
    results: t('admin.studentImport.steps.results'),
  };

  const activeIndex = stepIndex(activeStep);

  return (
    <ol className="student-import-stepper" aria-label={t('admin.studentImport.stepperLabel')}>
      {STEP_ORDER.map((step, index) => {
        const active = step === activeStep;
        const done = index < activeIndex;
        return (
          <li
            key={step}
            className="student-import-stepper__item"
            data-active={active || undefined}
            data-done={done || undefined}
          >
            <span className="student-import-stepper__badge">{index + 1}</span>
            <span className="student-import-stepper__label">{labels[step]}</span>
          </li>
        );
      })}
    </ol>
  );
}
