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
      { className: "surface-card -mb-1 mx-auto w-full max-w-2xl bg-gradient-to-b from-card to-card/90 px-5 py-6 text-center sm:px-8" },
      React.createElement(
        "div",
        { className: "mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700 shadow-sm dark:bg-emerald-900/30 dark:text-emerald-300" },
        "✓"
      ),
      React.createElement("p", { className: "mt-3 text-xl font-semibold leading-7 text-foreground" }, "Tudo em dia!"),
      React.createElement("p", { className: "mt-1 text-[13px] leading-5 text-muted-foreground" }, "Nenhuma cobrança para hoje."),
      description
        ? React.createElement("p", { className: "mt-2.5 text-[13px] font-medium leading-5 text-muted-foreground" }, description.replace(/^✓\s*/, ""))
        : null,
      React.createElement(
        Link,
        {
          to: "/cobrancas",
          className: "mt-4 inline-flex h-9 min-w-32 items-center justify-center rounded-lg bg-primary px-4 text-[13px] font-semibold text-primary-foreground shadow-soft transition hover:bg-primary/90",
        },
        "Ver cobranças",
        React.createElement("span", { className: "ml-2", "aria-hidden": true }, "→")
      ),
      React.createElement(
        "div",
        { className: "mt-4 border-t pt-3 text-[11px] leading-4 text-muted-foreground" },
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
