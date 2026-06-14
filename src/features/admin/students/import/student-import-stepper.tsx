'use client';

import { useT } from '@/features/i18n/locale-context';

export type StudentImportStepId =
  | 'download'
  | 'fill'
  | 'upload'
  | 'validate'
  | 'preview'
  | 'execute';

const STEP_ORDER: StudentImportStepId[] = [
  'download',
  'fill',
  'upload',
  'validate',
  'preview',
  'execute',
];

export function StudentImportStepper({ activeStep }: { activeStep: StudentImportStepId }) {
  const t = useT();
  const labels: Record<StudentImportStepId, string> = {
    download: t('admin.studentImport.steps.download'),
    fill: t('admin.studentImport.steps.fill'),
    upload: t('admin.studentImport.steps.upload'),
    validate: t('admin.studentImport.steps.validate'),
    preview: t('admin.studentImport.steps.preview'),
    execute: t('admin.studentImport.steps.execute'),
  };

  const activeIndex = STEP_ORDER.indexOf(activeStep);

  return (
    <ol className="student-import-stepper" aria-label={t('admin.studentImport.stepperLabel')}>
      {STEP_ORDER.map((step, index) => {
        const active = step === activeStep;
        const done = index < activeIndex;
        const future = step === 'execute';
        return (
          <li
            key={step}
            className="student-import-stepper__item"
            data-active={active || undefined}
            data-done={done || undefined}
            data-future={future || undefined}
          >
            <span className="student-import-stepper__badge">{index + 1}</span>
            <span className="student-import-stepper__label">{labels[step]}</span>
            {future ? (
              <span className="student-import-stepper__hint tiny muted">
                {t('admin.studentImport.executeFutureHint')}
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

export function resolveStudentImportStep(args: {
  hasFile: boolean;
  validating: boolean;
  hasResult: boolean;
}): StudentImportStepId {
  if (args.hasResult) return 'preview';
  if (args.validating) return 'validate';
  if (args.hasFile) return 'upload';
  return 'download';
}
