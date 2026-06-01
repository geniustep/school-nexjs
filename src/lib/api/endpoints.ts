// Central endpoint registry — the ONLY place API v1 paths are defined.
// Paths are relative to the API v1 prefix (/api/v1).

export const endpoints = {
  auth: {
    login: '/auth/login',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
    me: '/me',
  },

  admin: {
    dashboard: '/admin/dashboard',

    students: '/admin/students',
    student: (id: number | string) => `/admin/students/${id}`,
    studentUpdate: (id: number | string) => `/admin/students/${id}/update`,
    studentArchive: (id: number | string) => `/admin/students/${id}/archive`,
    studentsImport: '/admin/students/import',
    studentsExport: '/admin/students/export',

    parents: '/admin/parents',
    parent: (id: number | string) => `/admin/parents/${id}`,
    parentUpdate: (id: number | string) => `/admin/parents/${id}/update`,
    parentArchive: (id: number | string) => `/admin/parents/${id}/archive`,
    parentsImport: '/admin/parents/import',
    parentsExport: '/admin/parents/export',

    teachers: '/admin/teachers',
    teacher: (id: number | string) => `/admin/teachers/${id}`,
    teacherUpdate: (id: number | string) => `/admin/teachers/${id}/update`,
    teacherArchive: (id: number | string) => `/admin/teachers/${id}/archive`,
    teachersImport: '/admin/teachers/import',
    teachersExport: '/admin/teachers/export',

    classes: '/admin/classes',
    class: (id: number | string) => `/admin/classes/${id}`,
    classUpdate: (id: number | string) => `/admin/classes/${id}/update`,
    classArchive: (id: number | string) => `/admin/classes/${id}/archive`,
    classesImport: '/admin/classes/import',
    classesExport: '/admin/classes/export',

    levels: '/admin/levels',
    level: (id: number | string) => `/admin/levels/${id}`,
    levelUpdate: (id: number | string) => `/admin/levels/${id}/update`,
    levelArchive: (id: number | string) => `/admin/levels/${id}/archive`,
    levelsExport: '/admin/levels/export',

    subjects: '/admin/subjects',
    subject: (id: number | string) => `/admin/subjects/${id}`,
    subjectUpdate: (id: number | string) => `/admin/subjects/${id}/update`,
    subjectArchive: (id: number | string) => `/admin/subjects/${id}/archive`,
    subjectsImport: '/admin/subjects/import',
    subjectsExport: '/admin/subjects/export',

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
