import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../api/supabase";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (authError) throw authError;
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from || "/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar");
    } finally {
      setLoading(false);
    }
  };

  return React.createElement("main", { className: "min-h-screen flex items-center justify-center p-4 bg-background" },
    React.createElement("form", { onSubmit: submit, className: "w-full max-w-sm space-y-4 rounded-lg border bg-card p-5" },
      React.createElement("div", null,
        React.createElement("h1", { className: "text-xl font-semibold" }, "Entrar"),
        React.createElement("p", { className: "text-sm text-muted-foreground" }, "Sistema de Cobranças"),
      ),
      React.createElement("label", { className: "block space-y-1 text-sm" },
        React.createElement("span", null, "Email"),
        React.createElement("input", { type: "email", autoComplete: "email", required: true, value: email, onChange: (e: any) => setEmail(e.target.value), className: "w-full rounded-md border px-3 py-2" }),
      ),
      React.createElement("label", { className: "block space-y-1 text-sm" },
        React.createElement("span", null, "Senha"),
        React.createElement("input", { type: "password", autoComplete: "current-password", required: true, value: password, onChange: (e: any) => setPassword(e.target.value), className: "w-full rounded-md border px-3 py-2" }),
      ),
      error ? React.createElement("p", { role: "alert", className: "text-sm text-destructive" }, error) : null,
      React.createElement("button", { type: "submit", disabled: loading, className: "w-full rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50" }, loading ? "Entrando..." : "Entrar"),
      React.createElement("p", { className: "text-center text-sm text-muted-foreground" }, "Ainda não tem acesso? ", React.createElement(Link, { to: "/cadastro", className: "text-primary" }, "Cadastrar")),
    ),
  );
}
