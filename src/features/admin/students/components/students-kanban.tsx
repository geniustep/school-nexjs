'use client';

import { useT } from '@/features/i18n/locale-context';
import { useStudentsKanbanSelection } from '../hooks/use-students-kanban-selection';
import { StudentsKanbanCard } from './students-kanban-card';
import type { Student } from '@/types/student';

export function StudentsKanban({ students }: { students: Student[] }) {
  const t = useT();
  const selection = useStudentsKanbanSelection();

  return (
    <div className="students-kanban-wrap">
      {selection.selectedCount > 0 ? (
        <p className="students-kanban__selection-count" aria-live="polite">
          {t('admin.studentsList.kanban.selectedCount', { count: selection.selectedCount })}
        </p>
      ) : null}

      <div className="students-kanban" role="list">
        {students.map((student) => (
          <div key={student.id} role="listitem" className="students-kanban__item">
            <StudentsKanbanCard
              student={student}
              selected={selection.isSelected(student.id)}
              onToggleSelect={(studentId, next) => selection.toggle(studentId, next)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
