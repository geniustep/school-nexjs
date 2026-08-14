import type { ReactNode } from 'react';

export const libraryInputClass = 'input';
export const librarySelectClass = 'select';
export const libraryTextareaClass = 'textarea';
export const libraryPrimaryButton = 'btn btn--primary';
export const librarySecondaryButton = 'btn btn--ghost btn--sm';

export function LibraryModal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="modal-overlay" role="presentation" onMouseDown={(event) => {
      if (event.currentTarget === event.target) onClose();
    }}>
      <div className="modal-content" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-content__header library-modal__header">
          <h2>{title}</h2>
          <button type="button" onClick={onClose} className="btn btn--ghost btn--sm">إغلاق</button>
        </div>
        <div className="modal-content__body">{children}</div>
      </div>
    </div>
  );
}
