"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CircleCheck, CircleX, Info } from "lucide-react";

type ToastType = "success" | "error" | "info";
type Item = { id: number; msg: string; type: ToastType };

const ALERT: Record<ToastType, string> = {
  success: "alert-success",
  error: "alert-error",
  info: "alert-info",
};
const ICON = { success: CircleCheck, error: CircleX, info: Info };

const ToastContext = createContext<{ toast: (msg: string, type?: ToastType) => void }>({
  toast: () => {},
});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);

  const toast = useCallback((msg: string, type: ToastType = "info") => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="toast toast-end z-[9999] no-print">
        {items.map((i) => {
          const Icon = ICON[i.type];
          return (
            <div key={i.id} role="alert" className={`alert ${ALERT[i.type]} shadow-lg max-w-sm`}>
              <Icon className="size-5 shrink-0" />
              <span>{i.msg}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);