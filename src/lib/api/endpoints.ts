// Central endpoint registry — the ONLY place API v1 paths are defined.
// Every path here is taken verbatim from API_REPORT.md §3. Do not invent,
// rename, or assume endpoints elsewhere in the codebase.
//
// Paths are relative to the API v1 prefix (/api/v1). The BFF proxy and the
// browser client both build on top of these.

export const endpoints = {
  auth: {
    // Note: real login uses Odoo's /web/session/authenticate first (handled
    // by the BFF login route). These are the documented API v1 auth paths.
    login: '/auth/login',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
    me: '/me',
  },

  admin: {
    dashboard: '/admin/dashboard',
    students: '/admin/students',
    // Students are the ONLY admin resource with a documented detail endpoint
    // (API_REPORT.md §3). Parents/teachers/classes expose list endpoints only,
    // so their detail views are derived from the (rich) list payloads.
    student: (id: number | string) => `/admin/students/${id}`,
    parents: '/admin/parents',
    teachers: '/admin/teachers',
    levels: '/admin/levels',
    classes: '/admin/classes',
    subjects: '/admin/subjects',
    attendance: '/admin/attendance',
    // Admin-only past-date attendance correction (within admin scope).
    attendanceCorrect: '/admin/attendance/correct',
    importStudents: '/admin/import/students',
  },

  teacher: {
    dashboard: '/teacher/dashboard',
    classes: '/teacher/classes',
    classStudents: (classId: number | string) => `/teacher/classes/${classId}/students`,
    classHomeworks: (classId: number | string) => `/teacher/classes/${classId}/homeworks`,
    classResources: (classId: number | string) => `/teacher/classes/${classId}/resources`,
    classExams: (classId: number | string) => `/teacher/classes/${classId}/exams`,
    attendanceToday: (classId: number | string) =>
      `/teacher/classes/${classId}/attendance/today`,
    attendanceBatch: (classId: number | string) =>
      `/teacher/classes/${classId}/attendance/batch`,
    homework: (id: number | string) => `/teacher/homeworks/${id}`,
    homeworkPublish: (id: number | string) => `/teacher/homeworks/${id}/publish`,
    homeworkClose: (id: number | string) => `/teacher/homeworks/${id}/close`,
    homeworkSubmissions: (id: number | string) => `/teacher/homeworks/${id}/submissions`,
    resource: (id: number | string) => `/teacher/resources/${id}`,
    exam: (id: number | string) => `/teacher/exams/${id}`,
    examResults: (examId: number | string) => `/teacher/exams/${examId}/results`,
    examResultUpdate: (id: number | string) => `/teacher/exam-results/${id}/update`,
    timetable: '/teacher/timetable',
    timetableToday: '/teacher/timetable/today',
    timetableWeek: '/teacher/timetable/week',
  },

  attachments: {
    download: (id: number | string) => `/attachments/${id}/download`,
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
