import { STUDENT_IMPORT_COLUMNS } from './student-import-columns';
import { referenceListValues } from './student-import-reference';
import type { StudentImportReferenceData, StudentImportTemplateLabels } from './student-import-types';

export function buildStudentImportTemplateLabels(
  t: (key: string, params?: Record<string, string | number>) => string,
  reference: StudentImportReferenceData,
): StudentImportTemplateLabels {
  const columns: Record<string, string> = {};
  const comments: Record<string, string> = {};
  for (const column of STUDENT_IMPORT_COLUMNS) {
    columns[column.key] = t(column.labelKey);
    comments[column.key] = t(column.commentKey);
  }

  const schoolCode = referenceListFirst(reference, 'school_code');
  const yearCode = referenceListFirst(reference, 'academic_year_code');
  const levelCode = referenceListFirst(reference, 'level_code');
  const classCode = referenceListFirst(reference, 'class_code');

  return {
    columns,
    comments,
    instructions: {
      title: t('admin.studentImport.instructions.title'),
      purpose: t('admin.studentImport.instructions.purpose'),
      howToFill: t('admin.studentImport.instructions.howToFill'),
      requiredFields: t('admin.studentImport.instructions.requiredFields'),
      optionalFields: t('admin.studentImport.instructions.optionalFields'),
      dateFormat: t('admin.studentImport.instructions.dateFormat'),
      allowedValues: t('admin.studentImport.instructions.allowedValues'),
      doNotRenameColumns: t('admin.studentImport.instructions.doNotRenameColumns'),
      noFormulas: t('admin.studentImport.instructions.noFormulas'),
      noMergeCells: t('admin.studentImport.instructions.noMergeCells'),
      doNotDeleteSheets: t('admin.studentImport.instructions.doNotDeleteSheets'),
      maxRows: t('admin.studentImport.instructions.maxRows', { max: 500 }),
      excludedData: t('admin.studentImport.instructions.excludedData'),
      previewNote: t('admin.studentImport.instructions.previewNote'),
      classConsistency: t('admin.studentImport.instructions.classConsistency'),
      booleanValues: t('admin.studentImport.instructions.booleanValues'),
      templateVersionLabel: t('admin.studentImport.instructions.templateVersionLabel'),
      exampleNote: t('admin.studentImport.instructions.exampleNote'),
    },
    exampleRows: [
      {
        first_name: t('admin.studentImport.examples.new.firstName'),
        last_name: t('admin.studentImport.examples.new.lastName'),
        school_number: '2026001',
        gender: referenceListFirst(reference, 'gender') ?? 'male',
        status: 'active',
        school_code: schoolCode,
        academic_year_code: yearCode,
        level_code: levelCode,
        class_code: classCode,
        registration_type: 'new',
        actual_join_date: '2026-09-01',
      },
      {
        first_name: t('admin.studentImport.examples.reEnrollment.firstName'),
        last_name: t('admin.studentImport.examples.reEnrollment.lastName'),
        school_number: '2026002',
        status: 'active',
        school_code: schoolCode,
        academic_year_code: yearCode,
        level_code: levelCode,
        class_code: classCode,
        registration_type: 're_enrollment',
        is_repeating: 'yes',
      },
      {
        first_name: t('admin.studentImport.examples.transfer.firstName'),
        last_name: t('admin.studentImport.examples.transfer.lastName'),
        school_number: '2026003',
        status: 'active',
        school_code: schoolCode,
        academic_year_code: yearCode,
        level_code: levelCode,
        class_code: classCode,
        registration_type: 'transfer',
        previous_school: t('admin.studentImport.examples.transfer.previousSchool'),
      },
    ],
  };
}

function referenceListFirst(reference: StudentImportReferenceData, key: string): string {
  return referenceListValues(reference, key)[0] ?? '';
}
