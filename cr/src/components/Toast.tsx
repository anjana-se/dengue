import { useCallback, useEffect, useRef, useState } from "react";

export type ToastKind = "info" | "error";

export interface ToastState {
  message: string;
  kind: ToastKind;
  actionLabel?: string;
  onAction?: () => void;
}

/** Controls a single transient toast with auto-dismiss (errors linger longer). */
export function useToastController() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setToast(null);
  }, []);

  const showToast = useCallback((next: ToastState) => {
    if (timer.current) clearTimeout(timer.current);
    const autoMs = next.kind === "error" ? 6000 : 3200;
    timer.current = setTimeout(() => setToast(null), autoMs);
    setToast(next);
  }, []);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  return { toast, showToast, hideToast };
}

export function Toast({ toast }: { toast: ToastState | null }) {
  if (!toast) return null;
  const isError = toast.kind === "error";
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "absolute",
        left: 16,
        right: 16,
        bottom: 82,
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "13px 15px",
        background: isError ? "#7F1D1D" : "#1c2b26",
        color: "#fff",
        borderRadius: 13,
        boxShadow: "0 10px 30px rgba(0,0,0,.28)",
        animation: "dgfade .3s ease",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: isError ? "#F87171" : "#65A30D",
          flex: "none",
        }}
      />
      <span style={{ flex: 1, fontSize: 14, fontWeight: 500, lineHeight: 1.35 }}>
        {toast.message}
      </span>
      {toast.actionLabel && toast.onAction && (
        <button
          type="button"
          onClick={toast.onAction}
          style={{
            flex: "none",
            padding: "6px 13px",
            border: "none",
            borderRadius: 9,
            background: "rgba(255,255,255,.16)",
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {toast.actionLabel}
        </button>
      )}
    </div>
  );
}
