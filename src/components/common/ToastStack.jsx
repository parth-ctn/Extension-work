import './ToastStack.css';
import { useToast } from "../../hooks/common/useToast.js";

const TYPE_CLASS = {
  success: 'toast--success',
  error: 'toast--error',
  warning: 'toast--warning',
  info: 'toast--info'
};

export function ToastStack() {
  const { toasts, dismissToast } = useToast();

  if (!toasts.length) {
    return null;
  }

  return (
    <div className="toast-stack">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${TYPE_CLASS[toast.type] ?? TYPE_CLASS.info}`}>
          <div className="toast__content">
            {toast.title && <strong className="toast__title">{toast.title}</strong>}
            {toast.description && <p className="toast__description">{toast.description}</p>}
          </div>
          <button className="toast__dismiss" type="button" onClick={() => dismissToast(toast.id)} aria-label="Dismiss">
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

