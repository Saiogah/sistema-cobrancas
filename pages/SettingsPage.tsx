// pages/SettingsPage.tsx — Tela de configuração de dias trabalhados e Backup (M13)

import { useState, useEffect, useRef } from "react";
import { useConfig } from "../hooks/useConfig";
import { DIAS_SEMANA } from "../config/app.config";
import { exportarDados, importarDados, limparDados } from "../lib/backup";

export function SettingsPage() {
  const { config, loading, error, salvar } = useConfig();
  const [diasSelecionados, setDiasSelecionados] = useState<number[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [exportando, setExportando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [limpando, setLimpando] = useState(false);
  const [backupError, setBackupError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carregar config inicial
  useEffect(() => {
    if (config) {
      setDiasSelecionados(config.diasTrabalhados);
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
    const ok = await salvar(diasSelecionados);
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
      if (e.target) {
        e.target.value = "";
      }
    }
  };

  const handleTriggerImport = () => {
    fileInputRef.current?.click();
  };

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
    <div className="max-w-md mx-auto p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground">Dias que você trabalha</p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Checkboxes Seg-Dom */}
      <div className="space-y-2">
        {DIAS_SEMANA.map((dia: { valor: number; label: string }) => (
          <label
            key={dia.valor}
            className="flex items-center gap-3 rounded-lg border bg-card p-3 cursor-pointer hover:bg-accent transition-colors"
          >
            <input
              type="checkbox"
              checked={diasSelecionados.includes(dia.valor)}
              onChange={() => toggleDia(dia.valor)}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            <span className="text-sm font-medium text-card-foreground">
              {dia.label}
            </span>
          </label>
        ))}
      </div>

      {/* Texto explicativo */}
      <p className="text-xs text-muted-foreground leading-relaxed">
        Referência para seus dias de trabalho. O cálculo de atraso considera apenas a data de vencimento.
      </p>

      {/* Botão Salvar */}
      <button
        onClick={handleSalvar}
        disabled={salvando || diasSelecionados.length === 0}
        className="w-full inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-10 px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {salvando ? "Salvando..." : "Salvar"}
      </button>

      {/* Seção de Backup */}
      <div className="pt-6 border-t space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">Backup de Dados</h2>
          <p className="text-xs text-muted-foreground">
            Exporte ou importe seus dados para segurança ou restauração.
          </p>
        </div>

        {backupError && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {backupError}
          </div>
        )}

        <div className="space-y-2">
          {/* Botão Exportar backup */}
          <button
            onClick={handleExportar}
            disabled={exportando || importando || limpando}
            className="w-full inline-flex items-center justify-center rounded-md border border-input bg-background text-foreground h-10 px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {exportando ? "Exportando..." : "Exportar backup"}
          </button>

          {/* Botão Importar backup + file input */}
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
            className="w-full inline-flex items-center justify-center rounded-md border border-input bg-background text-foreground h-10 px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {importando ? "Importando..." : "Importar backup"}
          </button>

          {/* Botão Limpar todos os dados */}
          <button
            onClick={handleLimparDados}
            disabled={exportando || importando || limpando}
            className="w-full inline-flex items-center justify-center rounded-md bg-destructive text-destructive-foreground h-10 px-4 py-2 text-sm font-medium hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {limpando ? "Limpando..." : "Limpar todos os dados"}
          </button>
        </div>
      </div>

      {/* Toast de confirmação */}
      {toastMsg && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-md bg-card border px-4 py-2 text-sm text-card-foreground shadow-lg">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
