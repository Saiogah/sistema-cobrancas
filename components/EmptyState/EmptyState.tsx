// components/EmptyState/EmptyState.tsx — Estado vazio amigável (PRD v2.0 seção 8.1)

import React from "react";
import { Link } from "react-router-dom";

interface EmptyStateProps {
  title: string;
  description?: string;
}

function EmptyStateBase({ title, description }: EmptyStateProps) {
  const isDashboardEmpty = title === "Nada para cobrar hoje";

  if (isDashboardEmpty) {
    return React.createElement(
      "div",
      { className: "surface-card mx-auto w-full max-w-xl px-6 py-10 text-center sm:px-10" },
      React.createElement(
        "div",
        { className: "mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-4xl text-emerald-700 shadow-sm dark:bg-emerald-900/30 dark:text-emerald-300" },
        "✓"
      ),
      React.createElement("p", { className: "mt-5 text-2xl font-semibold text-foreground" }, "Tudo em dia!"),
      React.createElement("p", { className: "mt-2 text-sm text-muted-foreground" }, "Nenhuma cobrança para hoje."),
      description
        ? React.createElement("p", { className: "mt-4 text-sm font-medium text-muted-foreground" }, description.replace(/^✓\s*/, ""))
        : null,
      React.createElement(
        Link,
        {
          to: "/cobrancas",
          className: "mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-soft transition hover:bg-primary/90",
        },
        "Ver cobranças",
        React.createElement("span", { className: "ml-2", "aria-hidden": true }, "→")
      ),
      React.createElement(
        "div",
        { className: "mt-7 border-t pt-5 text-xs text-muted-foreground" },
        "Organização hoje, tranquilidade amanhã."
      )
    );
  }

  return React.createElement(
    "div",
    { className: "surface-subtle flex flex-col items-center justify-center py-10 px-4 text-center" },
    React.createElement("p", { className: "text-lg font-medium text-foreground" }, title),
    description ? React.createElement("p", { className: "mt-2 text-sm text-muted-foreground" }, description) : null
  );
}

export const EmptyState = React.memo(EmptyStateBase);
