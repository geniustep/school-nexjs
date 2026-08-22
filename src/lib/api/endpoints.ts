// Central endpoint registry — the ONLY place API v1 paths are defined.
// Paths are relative to the API v1 prefix (/api/v1).
//
// Synced with Odoo smart_school_connect — includes academic setup API (teaching assignments,
// staff, tracks, setup readiness). Teacher class scope: GET /teacher/classes (+ 403 on detail).
// Parent children: GET /parent/children only. Student homework: /student/homeworks.

export const endpoints = {
  auth: {
    login: '/auth/login',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
    me: '/me',
    accountActivationVerify: '/auth/account-activation/verify',
    accountActivationSetPassword: '/auth/account-activation/set-password',
  },

  public: {
    schoolBranding: '/public/school-branding',
    schoolBrandingLogo: '/public/school-branding/logo',
    accountActivationLinkInspect: '/public/account-activation/inspect',
    accountActivationLinkComplete: '/public/account-activation/complete',
  },

  admin: {
    dashboard: '/admin/dashboard',
    executiveDashboard: '/admin/dashboard/executive',
    schoolBranding: '/admin/school-branding',

    students: '/admin/students',
    /** Multi-child family registration (REGISTRATION-FINANCE-3D1/3D2). */
    studentsBatchRegistration: '/admin/students/batch-registration',
    studentsOptions: '/admin/students/options',
    studentsFinancialServiceCounts: '/admin/students/financial-service-counts',
    student: (id: number | string) => `/admin/students/${id}`,
    studentOverview: (id: number | string) => `/admin/students/${id}/overview`,
    studentUpdate: (id: number | string) => `/admin/students/${id}/update`,
    studentAccount: (id: number | string) => `/admin/students/${id}/account`,
    studentArchive: (id: number | string) => `/admin/students/${id}/archive`,
    studentEnrollment: (id: number | string) => `/admin/students/${id}/enrollment`,
    studentEnrollments: (id: number | string) => `/admin/students/${id}/enrollments`,
    studentGuardians: (id: number | string) => `/admin/students/${id}/guardians`,
    studentCoGuardianStudents: (id: number | string) =>
      `/admin/students/${id}/co-guardian-students`,
    studentGuardianCandidates: (id: number | string) =>
      `/admin/students/${id}/guardian-candidates`,
    studentGuardiansLinkPerson: (id: number | string) =>
      `/admin/students/${id}/guardians/link-person`,
    studentGuardianUpdate: (studentId: number | string, relationshipId: number | string) =>
      `/admin/students/${studentId}/guardians/${relationshipId}/update`,
    studentGuardianRelationship: (studentId: number | string, relationshipId: number | string) =>
      `/admin/students/${studentId}/guardians/${relationshipId}`,
    studentGuardianEnd: (studentId: number | string, relationshipId: number | string) =>
      `/admin/students/${studentId}/guardians/${relationshipId}/end`,
    studentGuardianRemove: (studentId: number | string, relationshipId: number | string) =>
      `/admin/students/${studentId}/guardians/${relationshipId}/remove`,
    studentDocuments: (id: number | string) => `/admin/students/${id}/documents`,
    studentDocumentUpdate: (studentId: number | string, documentId: number | string) =>
      `/admin/students/${studentId}/documents/${documentId}/update`,
    studentDocumentReplace: (studentId: number | string, documentId: number | string) =>
      `/admin/students/${studentId}/documents/${documentId}/replace`,
    studentDocumentArchive: (studentId: number | string, documentId: number | string) =>
      `/admin/students/${studentId}/documents/${documentId}/archive`,
    studentHealth: (id: number | string) => `/admin/students/${id}/health`,
    studentHealthUpdate: (id: number | string) => `/admin/students/${id}/health/update`,
    studentFinanceSummary: (id: number | string) => `/admin/students/${id}/finance/summary`,
    studentFinanceWorkspace: (id: number | string) => `/admin/students/${id}/finance`,
    studentFinancialAgreements: (id: number | string) => `/admin/students/${id}/financial-agreements`,
    studentInstallments: (id: number | string) => `/admin/students/${id}/installments`,
    studentServiceSubscriptions: (id: number | string) => `/admin/students/${id}/service-subscriptions`,
    financialAgreement: (id: number | string) => `/admin/financial-agreements/${id}`,
    financialAgreementSubmit: (id: number | string) => `/admin/financial-agreements/${id}/submit`,
    financialAgreementApprove: (id: number | string) => `/admin/financial-agreements/${id}/approve`,
    financialAgreementActivate: (id: number | string) => `/admin/financial-agreements/${id}/activate`,
    financialAgreementCancel: (id: number | string) => `/admin/financial-agreements/${id}/cancel`,
    financialAgreementResolveFinanceReview: (id: number | string) =>
      `/admin/financial-agreements/${id}/resolve-finance-review`,
    financialAgreementSchedule: (id: number | string) => `/admin/financial-agreements/${id}/schedule`,
    financialAgreementLinesPreview: (id: number | string) =>
      `/admin/financial-agreements/${id}/lines/preview`,
    financialAgreementSchedulePreview: (id: number | string) =>
      `/admin/financial-agreements/${id}/schedule/preview`,
    financialAgreementScheduleGenerate: (id: number | string) =>
      `/admin/financial-agreements/${id}/schedule/generate`,
    financialAgreementScheduleCancelFuture: (id: number | string) =>
      `/admin/financial-agreements/${id}/schedule/cancel-future`,
    serviceSubscription: (id: number | string) => `/admin/service-subscriptions/${id}`,
    financeServices: '/admin/finance/services',
    financeService: (id: number | string) => `/admin/finance/services/${id}`,
    financeServiceTariffs: '/admin/finance/service-tariffs',
    guardiansSearch: '/admin/guardians/search',
    guardiansLinkPartner: '/admin/guardians/link-partner',
    guardiansQuickCreate: '/admin/guardians/quick-create',
    studentsImport: '/admin/students/import',
    studentImportValidate: '/admin/students/import/validate',
    studentImportExecute: (jobId: number | string) => `/admin/students/import/${jobId}/execute`,
    studentImportJob: (jobId: number | string) => `/admin/students/import/${jobId}`,
    studentImportTemplate: '/admin/students/import/template',
    studentsExport: '/admin/students/export',

    parents: '/admin/parents',
    parentsOptions: '/admin/parents/options',
    parent: (id: number | string) => `/admin/parents/${id}`,
    parentUpdate: (id: number | string) => `/admin/parents/${id}/update`,
    parentAccount: (id: number | string) => `/admin/parents/${id}/account`,
    parentArchive: (id: number | string) => `/admin/parents/${id}/archive`,
    parentRestore: (id: number | string) => `/admin/parents/${id}/restore`,
    parentDelete: (id: number | string) => `/admin/parents/${id}/delete`,
    parentDeleteImpact: (id: number | string) => `/admin/parents/${id}/delete-impact`,
    guardianRestore: (id: number | string) => `/admin/guardians/${id}/restore`,
    guardianDelete: (id: number | string) => `/admin/guardians/${id}/delete`,
    guardianDeleteImpact: (id: number | string) => `/admin/guardians/${id}/delete-impact`,
    parentsImport: '/admin/parents/import',
    parentsExport: '/admin/parents/export',

    teachers: '/admin/teachers',
    teachersOptions: '/admin/teachers/options',
    teacher: (id: number | string) => `/admin/teachers/${id}`,
    teacherUpdate: (id: number | string) => `/admin/teachers/${id}/update`,
    teacherArchive: (id: number | string) => `/admin/teachers/${id}/archive`,
    /** Teacher Domain lifecycle — SSC-API-2026.07.001 */
    teacherTerminate: (id: number | string) => `/admin/teachers/${id}/terminate`,
    teacherReactivate: (id: number | string) => `/admin/teachers/${id}/reactivate`,
    teacherAcademicProfile: (id: number | string) => `/admin/teachers/${id}/academic-profile`,
    teacherDomainContract: '/admin/teacher-domain/contract',
    teachersImport: '/admin/teachers/import',
    teachersExport: '/admin/teachers/export',

    classes: '/admin/classes',
    class: (id: number | string) => `/admin/classes/${id}`,
    classUpdate: (id: number | string) => `/admin/classes/${id}/update`,
    classArchive: (id: number | string) => `/admin/classes/${id}/archive`,
    classDelete: (id: number | string) => `/admin/classes/${id}`,
    classesImport: '/admin/classes/import',
    classesExport: '/admin/classes/export',

    levels: '/admin/levels',
    level: (id: number | string) => `/admin/levels/${id}`,
    levelUpdate: (id: number | string) => `/admin/levels/${id}/update`,
    levelArchive: (id: number | string) => `/admin/levels/${id}/archive`,
    levelsExport: '/admin/levels/export',
    levelsOptions: '/admin/levels/options',
    levelsEnable: '/admin/levels/enable',
    levelLinkReference: (id: number | string) => `/admin/levels/${id}/link-reference`,
    levelDelete: (id: number | string) => `/admin/levels/${id}`,

    subjects: '/admin/subjects',
    subjectsOptions: '/admin/subjects/options',
    subjectsEnable: '/admin/subjects/enable',
    /** Odoo 236 — school.enabled.subject matrix (GET). */
    subjectsEnablement: '/admin/subjects/enablement',
    /** Odoo 236 — bulk enable/disable operational subjects for a level (POST). */
    subjectsEnablementUpdate: '/admin/subjects/enablement/update',
    subjectsPlanUpdate: '/admin/subjects/plan/update',
    subject: (id: number | string) => `/admin/subjects/${id}`,
    subjectUpdate: (id: number | string) => `/admin/subjects/${id}/update`,
    subjectArchive: (id: number | string) => `/admin/subjects/${id}/archive`,
    subjectsImport: '/admin/subjects/import',
    subjectsExport: '/admin/subjects/export',
    /** Platform-only — create global school.ref.subject (POST exact). */
    referenceSubjects: '/admin/reference-subjects',

    setupReadiness: '/admin/setup/readiness',
    setupAcademicInitialize: '/admin/setup/academic/initialize',

    /** Hierarchical academic filter options — GET only. */
    academicContextOptions: '/admin/academic-context/options',
    academicYearTerms: (academicYearId: number | string) =>
      `/admin/academic-years/${academicYearId}/terms`,
    academicYearTermsInitialize: (academicYearId: number | string) =>
      `/admin/academic-years/${academicYearId}/terms/initialize`,
    /** Draft term edit — Odoo PATCH /admin/academic-setup/terms/<term_id> */
    academicSetupTerm: (termId: number | string) =>
      `/admin/academic-setup/terms/${termId}`,

    teachingAssignments: '/admin/teaching-assignments',
    teachingAssignment: (id: number | string) => `/admin/teaching-assignments/${id}`,
    teachingAssignmentUpdate: (id: number | string) =>
      `/admin/teaching-assignments/${id}/update`,
    teachingAssignmentSuggestions: '/admin/teaching-assignments/suggestions',
    teachingAssignmentEligibleTeachers: '/admin/teaching-assignments/eligible-teachers',
    /** Teaching Assignment lifecycle — SSC-API-2026.07.001 */
    teachingAssignmentActivate: (id: number | string) =>
      `/admin/teaching-assignments/${id}/activate`,
    teachingAssignmentSuspend: (id: number | string) =>
      `/admin/teaching-assignments/${id}/suspend`,
    teachingAssignmentResume: (id: number | string) =>
      `/admin/teaching-assignments/${id}/resume`,
    teachingAssignmentEnd: (id: number | string) => `/admin/teaching-assignments/${id}/end`,
    teachingAssignmentCancel: (id: number | string) =>
      `/admin/teaching-assignments/${id}/cancel`,

    teachingReferences: '/admin/teaching-references',
    teachingReference: (id: number | string) => `/admin/teaching-references/${id}`,
    teachingReferenceSubmitForReview: (id: number | string) =>
      `/admin/teaching-references/${id}/submit-for-review`,
    teachingReferenceApprove: (id: number | string) =>
      `/admin/teaching-references/${id}/approve`,
    teachingReferenceResetToDraft: (id: number | string) =>
      `/admin/teaching-references/${id}/reset-to-draft`,
    teachingReferenceArchive: (id: number | string) =>
      `/admin/teaching-references/${id}/archive`,
    teachingReferenceDuplicateVersion: (id: number | string) =>
      `/admin/teaching-references/${id}/duplicate-version`,

    teachingOfferings: '/admin/teaching-offerings',
    teachingOffering: (id: number | string) => `/admin/teaching-offerings/${id}`,
    teachingOfferingSubmitForReview: (id: number | string) =>
      `/admin/teaching-offerings/${id}/submit-for-review`,
    teachingOfferingApprove: (id: number | string) =>
      `/admin/teaching-offerings/${id}/approve`,
    teachingOfferingResetToDraft: (id: number | string) =>
      `/admin/teaching-offerings/${id}/reset-to-draft`,
    teachingOfferingArchive: (id: number | string) =>
      `/admin/teaching-offerings/${id}/archive`,
    teachingOfferingDuplicate: (id: number | string) =>
      `/admin/teaching-offerings/${id}/duplicate`,
    teachingOfferingActivate: (id: number | string) =>
      `/admin/teaching-offerings/${id}/activate`,

    didacticSequences: '/admin/didactic-sequences',
    didacticSequence: (id: number | string) => `/admin/didactic-sequences/${id}`,
    didacticSequenceSubmitForReview: (id: number | string) =>
      `/admin/didactic-sequences/${id}/submit-for-review`,
    didacticSequenceApprove: (id: number | string) =>
      `/admin/didactic-sequences/${id}/approve`,
    didacticSequenceResetToDraft: (id: number | string) =>
      `/admin/didactic-sequences/${id}/reset-to-draft`,
    didacticSequenceArchive: (id: number | string) =>
      `/admin/didactic-sequences/${id}/archive`,
    didacticSequenceDuplicateVersion: (id: number | string) =>
      `/admin/didactic-sequences/${id}/duplicate-version`,

    annualDistributions: '/admin/annual-distributions',
    annualDistribution: (id: number | string) => `/admin/annual-distributions/${id}`,
    annualDistributionSubmitForReview: (id: number | string) =>
      `/admin/annual-distributions/${id}/submit-for-review`,
    annualDistributionApprove: (id: number | string) =>
      `/admin/annual-distributions/${id}/approve`,
    annualDistributionResetToDraft: (id: number | string) =>
      `/admin/annual-distributions/${id}/reset-to-draft`,
    annualDistributionArchive: (id: number | string) =>
      `/admin/annual-distributions/${id}/archive`,
    annualDistributionDuplicateVersion: (id: number | string) =>
      `/admin/annual-distributions/${id}/duplicate-version`,
    annualDistributionActivate: (id: number | string) =>
      `/admin/annual-distributions/${id}/activate`,
    annualDistributionTimeline: (id: number | string) =>
      `/admin/annual-distributions/${id}/timeline`,
    annualDistributionLinesValidateBatch: (id: number | string) =>
      `/admin/annual-distributions/${id}/lines/validate-batch`,
    annualDistributionLinesApplyBatch: (id: number | string) =>
      `/admin/annual-distributions/${id}/lines/apply-batch`,

    referenceJathathas: '/admin/reference-jathathas',
    referenceJathatha: (id: number | string) => `/admin/reference-jathathas/${id}`,
    referenceJathathaSubmitForReview: (id: number | string) =>
      `/admin/reference-jathathas/${id}/submit-for-review`,
    referenceJathathaApprove: (id: number | string) =>
      `/admin/reference-jathathas/${id}/approve`,
    referenceJathathaResetToDraft: (id: number | string) =>
      `/admin/reference-jathathas/${id}/reset-to-draft`,
    referenceJathathaArchive: (id: number | string) =>
      `/admin/reference-jathathas/${id}/archive`,
    referenceJathathaDuplicateVersion: (id: number | string) =>
      `/admin/reference-jathathas/${id}/duplicate-version`,

    teacherJathathasAdmin: '/admin/teacher-jathathas',
    teacherJathathaAdmin: (id: number | string) => `/admin/teacher-jathathas/${id}`,
    teacherJathathaMarkReviewed: (id: number | string) =>
      `/admin/teacher-jathathas/${id}/mark-reviewed`,
    teacherJathathaRequestCorrection: (id: number | string) =>
      `/admin/teacher-jathathas/${id}/request-correction`,

    actualDeliveries: '/admin/actual-deliveries',
    actualDelivery: (id: number | string) => `/admin/actual-deliveries/${id}`,
    actualDeliveryMarkReviewed: (id: number | string) =>
      `/admin/actual-deliveries/${id}/mark-reviewed`,
    actualDeliveryRequestCorrection: (id: number | string) =>
      `/admin/actual-deliveries/${id}/request-correction`,
    classJournal: '/admin/class-journal',
    classJournalEntry: (id: number | string) => `/admin/class-journal/${id}`,
    teachingProgressLines: '/admin/teaching-progress-lines',
    teachingProgressLine: (id: number | string) => `/admin/teaching-progress-lines/${id}`,
    teachingProgressSummary: '/admin/teaching-progress-summary',
    teachingExecutionDecisions: '/admin/teaching/execution-decisions',
    /** Odoo 221 Assessment Support (admin aggregate — no PII in summary). */
    teachingAssessmentSupportSummary: '/admin/teaching/assessment-support/summary',
    teachingAssessmentSupportStudent: (studentId: number | string) =>
      `/admin/teaching/assessment-support/students/${studentId}`,
    teachingLearningObjectivesAdmin: '/admin/teaching/learning-objectives',
    teachingMasteryScalesAdmin: '/admin/teaching/mastery-scales',
    teachingDifficultyCategoriesAdmin: '/admin/teaching/difficulty-categories',

    /** Odoo 224 Teaching Stage 9 — review / publication / print / archive / export / closure. */
    teachingReviewQueue: '/admin/teaching/review-queue',
    teachingAdminDashboardFoundation: '/admin/teaching/admin-dashboard-foundation',
    teachingDocumentMarkReviewed: (documentType: string, documentId: number | string) =>
      `/admin/teaching/documents/${documentType}/${documentId}/mark-reviewed`,
    teachingDocumentRequestChanges: (documentType: string, documentId: number | string) =>
      `/admin/teaching/documents/${documentType}/${documentId}/request-changes`,
    teachingDocumentApproveOfficial: (documentType: string, documentId: number | string) =>
      `/admin/teaching/documents/${documentType}/${documentId}/approve-official`,
    teachingDocumentVersions: (documentType: string, documentId: number | string) =>
      `/admin/teaching/documents/${documentType}/${documentId}/versions`,
    teachingDocumentDraftPrint: (documentType: string, documentId: number | string) =>
      `/admin/teaching/documents/${documentType}/${documentId}/print/draft`,
    teachingPublication: (publicationId: number | string) =>
      `/admin/teaching/publications/${publicationId}`,
    teachingPublicationArchive: (publicationId: number | string) =>
      `/admin/teaching/publications/${publicationId}/archive`,
    teachingPublicationOfficialPrint: (publicationId: number | string) =>
      `/admin/teaching/publications/${publicationId}/print/official`,
    teachingPublicationDownload: (publicationId: number | string) =>
      `/admin/teaching/publications/${publicationId}/download`,
    teachingArchive: '/admin/teaching/archive',
    teachingExports: '/admin/teaching/exports',
    teachingExport: (exportId: number | string) => `/admin/teaching/exports/${exportId}`,
    teachingExportDownload: (exportId: number | string) =>
      `/admin/teaching/exports/${exportId}/download`,
    teachingPeriodClosures: '/admin/teaching/period-closures',
    teachingPeriodClosurePreview: '/admin/teaching/period-closures/preview',
    teachingPeriodClosureClose: '/admin/teaching/period-closures/close',
    teachingPeriodClosure: (closureId: number | string) =>
      `/admin/teaching/period-closures/${closureId}`,
    teachingPeriodClosureReopen: (closureId: number | string) =>
      `/admin/teaching/period-closures/${closureId}/reopen`,
    teachingPeriodClosureEvents: (closureId: number | string) =>
      `/admin/teaching/period-closures/${closureId}/events`,
    teachingPeriodClosureExceptions: (closureId: number | string) =>
      `/admin/teaching/period-closures/${closureId}/exceptions`,

    staff: '/admin/staff',
    staffMember: (id: number | string) => `/admin/staff/${id}`,
    staffEffectivePermissions: (id: number | string) =>
      `/admin/staff/${id}/effective-permissions`,
    staffUpdate: (id: number | string) => `/admin/staff/${id}/update`,
    staffDeactivate: (id: number | string) => `/admin/staff/${id}/deactivate`,
    staffReactivate: (id: number | string) => `/admin/staff/${id}/reactivate`,
    staffAccount: (id: number | string) => `/admin/staff/${id}/account`,
    staffOptions: '/admin/staff/options',
    staffTemplates: '/admin/staff/templates',
    staffTemplatePreview: '/admin/staff/templates/preview',
    staffFromTemplate: '/admin/staff/from-template',

    tracks: '/admin/tracks',
    track: (id: number | string) => `/admin/tracks/${id}`,
    trackUpdate: (id: number | string) => `/admin/tracks/${id}/update`,
    trackOptions: '/admin/tracks/options',

    attendance: '/admin/attendance',
    attendanceCorrect: '/admin/attendance/correct',

    homeworks: '/admin/homeworks',
    homeworksExport: '/admin/homeworks/export',
    homework: (id: number | string) => `/admin/homeworks/${id}`,
    homeworkUpdate: (id: number | string) => `/admin/homeworks/${id}/update`,
    homeworkPublish: (id: number | string) => `/admin/homeworks/${id}/publish`,
    homeworkClose: (id: number | string) => `/admin/homeworks/${id}/close`,
    homeworkArchive: (id: number | string) => `/admin/homeworks/${id}/archive`,
    homeworkSubmissions: (id: number | string) => `/admin/homeworks/${id}/submissions`,
    homeworkAttachments: (id: number | string) => `/admin/homeworks/${id}/attachments`,

    attachmentDelete: (id: number | string) => `/admin/attachments/${id}`,
    attachmentReplace: (id: number | string) => `/admin/attachments/${id}/replace`,
    examAttachments: (id: number | string) => `/admin/exams/${id}/attachments`,

    resources: '/admin/resources',
    resourcesExport: '/admin/resources/export',
    resource: (id: number | string) => `/admin/resources/${id}`,
    resourceUpdate: (id: number | string) => `/admin/resources/${id}/update`,
    resourcePublish: (id: number | string) => `/admin/resources/${id}/publish`,
    resourceArchive: (id: number | string) => `/admin/resources/${id}/archive`,
    resourceAttachments: (id: number | string) => `/admin/resources/${id}/attachments`,

    timetable: '/admin/timetable',
    timetableSlots: '/admin/timetable/slots',
    timetableSlotUpdate: (id: number | string) => `/admin/timetable/slots/${id}/update`,
    timetableSlotArchive: (id: number | string) => `/admin/timetable/slots/${id}/archive`,

    academicCalendars: '/admin/academic-calendars',
    academicCalendar: (id: number | string) => `/admin/academic-calendars/${id}`,
    academicCalendarEvents: (id: number | string) => `/admin/academic-calendars/${id}/events`,
    academicCalendarEvent: (calendarId: number | string, eventId: number | string) =>
      `/admin/academic-calendars/${calendarId}/events/${eventId}`,
    academicCalendarSubmitReview: (id: number | string) =>
      `/admin/academic-calendars/${id}/submit-review`,
    academicCalendarResetToDraft: (id: number | string) =>
      `/admin/academic-calendars/${id}/reset-to-draft`,
    academicCalendarPublish: (id: number | string) => `/admin/academic-calendars/${id}/publish`,
    academicCalendarDuplicate: (id: number | string) =>
      `/admin/academic-calendars/${id}/duplicate`,
    academicCalendarArchive: (id: number | string) => `/admin/academic-calendars/${id}/archive`,
    /** Query: academic_year_id (required), school_id?, date_from?, date_to?, include_provisional? */
    academicCalendarEffectiveEvents: '/admin/academic-calendars/effective-events',
    /** Query: date (required), calendar_id? or academic_year_id?, include_provisional? */
    academicCalendarClosureContext: '/admin/academic-calendars/closure-context',

    exams: '/admin/exams',
    examsExport: '/admin/exams/export',
    exam: (id: number | string) => `/admin/exams/${id}`,
    examUpdate: (id: number | string) => `/admin/exams/${id}/update`,
    examPublish: (id: number | string) => `/admin/exams/${id}/publish`,
    examDone: (id: number | string) => `/admin/exams/${id}/done`,
    examCancel: (id: number | string) => `/admin/exams/${id}/cancel`,
    examArchive: (id: number | string) => `/admin/exams/${id}/archive`,

    examResults: '/admin/exam-results',
    examResultsExport: '/admin/exam-results/export',
    examResult: (id: number | string) => `/admin/exam-results/${id}`,
    examResultsByExam: (examId: number | string) => `/admin/exams/${examId}/results`,
    examResultsInit: (examId: number | string) => `/admin/exams/${examId}/results/init`,
    examResultUpdate: (id: number | string) => `/admin/exam-results/${id}/update`,
    examResultPublish: (id: number | string) => `/admin/exam-results/${id}/publish`,
    examResultArchive: (id: number | string) => `/admin/exam-results/${id}/archive`,

    gradebooks: '/admin/assessment/gradebooks',
    gradebook: (id: number | string) => `/admin/assessment/gradebooks/${id}`,
    gradebookBuildRoster: (id: number | string) =>
      `/admin/assessment/gradebooks/${id}/build-roster`,
    gradebookSyncRoster: (id: number | string) =>
      `/admin/assessment/gradebooks/${id}/sync-roster`,
    gradebookOpen: (id: number | string) => `/admin/assessment/gradebooks/${id}/open`,
    gradebookSubmit: (id: number | string) => `/admin/assessment/gradebooks/${id}/submit`,
    gradebookValidate: (id: number | string) => `/admin/assessment/gradebooks/${id}/validate`,
    gradebookPublish: (id: number | string) => `/admin/assessment/gradebooks/${id}/publish`,
    gradebookLock: (id: number | string) => `/admin/assessment/gradebooks/${id}/lock`,
    gradebookEntries: (id: number | string) => `/admin/assessment/gradebooks/${id}/entries`,
    gradebookResults: (id: number | string) => `/admin/assessment/gradebooks/${id}/results`,
    classMultiSubjectResults: (classId: number | string) =>
      `/admin/assessment/classes/${classId}/results`,
    studentMultiSubjectResults: (studentId: number | string) =>
      `/admin/assessment/students/${studentId}/results`,

    diagnosticAssessments: '/admin/assessment/diagnostic',
    diagnosticAssessment: (id: number | string) => `/admin/assessment/diagnostic/${id}`,
    diagnosticAssessmentBuildRoster: (id: number | string) =>
      `/admin/assessment/diagnostic/${id}/build-roster`,
    diagnosticAssessmentSyncRoster: (id: number | string) =>
      `/admin/assessment/diagnostic/${id}/sync-roster`,
    diagnosticAssessmentLines: (id: number | string) =>
      `/admin/assessment/diagnostic/${id}/lines`,
    diagnosticAssessmentConfirm: (id: number | string) =>
      `/admin/assessment/diagnostic/${id}/confirm`,
    diagnosticAssessmentResetToDraft: (id: number | string) =>
      `/admin/assessment/diagnostic/${id}/reset-to-draft`,
    diagnosticAssessmentSummary: (id: number | string) =>
      `/admin/assessment/diagnostic/${id}/summary`,
    diagnosticAssessmentPrint: (id: number | string) =>
      `/admin/assessment/diagnostic/${id}/print`,
    diagnosticAssessmentClassSummary: (classId: number | string) =>
      `/admin/assessment/diagnostic/classes/${classId}/summary`,
    diagnosticAssessmentStudentSummary: (studentId: number | string) =>
      `/admin/assessment/diagnostic/students/${studentId}/summary`,
    diagnosticAssessmentScoreScale: '/admin/assessment/diagnostic/score-scale',

    channels: '/admin/channels',
    channel: (id: number | string) => `/admin/channels/${id}`,
    channelArchive: (id: number | string) => `/admin/channels/${id}/archive`,
    channelRestore: (id: number | string) => `/admin/channels/${id}/restore`,
    /** Odoo 255 — undeliverable guardians drill-down (GET only; on-demand). */
    channelUndeliverableGuardians: (id: number | string) =>
      `/admin/channels/${id}/undeliverable-guardians`,
    channelMessages: (id: number | string) => `/admin/channels/${id}/messages`,
    channelPendingMessages: (id: number | string) => `/admin/channels/${id}/pending-messages`,
    /** Backend 228 — admin author resubmit (changes_requested only). */
    channelPendingMessageResubmit: (
      channelId: number | string,
      contentId: number | string,
    ) => `/admin/channels/${channelId}/pending-messages/${contentId}/resubmit`,
    channelRecipientCandidates: '/admin/channels/recipient-candidates',
    /** B4 — advisory recipient preview before admin channel send. */
    channelMessageRecipientPreview: (id: number | string) =>
      `/admin/channels/${id}/messages/recipient-preview`,

    communicationContent: '/admin/communication/content',
    communicationContentDetail: (id: number | string) => `/admin/communication/content/${id}`,
    /** Odoo 259 — authoritative submit after draft create/PATCH. */
    communicationContentSubmit: (id: number | string) =>
      `/admin/communication/content/${id}/submit`,
    communicationContentApprove: (id: number | string) =>
      `/admin/communication/content/${id}/approve`,
    communicationContentRequestChanges: (id: number | string) =>
      `/admin/communication/content/${id}/request-changes`,
    communicationContentPublish: (id: number | string) =>
      `/admin/communication/content/${id}/publish`,
    communicationContentSchedule: (id: number | string) =>
      `/admin/communication/content/${id}/schedule`,
    communicationContentCancel: (id: number | string) =>
      `/admin/communication/content/${id}/cancel`,
    communicationContentAudit: (id: number | string) =>
      `/admin/communication/content/${id}/audit`,
    /** B4 — advisory recipient preview for admin communication content. */
    communicationContentRecipientPreview: (id: number | string) =>
      `/admin/communication/content/${id}/recipient-preview`,
    /**
     * Odoo 258+ — generic advisory recipient preview (canonical recipient_scope).
     * Prefer this for general/admin compose before draft exists.
     */
    communicationRecipientPreview: '/admin/communication/recipient-preview',
    /** Odoo 256 compatibility — individual domain-entity messaging. */
    communicationIndividual: '/admin/communication/individual',
    /**
     * Odoo individual deliverability preview — READ ONLY.
     * Does not create content/snapshot/message; payload is recipient_type + recipient_id only.
     */
    communicationIndividualPreview: '/admin/communication/individual/preview',
    communicationApprovals: '/admin/communication/approvals',

    financeFeeTypes: '/admin/finance/fee-types',
    financeFeeType: (id: number | string) => `/admin/finance/fee-types/${id}`,
    financeFeeTypeArchive: (id: number | string) => `/admin/finance/fee-types/${id}/archive`,
    financeFeeTypeRestore: (id: number | string) => `/admin/finance/fee-types/${id}/restore`,
    financeFeePlans: '/admin/finance/fee-plans',
    financeFeePlanSuggest: '/admin/finance/fee-plans/suggest',
    financeEnrollmentPlanPreview: '/admin/finance/enrollment/plan-preview',
    financeFeePlan: (id: number | string) => `/admin/finance/fee-plans/${id}`,
    financeFeePlanConfirm: (id: number | string) => `/admin/finance/fee-plans/${id}/confirm`,
    financeFeePlanArchive: (id: number | string) => `/admin/finance/fee-plans/${id}/archive`,
    financeFeePlanResetToDraft: (id: number | string) => `/admin/finance/fee-plans/${id}/reset-to-draft`,
    financeFeePlanDuplicate: (id: number | string) => `/admin/finance/fee-plans/${id}/duplicate`,
    financeFeePlanRestore: (id: number | string) => `/admin/finance/fee-plans/${id}/restore`,
    financeFeePlanEligibleStudents: (id: number | string) =>
      `/admin/finance/fee-plans/${id}/eligible-students`,
    financeStudentFees: (id: number | string) => `/admin/finance/student-fees/${id}`,
    financeStudentFinancialOverview: (studentId: number | string) =>
      `/admin/finance/students/${studentId}/financial-overview`,
    financeStudentCollectibleItems: (studentId: number | string) =>
      `/admin/finance/students/${studentId}/collectible-items`,
    studentFinanceAgreementCreateFromCurrentFees: (studentId: number | string) =>
      `/admin/students/${studentId}/finance/agreements/create-from-current-fees`,
    financeFeePlanAssignedStudentsFinancialSummary: (planId: number | string) =>
      `/admin/finance/fee-plans/${planId}/assigned-students-financial-summary`,
    financeStudentFeesForStudent: (studentId: number | string) =>
      `/admin/finance/students/${studentId}/fees`,
    financeAssignStudentFee: (studentId: number | string) =>
      `/admin/finance/students/${studentId}/assign-fee-plan`,
    financeBillingProfile: (studentId: number | string) =>
      `/admin/finance/students/${studentId}/billing-profile`,
    financeStudentBillingAuthorityChangePreview: (studentId: number | string) =>
      `/admin/finance/students/${studentId}/billing-authority/change/preview`,
    financeStudentBillingAuthorityChange: (studentId: number | string) =>
      `/admin/finance/students/${studentId}/billing-authority/change`,
    financeStudentChangePlanPreview: (studentId: number | string) =>
      `/admin/students/${studentId}/finance/change-plan/preview`,
    financeStudentChangePlanApply: (studentId: number | string) =>
      `/admin/students/${studentId}/finance/change-plan/apply`,
    studentFinancePlanPreview: (studentId: number | string) =>
      `/admin/students/${studentId}/finance/plan-preview`,
    studentFinanceAssignPlan: (studentId: number | string) =>
      `/admin/students/${studentId}/finance/assign-plan`,
    studentFinanceResetAgreement: (studentId: number | string) =>
      `/admin/students/${studentId}/finance/reset-financial-agreement`,
    studentFinanceAgreementAmendmentPreview: (studentId: number | string) =>
      `/admin/students/${studentId}/finance/agreement-amendments/preview`,
    studentFinanceAgreementAmendmentApply: (studentId: number | string) =>
      `/admin/students/${studentId}/finance/agreement-amendments/apply`,
    studentFinanceAgreementAmendmentEffectivePeriods: (studentId: number | string) =>
      `/admin/students/${studentId}/finance/agreement-amendments/effective-periods`,
    studentFinanceRepairDiagnostics: (studentId: number | string) =>
      `/admin/students/${studentId}/finance/repair-diagnostics`,
    studentFinanceRepairActionPreview: (studentId: number | string, actionCode: string) =>
      `/admin/students/${studentId}/finance/repair-actions/${actionCode}/preview`,
    studentFinanceRepairActionApply: (studentId: number | string, actionCode: string) =>
      `/admin/students/${studentId}/finance/repair-actions/${actionCode}/apply`,
    financePaymentCollections: '/admin/finance/payment-collections',
    financePaymentCollectionPreview: '/admin/finance/payment-collections/preview',
    financePaymentCollection: (id: number | string) => `/admin/finance/payment-collections/${id}`,
    financePaymentCollectionConfirm: (id: number | string) =>
      `/admin/finance/payment-collections/${id}/confirm`,
    financePaymentCollectionCancel: (id: number | string) =>
      `/admin/finance/payment-collections/${id}/cancel`,
    financePaymentCollectionDiscard: (id: number | string) =>
      `/admin/finance/payment-collections/${id}/discard`,
    financePaymentCollectionReceipt: (id: number | string) =>
      `/admin/finance/payment-collections/${id}/receipt`,
    financePaymentCollectionIssueReceipt: (id: number | string) =>
      `/admin/finance/payment-collections/${id}/issue-receipt`,
    /** ODOO_FINANCE_COLLECTION_REPORTS_CONTRACT_1A */
    financeCollectionReports: '/admin/finance/reports/collections',
    financeCollectionReportsAggregations: '/admin/finance/reports/collections/aggregations',
    financeReceipts: '/admin/finance/receipts',
    financeReceipt: (id: number | string) => `/admin/finance/receipts/${id}`,
    financeReceiptPdf: (id: number | string) => `/admin/finance/receipts/${id}/pdf`,
    financeOverview: '/admin/finance/overview',
    financeInstallments: '/admin/finance/installments',
    financePaymentJournals: '/admin/finance/payment-journals',
    financeAcademicYears: '/admin/finance/academic-years',
    financeReferenceData: '/admin/finance/reference-data',
    financeStudentsSearch: '/admin/finance/students/search',
    financeBillingAccounts: '/admin/finance/billing-accounts',
    financeBillingAccountsDataQuality: '/admin/finance/billing-accounts/data-quality',
    financeBillingAccountSummary: (billingPartnerId: number | string) =>
      `/admin/finance/billing-accounts/${billingPartnerId}/summary`,
    financeBillingAccountMembers: (billingPartnerId: number | string) =>
      `/admin/finance/billing-accounts/${billingPartnerId}/members`,
    financeBillingAccountMemberTransferInPreview: (
      billingPartnerId: number | string,
      studentId: number | string,
    ) =>
      `/admin/finance/billing-accounts/${billingPartnerId}/members/${studentId}/transfer-in/preview`,
    financeBillingAccountMemberTransferIn: (
      billingPartnerId: number | string,
      studentId: number | string,
    ) => `/admin/finance/billing-accounts/${billingPartnerId}/members/${studentId}/transfer-in`,
    financeBillingAccountMemberEnd: (
      billingPartnerId: number | string,
      studentId: number | string,
    ) => `/admin/finance/billing-accounts/${billingPartnerId}/members/${studentId}/end`,
    financeCreditBalances: '/admin/finance/credit-balances',
    financeBillingAccountCreditBalance: (billingPartnerId: number | string) =>
      `/admin/finance/billing-accounts/${billingPartnerId}/credit-balance`,
    financePaymentCollectionCredit: (collectionId: number | string) =>
      `/admin/finance/payment-collections/${collectionId}/credit`,
    financePaymentCollectionAllocate: (collectionId: number | string) =>
      `/admin/finance/payment-collections/${collectionId}/allocate`,
    financeAgreements: '/admin/finance/agreements',
    financeAgreementAdjustments: (id: number | string) =>
      `/admin/finance/agreements/${id}/adjustments`,
    financeAgreementAdjustment: (agreementId: number | string, adjustmentId: number | string) =>
      `/admin/finance/agreements/${agreementId}/adjustments/${adjustmentId}`,
    financeEligibleBillingPartners: (studentId: number | string) =>
      `/admin/finance/students/${studentId}/eligible-billing-partners`,
    financeStudentFamilySummary: (studentId: number | string) =>
      `/admin/finance/students/${studentId}/family-summary`,
    financeFamilySummary: (familyId: number | string) =>
      `/admin/finance/families/${familyId}/summary`,
    financeStudentFamilyPlanContext: (studentId: number | string) =>
      `/admin/finance/students/${studentId}/family-plan-context`,
    financeStudentFamilyCollectionContext: (studentId: number | string) =>
      `/admin/finance/students/${studentId}/family-collection-context`,
    financeFamilyCollectionContext: (familyId: number | string) =>
      `/admin/finance/families/${familyId}/collection-context`,
    financeFamilyCollectionPreview: '/admin/finance/family-collections/preview',
    financeFamilyCollections: '/admin/finance/family-collections',
    financeFamilyCollection: (id: number | string) => `/admin/finance/family-collections/${id}`,
    financeArrearsFollowups: '/admin/finance/arrears-followups',
    financeFamilyArrearsFollowup: (familyId: number | string) =>
      `/admin/finance/families/${familyId}/arrears-followup`,
    financeCheques: '/admin/finance/cheques',
    financeCheque: (id: number | string) => `/admin/finance/cheques/${id}`,
    financeChequeDeposit: (id: number | string) => `/admin/finance/cheques/${id}/deposit`,
    financeChequeSettle: (id: number | string) => `/admin/finance/cheques/${id}/settle`,
    financeChequeClear: (id: number | string) => `/admin/finance/cheques/${id}/clear`,
    financeChequeReject: (id: number | string) => `/admin/finance/cheques/${id}/reject`,
    financeChequeCancel: (id: number | string) => `/admin/finance/cheques/${id}/cancel`,
    financeCashSessions: '/admin/finance/cash-sessions',
    financeCashSessionCurrent: '/admin/finance/cash-sessions/current',
    financeCashSessionLegacyDryRun: '/admin/finance/cash-sessions/legacy-dry-run',
    financeCashSession: (id: number | string) => `/admin/finance/cash-sessions/${id}`,
    financeCashSessionOpen: '/admin/finance/cash-sessions/open',
    financeCashSessionStartClosing: (id: number | string) =>
      `/admin/finance/cash-sessions/${id}/start-closing`,
    financeCashSessionClose: (id: number | string) => `/admin/finance/cash-sessions/${id}/close`,
    financeCashSessionReopen: (id: number | string) => `/admin/finance/cash-sessions/${id}/reopen`,
    financeCashSessionMovements: (id: number | string) =>
      `/admin/finance/cash-sessions/${id}/movements`,
    financeCashSessionClosurePdf: (id: number | string) =>
      `/admin/finance/cash-sessions/${id}/closure-pdf`,

    admissions: '/admin/admissions',
    admissionsDashboard: '/admin/admissions/dashboard',
    admissionsRequestedServices: '/admin/admissions/requested-services',
    admissionsOptions: '/admin/admissions/options',
    admission: (id: number | string) => `/admin/admissions/${id}`,
    admissionActions: (id: number | string) => `/admin/admissions/${id}/actions`,
    admissionsBulkActions: '/admin/admissions/actions/bulk',
    admissionPrefill: (id: number | string) => `/admin/admissions/${id}/prefill`,
    admissionLinkStudent: (id: number | string) => `/admin/admissions/${id}/link-student`,
    admissionActivities: (id: number | string) => `/admin/admissions/${id}/activities`,
    admissionAppointments: (id: number | string) => `/admin/admissions/${id}/appointments`,
    admissionAssessments: (id: number | string) => `/admin/admissions/${id}/assessments`,
    admissionDecision: (id: number | string) => `/admin/admissions/${id}/decision`,
    admissionReopen: (id: number | string) => `/admin/admissions/${id}/reopen`,
    admissionOffers: (id: number | string) => `/admin/admissions/${id}/offers`,
    admissionOfferSend: (id: number | string, offerId: number | string) =>
      `/admin/admissions/${id}/offers/${offerId}/send`,
    admissionOfferAccept: (id: number | string, offerId: number | string) =>
      `/admin/admissions/${id}/offers/${offerId}/accept`,
    admissionOfferDecline: (id: number | string, offerId: number | string) =>
      `/admin/admissions/${id}/offers/${offerId}/decline`,
    admissionFamilyBatches: '/admin/admissions/family-batches',
    admissionFamilyBatch: (batchId: number | string) =>
      `/admin/admissions/family-batches/${batchId}`,
    admissionFamilyBatchGuardians: (batchId: number | string) =>
      `/admin/admissions/family-batches/${batchId}/guardians`,
    /** Selective convert applications → students (Odoo 18.0.1.0.242+). */
    admissionFamilyBatchConvertToStudents: (batchId: number | string) =>
      `/admin/admissions/family-batches/${batchId}/convert-to-students`,
  },


  teacher: {
    dashboard: '/teacher/dashboard',
    /** Assignment-scoped academic filter options — GET only. */
    academicContextOptions: '/teacher/academic-context/options',
    classes: '/teacher/classes',
    classStudents: (classId: number | string) => `/teacher/classes/${classId}/students`,
    classSubjects: (classId: number | string) => `/teacher/classes/${classId}/subjects`,
    classHomeworks: (classId: number | string) => `/teacher/classes/${classId}/homeworks`,
    classHomeworkCreate: (classId: number | string) => `/teacher/classes/${classId}/homeworks`,
    classResources: (classId: number | string) => `/teacher/classes/${classId}/resources`,
    classResourceCreate: (classId: number | string) => `/teacher/classes/${classId}/resources`,
    classExams: (classId: number | string) => `/teacher/classes/${classId}/exams`,
    classExamCreate: (classId: number | string) => `/teacher/classes/${classId}/exams`,
    attendanceToday: (classId: number | string) =>
      `/teacher/classes/${classId}/attendance/today`,
    attendanceBatch: (classId: number | string) =>
      `/teacher/classes/${classId}/attendance/batch`,
    homework: (id: number | string) => `/teacher/homeworks/${id}`,
    homeworkAttachments: (id: number | string) => `/teacher/homeworks/${id}/attachments`,
    attachmentDelete: (id: number | string) => `/teacher/attachments/${id}`,
    attachmentReplace: (id: number | string) => `/teacher/attachments/${id}/replace`,
    examAttachments: (id: number | string) => `/teacher/exams/${id}/attachments`,
    homeworkPublish: (id: number | string) => `/teacher/homeworks/${id}/publish`,
    homeworkClose: (id: number | string) => `/teacher/homeworks/${id}/close`,
    homeworkSubmissions: (id: number | string) => `/teacher/homeworks/${id}/submissions`,
    resource: (id: number | string) => `/teacher/resources/${id}`,
    resourceAttachments: (id: number | string) => `/teacher/resources/${id}/attachments`,
    resourcePublish: (id: number | string) => `/teacher/resources/${id}/publish`,
    exam: (id: number | string) => `/teacher/exams/${id}`,
    examResults: (examId: number | string) => `/teacher/exams/${examId}/results`,
    examResultsInit: (examId: number | string) => `/teacher/exams/${examId}/results/init`,
    examResultUpdate: (id: number | string) => `/teacher/exam-results/${id}/update`,
    gradebooks: '/teacher/assessment/gradebooks',
    gradebook: (id: number | string) => `/teacher/assessment/gradebooks/${id}`,
    gradebookEntries: (id: number | string) => `/teacher/assessment/gradebooks/${id}/entries`,
    gradebookResults: (id: number | string) => `/teacher/assessment/gradebooks/${id}/results`,
    gradebookSubmit: (id: number | string) => `/teacher/assessment/gradebooks/${id}/submit`,
    diagnosticAssessments: '/teacher/assessment/diagnostic',
    diagnosticAssessment: (id: number | string) => `/teacher/assessment/diagnostic/${id}`,
    diagnosticAssessmentLines: (id: number | string) =>
      `/teacher/assessment/diagnostic/${id}/lines`,
    diagnosticAssessmentConfirm: (id: number | string) =>
      `/teacher/assessment/diagnostic/${id}/confirm`,
    diagnosticAssessmentSummary: (id: number | string) =>
      `/teacher/assessment/diagnostic/${id}/summary`,
    diagnosticAssessmentPrint: (id: number | string) =>
      `/teacher/assessment/diagnostic/${id}/print`,
    diagnosticAssessmentScoreScale: '/teacher/assessment/diagnostic/score-scale',
    timetable: '/teacher/timetable',
    timetableToday: '/teacher/timetable/today',
    timetableWeek: '/teacher/timetable/week',
    annualDistributions: '/teacher/annual-distributions',
    annualDistribution: (id: number | string) => `/teacher/annual-distributions/${id}`,
    annualDistributionTimeline: (id: number | string) =>
      `/teacher/annual-distributions/${id}/timeline`,
    didacticSequences: '/teacher/didactic-sequences',
    didacticSequence: (id: number | string) => `/teacher/didactic-sequences/${id}`,
    sessionOccurrences: '/teacher/session-occurrences',
    sessionOccurrence: (id: number | string) => `/teacher/session-occurrences/${id}`,
    sessionOccurrenceJathathaContext: (id: number | string) =>
      `/teacher/session-occurrences/${id}/jathatha-context`,
    sessionOccurrenceDeliveryContext: (id: number | string) =>
      `/teacher/session-occurrences/${id}/delivery-context`,
    jathathas: '/teacher/jathathas',
    jathatha: (id: number | string) => `/teacher/jathathas/${id}`,
    jathathaMarkReady: (id: number | string) => `/teacher/jathathas/${id}/mark-ready`,
    jathathaResetToDraft: (id: number | string) => `/teacher/jathathas/${id}/reset-to-draft`,
    jathathaConfirm: (id: number | string) => `/teacher/jathathas/${id}/confirm`,
    jathathaCreateCorrection: (id: number | string) =>
      `/teacher/jathathas/${id}/create-correction`,
    jathathaVoid: (id: number | string) => `/teacher/jathathas/${id}/void`,
    actualDeliveries: '/teacher/actual-deliveries',
    actualDelivery: (id: number | string) => `/teacher/actual-deliveries/${id}`,
    actualDeliveryConfirm: (id: number | string) =>
      `/teacher/actual-deliveries/${id}/confirm`,
    actualDeliveryCreateCorrection: (id: number | string) =>
      `/teacher/actual-deliveries/${id}/create-correction`,
    actualDeliveryVoid: (id: number | string) => `/teacher/actual-deliveries/${id}/void`,
    classJournal: '/teacher/class-journal',
    classJournalEntry: (id: number | string) => `/teacher/class-journal/${id}`,
    teachingProgress: '/teacher/teaching-progress',
    teachingProgressLine: (id: number | string) => `/teacher/teaching-progress/${id}`,
    teachingProgressSummary: '/teacher/teaching-progress-summary',
    /** V3 curriculum remaining (Distribution − Progress). Not interim remaining.item. */
    teachingRemaining: '/teacher/teaching/remaining',
    teachingSuggestedNextItem: '/teacher/teaching/suggested-next-item',
    teachingExecutionDecisions: '/teacher/teaching/execution-decisions',
    teachingExecutionDecision: '/teacher/teaching/decision',
    /** Odoo 221 Assessment Support / Mastery / Remediation. */
    teachingLearningObjectives: '/teacher/teaching/learning-objectives',
    teachingLearningObjective: (id: number | string) =>
      `/teacher/teaching/learning-objectives/${id}`,
    teachingMasteryScale: '/teacher/teaching/mastery-scale',
    teachingMasteryMatrix: '/teacher/teaching/mastery-matrix',
    teachingMasteryMatrixBatch: '/teacher/teaching/mastery-matrix/batch',
    teachingMasteryObservationConfirm: (id: number | string) =>
      `/teacher/teaching/mastery-observations/${id}/confirm`,
    teachingMasteryObservationCorrect: (id: number | string) =>
      `/teacher/teaching/mastery-observations/${id}/correct`,
    teachingDifficulties: '/teacher/teaching/difficulties',
    teachingDifficultyAction: (id: number | string, action: string) =>
      `/teacher/teaching/difficulties/${id}/${action}`,
    teachingSupportDecisions: '/teacher/teaching/support-decisions',
    teachingSupportDecisionAction: (id: number | string, action: string) =>
      `/teacher/teaching/support-decisions/${id}/${action}`,
    teachingSupportGroups: '/teacher/teaching/support-groups',
    teachingSupportGroup: (id: number | string) => `/teacher/teaching/support-groups/${id}`,
    teachingSupportGroupAction: (id: number | string, action: string) =>
      `/teacher/teaching/support-groups/${id}/${action}`,
    teachingSupportPlans: '/teacher/teaching/support-plans',
    teachingSupportPlanAction: (id: number | string, action: string) =>
      `/teacher/teaching/support-plans/${id}/${action}`,
    teachingReassessments: '/teacher/teaching/reassessments',
    teachingReassessmentAction: (id: number | string, action: string) =>
      `/teacher/teaching/reassessments/${id}/${action}`,

    /** Odoo 224 Teaching Stage 9 — teacher review status / print / closure (read-focused). */
    teachingDocumentReviewStatus: (documentType: string, documentId: number | string) =>
      `/teacher/teaching/documents/${documentType}/${documentId}/review-status`,
    teachingDocumentPublications: (documentType: string, documentId: number | string) =>
      `/teacher/teaching/documents/${documentType}/${documentId}/publications`,
    teachingDocumentDraftPrint: (documentType: string, documentId: number | string) =>
      `/teacher/teaching/documents/${documentType}/${documentId}/print/draft`,
    teachingPublications: '/teacher/teaching/publications',
    teachingPublicationDownload: (publicationId: number | string) =>
      `/teacher/teaching/publications/${publicationId}/download`,
    teachingClosureStatus: '/teacher/teaching/closure-status',
    homeworkCreateCorrection: (homeworkId: number | string) =>
      `/teacher/homeworks/${homeworkId}/create-correction`,
  },

  attachments: {
    download: (id: number | string) => `/attachments/${id}/download`,
    preview: (id: number | string) => `/attachments/${id}/preview`,
    thumbnail: (id: number | string) => `/attachments/${id}/thumbnail`,
  },

  parent: {
    dashboard: '/parent/dashboard',
    children: '/parent/children',
    child: (studentId: number | string) => `/parent/children/${studentId}`,
    childAttendance: (studentId: number | string) =>
      `/parent/children/${studentId}/attendance`,
    childStudentView: (studentId: number | string) =>
      `/parent/children/${studentId}/student-view`,
    childChannels: (studentId: number | string) =>
      `/parent/children/${studentId}/channels`,
    childAnnouncements: (studentId: number | string) =>
      `/parent/children/${studentId}/announcements`,
    childHomeworks: (studentId: number | string) =>
      `/parent/children/${studentId}/homeworks`,
    childHomework: (studentId: number | string, homeworkId: number | string) =>
      `/parent/children/${studentId}/homeworks/${homeworkId}`,
    childHomeworkRead: (studentId: number | string, homeworkId: number | string) =>
      `/parent/children/${studentId}/homeworks/${homeworkId}/read`,
    childHomeworkSubmit: (studentId: number | string, homeworkId: number | string) =>
      `/parent/children/${studentId}/homeworks/${homeworkId}/submit`,
    childResources: (studentId: number | string) =>
      `/parent/children/${studentId}/resources`,
    childResource: (studentId: number | string, resourceId: number | string) =>
      `/parent/children/${studentId}/resources/${resourceId}`,
    childResourceRead: (studentId: number | string, resourceId: number | string) =>
      `/parent/children/${studentId}/resources/${resourceId}/read`,
    childExams: (studentId: number | string) => `/parent/children/${studentId}/exams`,
    childExamsUpcoming: (studentId: number | string) =>
      `/parent/children/${studentId}/exams/upcoming`,
    childExam: (studentId: number | string, examId: number | string) =>
      `/parent/children/${studentId}/exams/${examId}`,
    childExamResults: (studentId: number | string) =>
      `/parent/children/${studentId}/exam-results`,
    childExamResult: (studentId: number | string, resultId: number | string) =>
      `/parent/children/${studentId}/exam-results/${resultId}`,
    childTimetable: (studentId: number | string) =>
      `/parent/children/${studentId}/timetable`,
    childTimetableToday: (studentId: number | string) =>
      `/parent/children/${studentId}/timetable/today`,
    childTimetableWeek: (studentId: number | string) =>
      `/parent/children/${studentId}/timetable/week`,
    finance: '/parent/finance',
    childFinance: (studentId: number | string) => `/parent/children/${studentId}/finance`,
    childFinanceFee: (studentId: number | string, feeId: number | string) =>
      `/parent/children/${studentId}/finance/fees/${feeId}`,
    childFinanceCollections: (studentId: number | string) =>
      `/parent/children/${studentId}/finance/collections`,
    childFinanceCollection: (studentId: number | string, collectionId: number | string) =>
      `/parent/children/${studentId}/finance/collections/${collectionId}`,
  },

  student: {
    dashboard: '/student/dashboard',
    profile: '/student/profile',
    attendance: '/student/attendance',
    homeworks: '/student/homeworks',
    homework: (id: number | string) => `/student/homeworks/${id}`,
    homeworkRead: (id: number | string) => `/student/homeworks/${id}/read`,
    homeworkSubmit: (id: number | string) => `/student/homeworks/${id}/submit`,
    resources: '/student/resources',
    resource: (id: number | string) => `/student/resources/${id}`,
    resourceRead: (id: number | string) => `/student/resources/${id}/read`,
    exams: '/student/exams',
    examsUpcoming: '/student/exams/upcoming',
    exam: (id: number | string) => `/student/exams/${id}`,
    examResults: '/student/exam-results',
    examResult: (id: number | string) => `/student/exam-results/${id}`,
    timetable: '/student/timetable',
    timetableToday: '/student/timetable/today',
    timetableWeek: '/student/timetable/week',
  },

  channels: {
    list: '/channels',
    detail: (channelId: number | string) => `/channels/${channelId}`,
    messages: (channelId: number | string) => `/channels/${channelId}/messages`,
    /** B4 — advisory recipient preview before portal/staff channel send. */
    messageRecipientPreview: (channelId: number | string) =>
      `/channels/${channelId}/messages/recipient-preview`,
    myPendingMessages: (channelId: number | string) =>
      `/channels/${channelId}/my-pending-messages`,
    pendingMessageResubmit: (channelId: number | string, contentId: number | string) =>
      `/channels/${channelId}/pending-messages/${contentId}/resubmit`,
  },

  /**
   * Governed announcement recipient APIs (Odoo 5D2B).
   * Shared across parent/student/teacher/admin active roles.
   * Optional `student_id` query is parent-child filter only (Backend-validated).
   */
  communication: {
    announcements: '/communication/announcements',
    announcement: (messageId: number | string) =>
      `/communication/announcements/${messageId}`,
    announcementRead: (messageId: number | string) =>
      `/communication/announcements/${messageId}/read`,
    announcementAttachmentDownload: (
      messageId: number | string,
      attachmentId: number | string,
    ) => `/communication/announcements/${messageId}/attachments/${attachmentId}/download`,
  },

  /**
   * Staff portal communication (teacher/staff role via /staff/… Backend paths).
   * B4 content recipient preview — not the admin /admin/staff HR family.
   */
  staff: {
    communicationContentRecipientPreview: (contentId: number | string) =>
      `/staff/communication/content/${contentId}/recipient-preview`,
  },
} as const;
