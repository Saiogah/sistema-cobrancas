// hooks/useNewChargeWizard.ts — Estado do wizard de Nova Cobrança (M10a + M10b)
// Gerencia passo atual (1-4), dados preenchidos, validações por passo e reset pós-sucesso.

import { useState, useCallback, useMemo } from 'react';
import { calcularPrimeiroVencimentoSugerido } from '../domain/billing-cycle';
import { mesAlvoExisteDia } from '../lib/date.utils';
import type { Cliente } from '../types/client.types';
import type { DiaVencimento, FormaPagamento } from '../types/common.types';

export interface WizardData {
  // Passo 1
  cliente: Cliente | null;
  produtoNome: string;
  produtoServicoId: string | null;
  valorPadrao: number | null;
  // Passo 2
  valor: string;
  formaPagamento: FormaPagamento | null;
  pixUtilizado: string;
  isParcelado: boolean;
  quantidadeParcelas: number;
  // Passo 3
  diaVencimentoFixo: DiaVencimento;
  primeiroVencimento: string;
  observacoes: string;
}

const initialData: WizardData = {
  cliente: null,
  produtoNome: '',
  produtoServicoId: null,
  valorPadrao: null,
  valor: '',
  formaPagamento: null,
  pixUtilizado: '',
  isParcelado: false,
  quantidadeParcelas: 1,
  diaVencimentoFixo: 10,
  primeiroVencimento: '',
  observacoes: '',
};

export function parseWizardValor(valor: string): number {
  const normalized = valor.trim().replace(/\./g, '').replace(',', '.');
  return Number.parseFloat(normalized);
}

function isDataValida(data: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return false;
  const [ano, mes, dia] = data.split('-').map(Number);
  return mesAlvoExisteDia(ano, mes, dia);
}

export function useNewChargeWizard() {
  const [passoAtual, setPassoAtual] = useState(1);
  const [data, setData] = useState<WizardData>(initialData);
  const [isDirty, setIsDirty] = useState(false);
  const [clienteSugerido, setClienteSugerido] = useState<Cliente | null>(null);

  const updateData = useCallback((updates: Partial<WizardData>) => {
    setData(prev => ({ ...prev, ...updates }));
    setIsDirty(true);
  }, []);

  const hydrateData = useCallback((nextData: WizardData, passo = 1) => {
    setData(nextData);
    setPassoAtual(Math.min(Math.max(passo, 1), 4));
    setIsDirty(false);
    setClienteSugerido(null);
  }, []);

  const selecionarDiaVencimento = useCallback((dia: DiaVencimento) => {
    setData(prev => ({
      ...prev,
      diaVencimentoFixo: dia,
      primeiroVencimento: calcularPrimeiroVencimentoSugerido(dia),
    }));
    setIsDirty(true);
  }, []);

  const irParaPasso = useCallback((passo: number) => {
    if (passo >= 1 && passo <= 4) setPassoAtual(passo);
  }, []);

  const proximoPasso = useCallback(() => {
    if (passoAtual === 2 && !data.primeiroVencimento) {
      setData(prev => ({
        ...prev,
        primeiroVencimento: calcularPrimeiroVencimentoSugerido(prev.diaVencimentoFixo),
      }));
    }
    setPassoAtual(p => Math.min(p + 1, 4));
  }, [passoAtual, data.primeiroVencimento]);

  const voltarPasso = useCallback(() => {
    setPassoAtual(p => Math.max(p - 1, 1));
  }, []);

  /** Reset de cancelamento: limpa tudo, inclusive a sugestão do último cliente. */
  const reset = useCallback(() => {
    setData(initialData);
    setPassoAtual(1);
    setIsDirty(false);
    setClienteSugerido(null);
  }, []);

  /** Reset pós-sucesso: limpa os campos, mas conserva o último cliente como sugestão. */
  const resetParaNovaCobranca = useCallback(() => {
    setClienteSugerido(data.cliente);
    setData(initialData);
    setPassoAtual(1);
    setIsDirty(false);
  }, [data.cliente]);

  const isPasso1Valid = useMemo(() => {
    return data.cliente !== null && data.produtoNome.trim().length >= 3;
  }, [data.cliente, data.produtoNome]);

  const isPasso2Valid = useMemo(() => {
    const valorNum = parseWizardValor(data.valor);
    if (!Number.isFinite(valorNum) || valorNum <= 0 || valorNum > 999999.99) return false;
    if (data.formaPagamento === null) return false;
    if (data.formaPagamento === 'pix' && !data.pixUtilizado.trim()) return false;
    if (data.quantidadeParcelas < 1 || data.quantidadeParcelas > 60) return false;
    if (data.isParcelado && data.quantidadeParcelas < 2) return false;
    return true;
  }, [data.valor, data.formaPagamento, data.pixUtilizado, data.isParcelado, data.quantidadeParcelas]);

  const isPasso3Valid = useMemo(() => {
    return isDataValida(data.primeiroVencimento);
  }, [data.primeiroVencimento]);

  const podeContinuar = useMemo(() => {
    if (passoAtual === 1) return isPasso1Valid;
    if (passoAtual === 2) return isPasso2Valid;
    if (passoAtual === 3) return isPasso3Valid;
    return true;
  }, [passoAtual, isPasso1Valid, isPasso2Valid, isPasso3Valid]);

  return {
    passoAtual,
    data,
    isDirty,
    clienteSugerido,
    podeContinuar,
    isPasso1Valid,
    isPasso2Valid,
    isPasso3Valid,
    updateData,
    hydrateData,
    selecionarDiaVencimento,
    irParaPasso,
    proximoPasso,
    voltarPasso,
    reset,
    resetParaNovaCobranca,
  };
}
