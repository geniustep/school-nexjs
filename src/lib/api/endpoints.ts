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
  },

  public: {
    schoolBranding: '/public/school-branding',
    schoolBrandingLogo: '/public/school-branding/logo',
  },

  admin: {
    dashboard: '/admin/dashboard',
    executiveDashboard: '/admin/dashboard/executive',
    schoolBranding: '/admin/school-branding',

    students: '/admin/students',
    studentsOptions: '/admin/students/options',
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
    financeServiceTariffs: '/admin/finance/service-tariffs',
    guardiansSearch: '/admin/guardians/search',
    guardiansLinkPartner: '/admin/guardians/link-partner',
    guardiansQuickCreate: '/admin/guardians/quick-create',
    studentsImport: '/admin/students/import',
    studentImportValidate: '/admin/students/import/validate',
    studentImportExecute: (jobId: number | string) => `/admin/students/import/${jobId}/execute`,
    studentImportJob: (jobId: number | string) => `/admin/students/import/${jobId}`,
    studentsExport: '/admin/students/export',

    parents: '/admin/parents',
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
    subject: (id: number | string) => `/admin/subjects/${id}`,
    subjectUpdate: (id: number | string) => `/admin/subjects/${id}/update`,
    subjectArchive: (id: number | string) => `/admin/subjects/${id}/archive`,
    subjectsImport: '/admin/subjects/import',
    subjectsExport: '/admin/subjects/export',

    setupReadiness: '/admin/setup/readiness',
    setupAcademicInitialize: '/admin/setup/academic/initialize',

    teachingAssignments: '/admin/teaching-assignments',
    teachingAssignment: (id: number | string) => `/admin/teaching-assignments/${id}`,
    teachingAssignmentUpdate: (id: number | string) =>
      `/admin/teaching-assignments/${id}/update`,
    teachingAssignmentSuggestions: '/admin/teaching-assignments/suggestions',

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

    channels: '/admin/channels',
    channel: (id: number | string) => `/admin/channels/${id}`,
    channelMessages: (id: number | string) => `/admin/channels/${id}/messages`,

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
    admissionsOptions: '/admin/admissions/options',
    admission: (id: number | string) => `/admin/admissions/${id}`,
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
  },

  teacher: {
    dashboard: '/teacher/dashboard',
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
    timetable: '/teacher/timetable',
    timetableToday: '/teacher/timetable/today',
    timetableWeek: '/teacher/timetable/week',
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
  },
} as const;
