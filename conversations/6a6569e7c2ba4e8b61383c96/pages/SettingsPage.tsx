// pages/SettingsPage.tsx — Tela de configuração de dias trabalhados (M13)
//
// PRD v2.0 seção 8.8 / Tela 5: 7 checkboxes (Seg-Dom), default Seg-Sex.
// Texto explicativo: "As cobranças que vencerem em dias não trabalhados
// aparecerão no próximo dia trabalhado."
// Usa useConfig (M6a) para carregar e persistir.

import { useState, useEffect } from "react";
import { useConfig } from "../hooks/useConfig";
import { DIAS_SEMANA } from "../config/app.config";

export function SettingsPage() {
  const { config, loading, error, salvar } = useConfig();
  const [diasSelecionados, setDiasSelecionados] = useState<number[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

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
        {DIAS_SEMANA.map((dia) => (
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
        As cobranças que vencerem em dias não trabalhados aparecerão no próximo dia trabalhado.
      </p>

      {/* Botão Salvar */}
      <button
        onClick={handleSalvar}
        disabled={salvando || diasSelecionados.length === 0}
        className="w-full inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-10 px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {salvando ? "Salvando..." : "Salvar"}
      </button>

      {/* Toast de confirmação */}
      {toastMsg && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-md bg-card border px-4 py-2 text-sm text-card-foreground shadow-lg">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
