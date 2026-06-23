import { useEffect } from 'react';

export type MessageTone = 'info' | 'warning' | 'error' | 'done';

interface MessagingProps {
  message: string | null;
  tone?: MessageTone;
  onClose?: () => void;
  autoCloseMs?: number;
}

const toneClasses: Record<MessageTone, string> = {
  info: 'border-blue-200 bg-blue-50 text-blue-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  error: 'border-red-200 bg-red-50 text-red-700',
  done: 'border-green-200 bg-green-50 text-green-700',
};

const progressClasses: Record<MessageTone, string> = {
  info: 'bg-blue-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
  done: 'bg-green-500',
};

export default function Messaging({
  message,
  tone = 'info',
  onClose,
  autoCloseMs = 4500,
}: MessagingProps) {
  useEffect(() => {
    if (!message || !onClose || autoCloseMs <= 0) return;

    const timeoutId = window.setTimeout(onClose, autoCloseMs);
    return () => window.clearTimeout(timeoutId);
  }, [autoCloseMs, message, onClose]);

  if (!message) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-5 z-50 flex justify-center px-4">
      <div className={`pointer-events-auto relative flex w-full max-w-xl items-start justify-between gap-4 overflow-hidden rounded-2xl border px-5 py-4 text-sm font-semibold shadow-2xl shadow-gray-950/10 backdrop-blur ${toneClasses[tone]}`} role="status" aria-live="polite">
        <p>{message}</p>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 rounded-full px-2 text-lg leading-none opacity-70 transition hover:opacity-100"
            aria-label="Cerrar mensaje"
          >
            ×
          </button>
        )}
        {autoCloseMs > 0 && (
          <span
            className={`absolute bottom-0 left-0 h-1 w-full ${progressClasses[tone]}`}
            style={{
              animation: `messaging-progress ${autoCloseMs}ms linear forwards`,
              transformOrigin: 'left',
            }}
          />
        )}
      </div>
      <style>{`
        @keyframes messaging-progress {
          from { transform: scaleX(1); }
          to { transform: scaleX(0); }
        }
      `}</style>
    </div>
  );
}
