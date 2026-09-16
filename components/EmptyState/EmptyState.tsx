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
      { className: "surface-card mx-auto w-full max-w-2xl bg-gradient-to-b from-card to-card/90 px-6 py-8 text-center sm:px-10" },
      React.createElement(
        "div",
        { className: "mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-700 shadow-sm dark:bg-emerald-900/30 dark:text-emerald-300" },
        "✓"
      ),
      React.createElement("p", { className: "mt-4 text-2xl font-semibold text-foreground" }, "Tudo em dia!"),
      React.createElement("p", { className: "mt-1.5 text-sm text-muted-foreground" }, "Nenhuma cobrança para hoje."),
      description
        ? React.createElement("p", { className: "mt-3 text-sm font-medium text-muted-foreground" }, description.replace(/^✓\s*/, ""))
        : null,
      React.createElement(
        Link,
        {
          to: "/cobrancas",
          className: "mt-5 inline-flex h-10 min-w-36 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-soft transition hover:bg-primary/90",
        },
        "Ver cobranças",
        React.createElement("span", { className: "ml-2", "aria-hidden": true }, "→")
      ),
      React.createElement(
        "div",
        { className: "mt-6 border-t pt-4 text-xs text-muted-foreground" },
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
