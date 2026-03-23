import { useMemo, useState } from 'react';
import { ToastContext } from './toastContext.js';

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = (id) => setToasts((items) => items.filter((toast) => toast.id !== id));

  const contextValue = useMemo(() => ({
    toasts,
    showToast: ({ title, description, type = 'info', duration = 4000 }) => {
      const id = ++toastId;
      setToasts((items) => [...items, { id, title, description, type }]);
      if (duration) {
        setTimeout(() => removeToast(id), duration);
      }
      return id;
    },
    dismissToast: removeToast
  }), [toasts]);

  return <ToastContext.Provider value={contextValue}>{children}</ToastContext.Provider>;
}

