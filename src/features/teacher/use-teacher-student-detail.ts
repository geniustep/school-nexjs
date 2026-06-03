'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api/client';
import { useResource } from '@/lib/hooks/use-resource';
import { endpoints } from '@/lib/api/endpoints';
import type { AttendanceStatus, AttendanceToday } from '@/types/attendance';
import type { ExamResult, ExamResultsListResponse, ExamSummary } from '@/types/exam';
import type { HomeworkSubmission, HomeworkSummary } from '@/types/homework';
import { getStudentDisplayName, type StudentNameFields } from '@/lib/utils/student';

export interface ClassStudentRow extends StudentNameFields {
  id: number;
  code?: string | null;
  status?: string;
}

export interface StudentTodayAttendance {
  status: AttendanceStatus;
  note?: string | null;
  recorded: boolean;
}

export interface StudentHomeworkSubmissionRow {
  homework: HomeworkSummary;
  submission: HomeworkSubmission;
}

const MAX_HOMEWORKS = 8;
const MAX_EXAMS = 6;

function findTodayAttendance(
  data: AttendanceToday | null,
  studentId: number,
): StudentTodayAttendance | null {
  if (!data) return null;
  const rec = data.recorded?.find((r) => r.student?.id === studentId);
  if (rec) {
    return { status: rec.status, note: rec.note, recorded: true };
  }
  const pending = data.not_recorded?.find((n) => n.id === studentId);
  if (pending) {
    return {
      status: pending.status ?? 'present',
      recorded: false,
    };
  }
  return null;
}

export function useTeacherStudentDetail(classId: number, studentId: number) {
  const classKey = String(classId);
  const studentsState = useResource<ClassStudentRow[]>(endpoints.teacher.classStudents(classKey));
  const attendanceState = useResource<AttendanceToday>(endpoints.teacher.attendanceToday(classId));

  const student = useMemo(
    () => studentsState.data?.find((s) => s.id === studentId) ?? null,
    [studentsState.data, studentId],
  );

  const todayAttendance = useMemo(
    () => findTodayAttendance(attendanceState.data, studentId),
    [attendanceState.data, studentId],
  );

  const [submissions, setSubmissions] = useState<StudentHomeworkSubmissionRow[]>([]);
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [extrasLoading, setExtrasLoading] = useState(false);

  useEffect(() => {
    if (!student) {
      setSubmissions([]);
      setExamResults([]);
      return;
    }
    let active = true;
    setExtrasLoading(true);

    async function loadExtras() {
      const [hwRes, examRes] = await Promise.all([
        api.get<HomeworkSummary[]>(endpoints.teacher.classHomeworks(classKey)),
        api.get<ExamSummary[]>(endpoints.teacher.classExams(classKey)),
      ]);

      const homeworks = (hwRes.success ? hwRes.data ?? [] : [])
        .filter((h) => h.require_submission !== false)
        .slice(0, MAX_HOMEWORKS);

      const exams = (examRes.success ? examRes.data ?? [] : []).slice(0, MAX_EXAMS);

      const [subGroups, resultGroups] = await Promise.all([
        Promise.all(
          homeworks.map(async (hw) => {
            const sub = await api.get<HomeworkSubmission[]>(
              endpoints.teacher.homeworkSubmissions(hw.id),
            );
            if (!sub.success) return [] as StudentHomeworkSubmissionRow[];
            return (sub.data ?? [])
              .filter((s) => s.student?.id === studentId)
              .map((submission) => ({ homework: hw, submission }));
          }),
        ),
        Promise.all(
          exams.map(async (exam) => {
            const res = await api.get<ExamResultsListResponse | ExamResult[]>(
              endpoints.teacher.examResults(exam.id),
            );
            if (!res.success || !res.data) return [] as ExamResult[];
            const rows = Array.isArray(res.data) ? res.data : (res.data.results ?? []);
            return rows.filter((r) => r.student?.id === studentId);
          }),
        ),
      ]);

      if (!active) return;
      setSubmissions(subGroups.flat());
      setExamResults(resultGroups.flat());
    }

    loadExtras()
      .catch(() => {
        if (active) {
          setSubmissions([]);
          setExamResults([]);
        }
      })
      .finally(() => {
        if (active) setExtrasLoading(false);
      });

    return () => {
      active = false;
    };
  }, [student, classKey, studentId]);

  const displayName = student ? getStudentDisplayName(student) : null;

  const loading =
    studentsState.loading ||
    attendanceState.loading ||
    (Boolean(student) && extrasLoading);

  return {
    student,
    displayName,
    todayAttendance,
    submissions,
    examResults,
    loading,
    notFound: !studentsState.loading && studentsState.data != null && !student,
    reload: () => {
      studentsState.reload();
      attendanceState.reload();
    },
  };
}

export function useTeacherStudentsWithAttendance(classId: number) {
  const classKey = String(classId);
  const studentsState = useResource<ClassStudentRow[]>(endpoints.teacher.classStudents(classKey));
  const attendanceState = useResource<AttendanceToday>(endpoints.teacher.attendanceToday(classId));

  const attendanceByStudent = useMemo(() => {
    const map = new Map<number, StudentTodayAttendance>();
    const data = attendanceState.data;
    if (!data) return map;
    for (const r of data.recorded ?? []) {
      if (r.student?.id) {
        map.set(r.student.id, { status: r.status, note: r.note, recorded: true });
      }
    }
    for (const n of data.not_recorded ?? []) {
      if (n.id && !map.has(n.id)) {
        map.set(n.id, { status: n.status ?? 'present', recorded: false });
      }
    }
    return map;
  }, [attendanceState.data]);

  return {
    students: studentsState.data ?? [],
    attendanceByStudent,
    loading: studentsState.loading || attendanceState.loading,
    error: studentsState.error ?? attendanceState.error,
    reload: () => {
      studentsState.reload();
      attendanceState.reload();
    },
  };
}
