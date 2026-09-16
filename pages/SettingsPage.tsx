// pages/SettingsPage.tsx — Tela de configuração de dias trabalhados e Backup (M13)

import { useState, useEffect, useRef } from "react";
import { useConfig } from "../hooks/useConfig";
import { useTheme, type ThemePreference } from "../hooks/useTheme";
import { DIAS_SEMANA } from "../config/app.config";
import { MENSAGEM_COBRANCA_DEFAULT } from "../config/messages.config";
import { exportarDados, importarDados, limparDados } from "../lib/backup";

const THEME_OPTIONS: Array<{ value: ThemePreference; icon: string; label: string; hint: string }> = [
  { value: "light", icon: "☀️", label: "Claro", hint: "Usar tema claro" },
  { value: "dark", icon: "🌙", label: "Escuro", hint: "Usar tema escuro" },
  { value: "system", icon: "🖥️", label: "Sistema", hint: "Seguir o dispositivo" },
];

export function SettingsPage() {
  const { config, loading, error, salvar } = useConfig();
  const { theme, setTheme } = useTheme();
  const [diasSelecionados, setDiasSelecionados] = useState<number[]>([]);
  const [mensagemCobranca, setMensagemCobranca] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [exportando, setExportando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [limpando, setLimpando] = useState(false);
  const [backupError, setBackupError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (config) {
      setDiasSelecionados(config.diasTrabalhados);
      setMensagemCobranca(config.mensagemCobranca ?? MENSAGEM_COBRANCA_DEFAULT);
    }
  }, [config]);

  const toggleDia = (valor: number) => {
    setDiasSelecionados((prev) =>
      prev.includes(valor)
        ? prev.filter((d) => d !== valor)
        : [...prev, valor]
    );
  };

  const handleSalvar = async () => {
    setSalvando(true);
    const mensagemParaSalvar =
      mensagemCobranca === (config?.mensagemCobranca ?? MENSAGEM_COBRANCA_DEFAULT)
        ? undefined
        : mensagemCobranca;
    const ok = await salvar(diasSelecionados, mensagemParaSalvar);
    setSalvando(false);
    if (ok) {
      setToastMsg("Configuração salva com sucesso!");
      setTimeout(() => setToastMsg(null), 3000);
    }
  };

  const handleExportar = async () => {
    setBackupError(null);
    setExportando(true);
    try {
      await exportarDados();
      setToastMsg("Backup exportado com sucesso!");
      setTimeout(() => setToastMsg(null), 3000);
    } catch (err: any) {
      setBackupError(err?.message || "Erro ao exportar backup.");
    } finally {
      setExportando(false);
    }
  };

  const handleImportar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBackupError(null);
    setImportando(true);
    try {
      const text = await file.text();
      await importarDados(text);
      setToastMsg("Backup importado com sucesso!");
      setTimeout(() => setToastMsg(null), 3000);
    } catch (err: any) {
      setBackupError(err?.message || "Erro ao importar backup.");
    } finally {
      setImportando(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleTriggerImport = () => fileInputRef.current?.click();

  const handleLimparDados = async () => {
    const confirmacao = window.confirm(
      "Tem certeza que deseja apagar TODOS os dados? Esta ação não pode ser desfeita."
    );
    if (!confirmacao) return;

    setBackupError(null);
    setLimpando(true);
    try {
      await limparDados();
      setToastMsg("Todos os dados foram apagados com sucesso!");
      setTimeout(() => setToastMsg(null), 3000);
    } catch (err: any) {
      setBackupError(err?.message || "Erro ao apagar os dados.");
    } finally {
      setLimpando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Carregando configurações...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 p-4 sm:p-6 lg:py-7">
      <div className="space-y-1">
        <p className="section-kicker">Preferências</p>
        <h1 className="text-2xl font-semibold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground">Personalize a aparência e o funcionamento do sistema.</p>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <section className="surface-card space-y-4 p-4 sm:p-5">
        <div>
          <h2 className="text-lg font-semibold">Aparência</h2>
          <p className="text-sm text-muted-foreground">Escolha como o sistema deve aparecer.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {THEME_OPTIONS.map((option) => {
            const active = theme === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setTheme(option.value)}
                className={[
                  "relative rounded-xl border p-4 text-left transition-all",
                  active
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "bg-card hover:border-primary/40 hover:bg-accent/60",
                ].join(" ")}
              >
                <span className="text-xl" aria-hidden="true">{option.icon}</span>
                <span className="mt-3 block text-sm font-semibold">{option.label}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{option.hint}</span>
                {active ? <span className="absolute right-3 top-3 text-primary">✓</span> : null}
              </button>
            );
          })}
        </div>
      </section>

      <section className="surface-card space-y-3 p-4 sm:p-5">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Mensagem de cobrança</h2>
          <p className="text-sm text-muted-foreground">
            Texto usado pelo botão Cobrar. Deixe em branco para voltar ao padrão do sistema.
          </p>
        </div>
        <textarea
          value={mensagemCobranca}
          onChange={(e) => setMensagemCobranca(e.target.value)}
          rows={4}
          className="w-full rounded-xl border border-input bg-background/70 p-3 text-sm"
          placeholder="Olá, {cliente}. Sua parcela {parcela}/{totalParcelas} de {produto}..."
        />
        <div className="rounded-xl border bg-background/40 px-3 py-2.5">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Variáveis: {"{cliente}"} · {"{produto}"} · {"{parcela}"} · {"{totalParcelas}"} · {"{vencimento}"} · {"{valor}"} · {"{valorPago}"} · {"{saldo}"}
          </p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Cobranças com PIX recebem a chave automaticamente no fim da mensagem.
          </p>
        </div>
      </section>

      <section className="surface-card space-y-4 p-4 sm:p-5">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Backup de Dados</h2>
          <p className="text-sm text-muted-foreground">
            Exporte ou importe seus dados para segurança ou restauração.
          </p>
        </div>

        {backupError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {backupError}
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-2">
          <button
            onClick={handleExportar}
            disabled={exportando || importando || limpando}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
          >
            {exportando ? "Exportando..." : "Exportar backup"}
          </button>

          <input
            type="file"
            accept=".json,application/json"
            ref={fileInputRef}
            onChange={handleImportar}
            className="hidden"
          />
          <button
            onClick={handleTriggerImport}
            disabled={exportando || importando || limpando}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
          >
            {importando ? "Importando..." : "Importar backup"}
          </button>
        </div>

        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3">
          <p className="mb-2 text-xs font-medium text-destructive">Zona de segurança</p>
          <button
            onClick={handleLimparDados}
            disabled={exportando || importando || limpando}
            className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
          >
            {limpando ? "Limpando..." : "Limpar todos os dados"}
          </button>
        </div>
      </section>

      <section className="surface-card space-y-4 p-4 sm:p-5">
        <div>
          <h2 className="text-lg font-semibold">Dias que você trabalha</h2>
          <p className="text-sm text-muted-foreground">Referência para sua rotina de cobrança.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {DIAS_SEMANA.map((dia: { valor: number; label: string }) => (
            <label
              key={dia.valor}
              className="flex cursor-pointer items-center gap-3 rounded-xl border bg-background/60 p-3 transition-colors hover:bg-accent"
            >
              <input
                type="checkbox"
                checked={diasSelecionados.includes(dia.valor)}
                onChange={() => toggleDia(dia.valor)}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              <span className="text-sm font-medium text-card-foreground">{dia.label}</span>
            </label>
          ))}
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          O cálculo de atraso considera apenas a data de vencimento.
        </p>
      </section>

      <button
        onClick={handleSalvar}
        disabled={salvando || diasSelecionados.length === 0}
        className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {salvando ? "Salvando..." : "Salvar configurações"}
      </button>

      {toastMsg && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 rounded-xl border bg-card px-4 py-2 text-sm text-card-foreground shadow-lg md:bottom-4">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
