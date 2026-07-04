'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toasts: ToastItem[];
  toast: (type: ToastType, message: string) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [counter, setCounter] = useState(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((type: ToastType, message: string) => {
    const id = counter + 1;
    setCounter(id);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      dismiss(id);
    }, 4000);
  }, [counter, dismiss]);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2">
        {toasts.map((t) => {
          const colorClass = {
            success: 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-emerald-200',
            error: 'bg-red-50 border-red-400 text-red-800 shadow-red-200',
            warning: 'bg-amber-50 border-amber-400 text-amber-800 shadow-amber-200',
            info: 'bg-blue-50 border-blue-400 text-blue-800 shadow-blue-200',
          }[t.type];
          return (
            <div
              key={t.id}
              className={`flex items-center gap-3 rounded-xl border-l-4 ${colorClass} px-4 py-3 shadow-lg transition-all max-w-md`}
            >
              <span className="text-sm font-medium">{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                className="ml-auto text-slate-400 hover:text-slate-600"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return { toasts: [], toast: () => {}, dismiss: () => {} };
  }
  return ctx;
}
