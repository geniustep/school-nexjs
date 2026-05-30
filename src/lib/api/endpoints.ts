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
    attendanceToday: (classId: number | string) =>
      `/teacher/classes/${classId}/attendance/today`,
    attendanceBatch: (classId: number | string) =>
      `/teacher/classes/${classId}/attendance/batch`,
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
  },

  student: {
    dashboard: '/student/dashboard',
    profile: '/student/profile',
    attendance: '/student/attendance',
  },

  channels: {
    list: '/channels',
    detail: (channelId: number | string) => `/channels/${channelId}`,
    messages: (channelId: number | string) => `/channels/${channelId}/messages`,
  },
} as const;
