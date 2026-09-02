import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../api/supabase";

export function SignUpPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const { data, error: authError } = await supabase.auth.signUp({ email: email.trim(), password });
      if (authError) throw authError;
      if (data.session) navigate("/", { replace: true });
      else setMessage("Cadastro realizado. Confirme seu email e depois entre no sistema.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível cadastrar");
    } finally {
      setLoading(false);
    }
  };

  return React.createElement("main", { className: "min-h-screen flex items-center justify-center p-4 bg-background" },
    React.createElement("form", { onSubmit: submit, className: "w-full max-w-sm space-y-4 rounded-lg border bg-card p-5" },
      React.createElement("h1", { className: "text-xl font-semibold" }, "Criar acesso"),
      React.createElement("label", { className: "block space-y-1 text-sm" },
        React.createElement("span", null, "Email"),
        React.createElement("input", { type: "email", autoComplete: "email", required: true, value: email, onChange: (e: any) => setEmail(e.target.value), className: "w-full rounded-md border px-3 py-2" }),
      ),
      React.createElement("label", { className: "block space-y-1 text-sm" },
        React.createElement("span", null, "Senha"),
        React.createElement("input", { type: "password", autoComplete: "new-password", required: true, minLength: 6, value: password, onChange: (e: any) => setPassword(e.target.value), className: "w-full rounded-md border px-3 py-2" }),
      ),
      error ? React.createElement("p", { role: "alert", className: "text-sm text-destructive" }, error) : null,
      message ? React.createElement("p", { role: "status", className: "text-sm text-emerald-700" }, message) : null,
      React.createElement("button", { type: "submit", disabled: loading, className: "w-full rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50" }, loading ? "Cadastrando..." : "Cadastrar"),
      React.createElement("p", { className: "text-center text-sm text-muted-foreground" }, "Já tem acesso? ", React.createElement(Link, { to: "/login", className: "text-primary" }, "Entrar")),
    ),
  );
}
