import React, { useEffect } from "react";

export interface ActionToastProps {
  message: string;
  onRetry?: () => void;
  onDismiss: () => void;
  timeoutMs?: number;
}

function ActionToastBase({ message, onRetry, onDismiss, timeoutMs = 5000 }: ActionToastProps) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, timeoutMs);
    return () => window.clearTimeout(timer);
  }, [onDismiss, timeoutMs, message]);

  return React.createElement("div", {
    role: "alert",
    className: "fixed bottom-20 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center gap-3 rounded-lg border bg-card p-3 shadow-lg md:bottom-6",
  },
    React.createElement("span", { className: "flex-1 text-sm text-destructive" }, message),
    onRetry ? React.createElement("button", {
      type: "button",
      onClick: onRetry,
      className: "rounded-md border px-2 py-1 text-sm font-medium",
    }, "Tentar novamente") : null,
    React.createElement("button", {
      type: "button",
      onClick: onDismiss,
      className: "rounded-md px-2 py-1 text-sm text-muted-foreground",
      "aria-label": "Dispensar aviso",
    }, "✕"),
  );
}

export const ActionToast = React.memo(ActionToastBase);
