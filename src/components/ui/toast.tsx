'use client';

// Minimal toast system for action feedback (success/error). No dependencies.
// Each toast has a dismiss button; auto-dismisses after 4s on success, 6s on error.

import { createContext, useCallback, useContext, useState } from 'react';
import { useT } from '@/features/i18n/locale-context';

type ToastTone = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastApi {
  show: (message: string, tone?: ToastTone) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

function ToastHost({
  toasts,
  dismiss,
}: {
  toasts: Toast[];
  dismiss: (id: number) => void;
}) {
  const t = useT();
  return (
    <div className="toast-host" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="alert"
          className={`toast ${toast.tone === 'error' ? 'toast--error' : ''} ${
            toast.tone === 'success' ? 'toast--success' : ''
          }`}
        >
          <span className="toast__body">{toast.message}</span>
          <button
            className="toast__dismiss"
            onClick={() => dismiss(toast.id)}
            aria-label={t('common.dismissNotification')}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const show = useCallback((message: string, tone: ToastTone = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    // Errors stay longer so users can read them.
    const delay = tone === 'error' ? 6000 : 4000;
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, delay);
  }, []);

  const api: ToastApi = {
    show,
    success: (m) => show(m, 'success'),
    error: (m) => show(m, 'error'),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastHost toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
