// hooks/useNewChargeWizard.ts — Estado do wizard de Nova Cobrança (M10a)
// Gerencia passo atual (1-4), dados preenchidos, validações por passo, e cancelar.

import { useState, useCallback, useMemo } from 'react';
import type { Cliente } from '../types/client.types';
import type { FormaPagamento } from '../types/common.types';

export interface WizardData {
  // Passo 1
  cliente: Cliente | null;
  produtoNome: string;        // nome do produto (do cadastro ou avulsa)
  produtoServicoId: string | null;  // null = venda avulsa
  valorPadrao: number | null;       // valor padrão do produto selecionado
  // Passo 2
  valor: string;              // string para preservar formatação
  formaPagamento: FormaPagamento | null;
  pixUtilizado: string;
  isParcelado: boolean;
  quantidadeParcelas: number;
  // Passo 3 (será usado no M10b, mas state existe aqui)
  diaVencimentoFixo: number;
  primeiroVencimento: string;
  observacoes: string;
  // Passo 4 (será usado no M10b)
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

export function useNewChargeWizard() {
  const [passoAtual, setPassoAtual] = useState(1);
  const [data, setData] = useState<WizardData>(initialData);
  const [isDirty, setIsDirty] = useState(false);

  const updateData = useCallback((updates: Partial<WizardData>) => {
    setData(prev => ({ ...prev, ...updates }));
    setIsDirty(true);
  }, []);

  const irParaPasso = useCallback((passo: number) => {
    if (passo >= 1 && passo <= 4) {
      setPassoAtual(passo);
    }
  }, []);

  const proximoPasso = useCallback(() => {
    setPassoAtual(p => Math.min(p + 1, 4));
  }, []);

  const voltarPasso = useCallback(() => {
    setPassoAtual(p => Math.max(p - 1, 1));
  }, []);

  const reset = useCallback(() => {
    setData(initialData);
    setPassoAtual(1);
    setIsDirty(false);
  }, []);

  // Validação do Passo 1: cliente e produto preenchidos
  const isPasso1Valid = useMemo(() => {
    return data.cliente !== null && data.produtoNome.trim().length > 0;
  }, [data.cliente, data.produtoNome]);

  // Validação do Passo 2: valor, forma de pagamento, PIX se PIX
  const isPasso2Valid = useMemo(() => {
    const valorClean = data.valor.replace(/\./g, '').replace(',', '.');
    const valorNum = parseFloat(valorClean);
    if (isNaN(valorNum) || valorNum <= 0 || valorNum > 999999.99) return false;
    if (data.formaPagamento === null) return false;
    if (data.formaPagamento === 'pix' && !data.pixUtilizado.trim()) return false;
    if (data.isParcelado && (data.quantidadeParcelas < 2 || data.quantidadeParcelas > 60)) return false;
    return true;
  }, [data.valor, data.formaPagamento, data.pixUtilizado, data.isParcelado, data.quantidadeParcelas]);

  const podeContinuar = useMemo(() => {
    if (passoAtual === 1) return isPasso1Valid;
    if (passoAtual === 2) return isPasso2Valid;
    return true;
  }, [passoAtual, isPasso1Valid, isPasso2Valid]);

  return {
    passoAtual,
    data,
    isDirty,
    podeContinuar,
    isPasso1Valid,
    isPasso2Valid,
    updateData,
    irParaPasso,
    proximoPasso,
    voltarPasso,
    reset,
  };
}
