'use client';

import type { Student } from '@/types/student';
import { StudentsKanbanCard } from './students-kanban-card';

export function StudentsKanban({ students }: { students: Student[] }) {
  return (
    <div className="students-kanban" role="list">
      {students.map((student) => (
        <div key={student.id} role="listitem" className="students-kanban__item">
          <StudentsKanbanCard student={student} />
        </div>
      ))}
    </div>
  );
}
