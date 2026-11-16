import React, { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

/**
 * Provedor global de notificações não bloqueantes (M10 / M18).
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'info', durationMs = 4500) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts(prev => [...prev, { id, message, type }]);
    if (durationMs > 0) {
      setTimeout(() => dismiss(id), durationMs);
    }
    return id;
  }, [dismiss]);

  const api = {
    show: showToast,
    success: (msg, ms) => showToast(msg, 'success', ms),
    error: (msg, ms) => showToast(msg, 'error', ms ?? 6000),
    info: (msg, ms) => showToast(msg, 'info', ms),
    dismiss
  };

  const palette = {
    success: { bg: '#ecfdf5', border: '#10b981', text: '#065f46', Icon: CheckCircle2 },
    error: { bg: '#fef2f2', border: '#ef4444', text: '#991b1b', Icon: AlertCircle },
    info: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af', Icon: Info }
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: 'fixed',
          bottom: '1.25rem',
          right: '1.25rem',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          maxWidth: '380px',
          width: 'calc(100vw - 2.5rem)'
        }}
      >
        {toasts.map(({ id, message, type }) => {
          const cfg = palette[type] || palette.info;
          const Icon = cfg.Icon;
          return (
            <div
              key={id}
              role="status"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.6rem',
                background: cfg.bg,
                border: `1px solid ${cfg.border}`,
                color: cfg.text,
                padding: '0.75rem 0.9rem',
                borderRadius: '10px',
                boxShadow: '0 10px 25px rgba(15, 23, 42, 0.14)',
                fontSize: '0.88rem',
                fontWeight: 500
              }}
            >
              <Icon size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span style={{ flex: 1, lineHeight: 1.35 }}>{message}</span>
              <button
                type="button"
                aria-label="Fechar notificação"
                onClick={() => dismiss(id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: cfg.text,
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex'
                }}
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

/**
 * Hook seguro para exibir notificações toast. Faz fallback silencioso se usado fora do Provider.
 */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (ctx) return ctx;
  return {
    show: () => {},
    success: () => {},
    error: () => {},
    info: () => {},
    dismiss: () => {}
  };
}

