// hooks/useConfig.ts — Hook de configuração singleton com criação de defaults (M6a)
//
// PRD v2.0 seção 6 — Entidade 5: Configuracao é singleton (1 registro por usuário).
// Se não existir, cria com defaults diasTrabalhados = "1,2,3,4,5" (DIAS_TRABALHADOS_DEFAULT).
// salvar(diasTrabalhados: number[]) converte array para string antes de persistir.
// Retorna diasTrabalhados como number[] (parse da string armazenada).
//
// Invalidação por EventBus: charge:created, charge:updated, charge:deleted não afetam config.
// Nenhum evento invalida useConfig — ela só refaz busca no mount.

import { useState, useEffect, useRef, useCallback } from "react";
import { Configuracao as ConfiguracaoAPI } from "../api/entities";
import { DIAS_TRABALHADOS_DEFAULT } from "../config/app.config";

export type Tema = 'light' | 'dark' | 'system';

export interface ConfigData {
  id: string;
  diasTrabalhados: number[];
  mensagemCobranca: string | null;
  tema: Tema;
}

export interface UseConfigResult {
  config: ConfigData | null;
  loading: boolean;
  error: string | null;
  /** mensagemCobranca: undefined = não alterar; "" = limpar. tema: undefined = não alterar. */
  salvar: (diasTrabalhados: number[], mensagemCobranca?: string, tema?: Tema) => Promise<boolean>;
}

/**
 * Converte string "1,2,3,4,5" para number[] [1,2,3,4,5]
 */
export function parseDiasTrabalhados(str: string): number[] {
  return str
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n) && n >= 0 && n <= 6);
}

/**
 * Converte number[] [1,2,3,4,5] para string "1,2,3,4,5"
 */
export function serializeDiasTrabalhados(dias: number[]): string {
  return dias.sort((a, b) => a - b).join(",");
}

export function useConfig(): UseConfigResult {
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const configIdRef = useRef<string | null>(null);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const existing = await ConfiguracaoAPI.list();
      if (existing.length > 0) {
        const record = existing[0];
        configIdRef.current = record.id;
        setConfig({
          id: record.id,
          diasTrabalhados: parseDiasTrabalhados(record.diasTrabalhados),
          mensagemCobranca: record.mensagemCobranca ?? null,
          tema: record.tema ?? "system",
        });
      } else {
        // Criar com defaults
        const created = await ConfiguracaoAPI.create({
          diasTrabalhados: DIAS_TRABALHADOS_DEFAULT,
        });
        configIdRef.current = created.id;
        setConfig({
          id: created.id,
          diasTrabalhados: parseDiasTrabalhados(created.diasTrabalhados),
          mensagemCobranca: created.mensagemCobranca ?? null,
          tema: created.tema ?? "system",
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao carregar configuração";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // mensagemCobranca opcional: undefined = não alterar; "" = limpar (volta aos templates internos)
  // tema opcional: undefined = não alterar
  const salvar = useCallback(async (diasTrabalhados: number[], mensagemCobranca?: string, tema?: Tema): Promise<boolean> => {
    if (!configIdRef.current) {
      setError("Configuração ainda não carregada");
      return false;
    }
    try {
      const serialized = serializeDiasTrabalhados(diasTrabalhados);
      const patch: { diasTrabalhados: string; mensagemCobranca?: string | null; tema?: Tema } = {
        diasTrabalhados: serialized,
      };
      if (mensagemCobranca !== undefined) {
        patch.mensagemCobranca = mensagemCobranca.trim() === "" ? null : mensagemCobranca;
      }
      if (tema !== undefined) {
        patch.tema = tema;
      }
      await ConfiguracaoAPI.update(configIdRef.current, patch);
      setConfig(prev => ({
        id: configIdRef.current!,
        diasTrabalhados: [...diasTrabalhados].sort((a, b) => a - b),
        mensagemCobranca:
          mensagemCobranca !== undefined
            ? (mensagemCobranca.trim() === "" ? null : mensagemCobranca)
            : (prev?.mensagemCobranca ?? null),
        tema: tema !== undefined ? tema : (prev?.tema ?? "system"),
      }));
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao salvar configuração";
      setError(msg);
      return false;
    }
  }, []);

  return { config, loading, error, salvar };
}
