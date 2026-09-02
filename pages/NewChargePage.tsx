// pages/NewChargePage.tsx — Nova Cobrança + edição (M10a + M10b + M14)
import React, { useCallback, useEffect, useState } from 'react';
import { useNewChargeWizard, parseWizardValor, type WizardData } from '../hooks/useNewChargeWizard';
import { useClients } from '../hooks/useClients';
import { useProducts } from '../hooks/useProducts';
import { WizardProgress } from '../components/WizardProgress';
import { ClientAutocomplete } from '../components/ClientAutocomplete';
import { ProductAutocomplete } from '../components/ProductAutocomplete';
import { PaymentSelector } from '../components/PaymentSelector';
import { DaySelector } from '../components/DaySelector';
import { ParcelPreview } from '../components/ParcelPreview';
import {
  Cliente as ClienteAPI,
  ProdutoServico as ProdutoAPI,
  Cobranca as CobrancaAPI,
  Parcela as ParcelaAPI,
} from '../api/entities';
import { podeEditarCobranca } from '../domain/charge.rules';
import { eventBus } from '../lib/event-bus';
import { formatarDataBR } from '../lib/date.utils';
import { formatarMoeda, formatarTelefone } from '../lib/format.utils';
import { normalizarTelefone, validarTelefone } from '../lib/validation.utils';
import type { CobrancaInput, CobrancaUpdate } from '../types/charge.types';
import type { Cliente } from '../types/client.types';
import type { ProdutoServico } from '../types/product.types';
import type { FormaPagamento } from '../types/common.types';

export interface NewChargePageProps {
  onVoltarParaHoje?: () => void;
  editMode?: boolean;
  cobrancaId?: string;
  onEditSuccess?: () => void;
}

const FORMA_LABEL: Record<FormaPagamento, string> = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  cartao_credito: 'Cartão Crédito',
  cartao_debito: 'Cartão Débito',
  transferencia: 'Transferência',
};

export function NewChargePage({
  onVoltarParaHoje,
  editMode = false,
  cobrancaId,
  onEditSuccess,
}: NewChargePageProps = {}) {
  const wizard = useNewChargeWizard();
  const { clientes, refresh: refreshClientes } = useClients();
  const { produtos, refresh: refreshProdutos } = useProducts();
  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);
  const [parcelasCriadas, setParcelasCriadas] = useState<number | null>(null);
  const [carregandoEdicao, setCarregandoEdicao] = useState(editMode);
  const [edicaoCompleta, setEdicaoCompleta] = useState(true);
  const [edicaoConcluida, setEdicaoConcluida] = useState(false);
  const [clientesRecentesIds, setClientesRecentesIds] = useState<string[]>([]);

  const hydrateData = wizard.hydrateData;

  useEffect(() => {
    if (editMode) return;
    let cancelled = false;
    async function carregarRecentes() {
      try {
        const cobrancas = await CobrancaAPI.list({ sort: '-created_date' });
        const ids: string[] = [];
        for (const cobranca of cobrancas) {
          if (!ids.includes(cobranca.clienteId)) ids.push(cobranca.clienteId);
          if (ids.length >= 5) break;
        }
        if (!cancelled) setClientesRecentesIds(ids);
      } catch {
        if (!cancelled) setClientesRecentesIds([]);
      }
    }
    void carregarRecentes();
    const offCreated = eventBus.on('charge:created', carregarRecentes);
    return () => { cancelled = true; offCreated(); };
  }, [editMode]);

  const clientesParaAutocomplete = [...clientes].sort((a, b) => {
    const ia = clientesRecentesIds.indexOf(a.id);
    const ib = clientesRecentesIds.indexOf(b.id);
    if (ia === -1 && ib === -1) return 0;
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  useEffect(() => {
    if (!editMode) {
      setCarregandoEdicao(false);
      return;
    }
    if (!cobrancaId) {
      setErroSalvar('Cobrança não informada para edição.');
      setCarregandoEdicao(false);
      return;
    }

    let cancelled = false;
    setCarregandoEdicao(true);
    setErroSalvar(null);

    async function carregarEdicao() {
      try {
        const cobranca = await CobrancaAPI.get(cobrancaId!);
        const [cliente, parcelas] = await Promise.all([
          ClienteAPI.get(cobranca.clienteId),
          ParcelaAPI.filter({ cobrancaId: cobranca.id }),
        ]);
        if (cancelled) return;

        const dados: WizardData = {
          cliente,
          produtoNome: cobranca.nomeProdutoServico,
          produtoServicoId: cobranca.produtoServicoId,
          valorPadrao: null,
          valor: String(cobranca.valor),
          formaPagamento: cobranca.formaPagamento,
          pixUtilizado: cobranca.pixUtilizado ?? '',
          isParcelado: cobranca.quantidadeParcelas > 1,
          quantidadeParcelas: cobranca.quantidadeParcelas,
          diaVencimentoFixo: cobranca.diaVencimentoFixo,
          primeiroVencimento: cobranca.primeiroVencimento,
          observacoes: cobranca.observacoes ?? '',
        };
        hydrateData(dados, 1);
        setEdicaoCompleta(podeEditarCobranca(parcelas));
      } catch (error) {
        if (cancelled) return;
        const detalhe = error instanceof Error ? error.message : 'Erro desconhecido';
        setErroSalvar(`Erro ao carregar cobrança. ${detalhe}`);
      } finally {
        if (!cancelled) setCarregandoEdicao(false);
      }
    }

    void carregarEdicao();
    return () => { cancelled = true; };
  }, [editMode, cobrancaId, hydrateData]);

  const handleCancel = useCallback(() => {
    if (wizard.isDirty) {
      const confirm = window.confirm('Deseja cancelar? Os dados preenchidos serão perdidos.');
      if (!confirm) return;
    }
    wizard.reset();
    if (editMode && onEditSuccess) onEditSuccess();
  }, [wizard, editMode, onEditSuccess]);

  const handleCreateClient = useCallback(async (nome: string, telefone: string): Promise<Cliente> => {
    const telefoneNormalizado = normalizarTelefone(telefone);
    if (!nome.trim() || !validarTelefone(telefoneNormalizado)) {
      throw new Error('Informe nome e telefone válido com DDD.');
    }
    const newClient = await ClienteAPI.create({ nome: nome.trim(), telefone: telefoneNormalizado, ativo: true });
    eventBus.emit('client:created');
    await refreshClientes();
    return newClient;
  }, [refreshClientes]);

  const handleSelectClient = useCallback((cliente: Cliente) => {
    wizard.updateData({ cliente });
  }, [wizard]);

  const handleCreateProduct = useCallback(async (nome: string, valor: number): Promise<ProdutoServico> => {
    const newProduct = await ProdutoAPI.create({ nome, valorPadrao: valor, vezesUsado: 0 });
    eventBus.emit('product:created');
    await refreshProdutos();
    return newProduct;
  }, [refreshProdutos]);

  const handleSelectProduct = useCallback((produto: ProdutoServico | { nome: string; produtoServicoId: null }) => {
    const p = produto as ProdutoServico & { produtoServicoId?: null };
    const prodId: string | null = p.id || p.produtoServicoId || null;
    const valorPadrao: number | null = p.valorPadrao !== undefined && p.valorPadrao !== null ? p.valorPadrao : null;
    wizard.updateData({
      produtoNome: p.nome || '',
      produtoServicoId: prodId,
      valorPadrao,
      ...(valorPadrao !== null ? { valor: String(valorPadrao) } : {}),
    });
  }, [wizard]);

  const handleValorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    wizard.updateData({ valor: e.target.value });
  }, [wizard]);

  const handleFormaPagamentoChange = useCallback((forma: FormaPagamento) => {
    wizard.updateData({ formaPagamento: forma });
  }, [wizard]);

  const handlePixUtilizadoChange = useCallback((pix: string) => {
    wizard.updateData({ pixUtilizado: pix });
  }, [wizard]);

  const handleQuantidadeParcelasChange = useCallback((qtd: number) => {
    wizard.updateData({ quantidadeParcelas: qtd, isParcelado: qtd > 1 });
  }, [wizard]);

  const handleConfirmar = useCallback(async () => {
    if (salvando || !wizard.data.cliente || !wizard.data.formaPagamento || !wizard.isPasso3Valid) return;
    if (editMode && !cobrancaId) return;

    setSalvando(true);
    setErroSalvar(null);
    try {
      if (editMode) {
        const patch: CobrancaUpdate = edicaoCompleta
          ? {
              valor: parseWizardValor(wizard.data.valor),
              formaPagamento: wizard.data.formaPagamento,
              quantidadeParcelas: wizard.data.quantidadeParcelas,
              primeiroVencimento: wizard.data.primeiroVencimento,
              diaVencimentoFixo: wizard.data.diaVencimentoFixo,
              pixUtilizado: wizard.data.formaPagamento === 'pix' ? wizard.data.pixUtilizado.trim() : '',
              observacoes: wizard.data.observacoes.trim(),
            }
          : {
              ...(wizard.data.formaPagamento === 'pix' ? { pixUtilizado: wizard.data.pixUtilizado.trim() } : {}),
              observacoes: wizard.data.observacoes.trim(),
            };

        await CobrancaAPI.update(cobrancaId!, patch);
        eventBus.emit('charge:updated');
        if (onEditSuccess) {
          onEditSuccess();
        } else {
          setEdicaoConcluida(true);
        }
        return;
      }

      const input: CobrancaInput = {
        clienteId: wizard.data.cliente.id,
        produtoServicoId: wizard.data.produtoServicoId,
        nomeProdutoServico: wizard.data.produtoNome.trim(),
        valor: parseWizardValor(wizard.data.valor),
        formaPagamento: wizard.data.formaPagamento,
        quantidadeParcelas: wizard.data.quantidadeParcelas,
        primeiroVencimento: wizard.data.primeiroVencimento,
        diaVencimentoFixo: wizard.data.diaVencimentoFixo,
        pixUtilizado: wizard.data.formaPagamento === 'pix' ? wizard.data.pixUtilizado.trim() : null,
        observacoes: wizard.data.observacoes.trim(),
      };
      await CobrancaAPI.create(input);
      eventBus.emit('charge:created');
      setParcelasCriadas(input.quantidadeParcelas);
    } catch (error) {
      const detalhe = error instanceof Error ? error.message : 'Erro desconhecido';
      setErroSalvar(`${editMode ? 'Erro ao salvar alterações.' : 'Erro ao registrar cobrança.'} ${detalhe}`);
    } finally {
      setSalvando(false);
    }
  }, [salvando, wizard, editMode, cobrancaId, edicaoCompleta, onEditSuccess]);

  const handleNovaCobranca = useCallback(() => {
    wizard.resetParaNovaCobranca();
    setParcelasCriadas(null);
    setErroSalvar(null);
  }, [wizard]);

  const handleVoltarParaHoje = useCallback(() => {
    if (onVoltarParaHoje) {
      onVoltarParaHoje();
      return;
    }
    window.location.assign('/');
  }, [onVoltarParaHoje]);

  const handleVoltarClientes = useCallback(() => {
    if (onEditSuccess) {
      onEditSuccess();
      return;
    }
    window.location.assign('/clientes');
  }, [onEditSuccess]);

  const { passoAtual, data, isPasso1Valid, isPasso2Valid, isPasso3Valid } = wizard;
  const valorNumerico = parseWizardValor(data.valor);
  const isPasso2EfetivamenteValido = editMode && !edicaoCompleta
    ? data.formaPagamento !== 'pix' || data.pixUtilizado.trim().length > 0
    : isPasso2Valid;

  if (carregandoEdicao) {
    return React.createElement('div', { className: 'flex justify-center p-8' },
      React.createElement('p', { className: 'text-muted-foreground' }, 'Carregando cobrança...'));
  }

  if (edicaoConcluida) {
    return React.createElement('div', { className: 'max-w-xl mx-auto p-4' },
      React.createElement('div', { className: 'rounded-lg border bg-card p-8 text-center space-y-6' },
        React.createElement('h1', { className: 'text-xl font-bold text-foreground' }, '✓ Cobrança atualizada!'),
        React.createElement('button', {
          type: 'button', onClick: handleVoltarClientes,
          className: 'min-h-12 rounded-md bg-primary px-4 py-3 font-medium text-primary-foreground',
        }, '👥 Voltar para Clientes')));
  }

  if (!editMode && parcelasCriadas !== null) {
    return React.createElement('div', { className: 'max-w-xl mx-auto p-4' },
      React.createElement('div', { className: 'rounded-lg border bg-card p-8 text-center space-y-6' },
        React.createElement('div', { className: 'space-y-2' },
          React.createElement('p', { className: 'text-3xl', 'aria-hidden': true }, '✓'),
          React.createElement('h1', { className: 'text-xl font-bold text-foreground' }, 'Cobrança registrada!'),
          React.createElement('p', { className: 'text-muted-foreground' },
            `${parcelasCriadas} ${parcelasCriadas === 1 ? 'parcela criada.' : 'parcelas criadas.'}`)),
        React.createElement('div', { className: 'grid gap-3 sm:grid-cols-2' },
          React.createElement('button', { type: 'button', onClick: handleNovaCobranca, className: 'min-h-12 rounded-md bg-primary px-4 py-3 font-medium text-primary-foreground' }, '➕ Nova cobrança'),
          React.createElement('button', { type: 'button', onClick: handleVoltarParaHoje, className: 'min-h-12 rounded-md border px-4 py-3 font-medium hover:bg-accent' }, '🏠 Voltar para Hoje'))));
  }

  return React.createElement('div', { className: 'max-w-xl mx-auto p-4 space-y-6' },
    React.createElement('div', { className: 'flex items-center justify-between border-b pb-4' },
      React.createElement('div', null,
        React.createElement('h1', { className: 'text-xl font-bold text-foreground' }, editMode ? 'Editar Cobrança' : 'Nova Cobrança'),
        editMode && !edicaoCompleta
          ? React.createElement('p', { className: 'mt-1 text-xs text-amber-700' }, 'Edição limitada: somente observações e PIX podem ser alterados.')
          : null),
      React.createElement('button', { type: 'button', onClick: handleCancel, className: 'rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground text-lg leading-none', title: 'Cancelar', 'aria-label': 'Cancelar' }, '✕')),
    React.createElement(WizardProgress, { passoAtual }),

    passoAtual === 1 ? React.createElement('div', { className: 'space-y-6' },
      React.createElement('h2', { className: 'text-lg font-semibold text-foreground' }, 'Passo 1: Cliente e Produto'),
      React.createElement('div', { className: 'space-y-2' },
        React.createElement('label', { className: 'block text-sm font-medium text-foreground' }, 'Cliente'),
        data.cliente ? React.createElement('div', { className: 'flex items-center justify-between p-3 rounded-md border bg-muted/30' },
          React.createElement('div', null,
            React.createElement('p', { className: 'font-medium text-sm text-foreground' }, data.cliente.nome),
            React.createElement('p', { className: 'text-xs text-muted-foreground' }, formatarTelefone(data.cliente.telefone))),
          !editMode ? React.createElement('button', { type: 'button', onClick: () => wizard.updateData({ cliente: null }), className: 'text-xs text-primary hover:underline font-medium' }, 'Alterar') : null)
        : React.createElement(React.Fragment, null,
          wizard.clienteSugerido && !editMode ? React.createElement('button', { type: 'button', onClick: () => handleSelectClient(wizard.clienteSugerido!), className: 'w-full rounded-md border border-primary/30 bg-primary/5 p-3 text-left hover:bg-primary/10' },
            React.createElement('span', { className: 'block text-xs font-medium text-primary' }, 'ÚLTIMO CLIENTE'),
            React.createElement('span', { className: 'block text-sm font-medium text-foreground' }, wizard.clienteSugerido.nome)) : null,
          !editMode ? React.createElement(ClientAutocomplete, { clientes: clientesParaAutocomplete, onSelect: handleSelectClient, onCreateNew: handleCreateClient }) : null)),
      React.createElement('div', { className: 'space-y-2' },
        React.createElement('label', { className: 'block text-sm font-medium text-foreground' }, 'Produto ou Serviço'),
        data.produtoNome ? React.createElement('div', { className: 'flex items-center justify-between p-3 rounded-md border bg-muted/30' },
          React.createElement('div', null,
            React.createElement('p', { className: 'font-medium text-sm text-foreground' }, data.produtoNome),
            data.produtoServicoId !== null ? (data.valorPadrao !== null ? React.createElement('p', { className: 'text-xs text-muted-foreground' }, `Valor padrão: ${formatarMoeda(data.valorPadrao)}`) : React.createElement('p', { className: 'text-xs text-muted-foreground' }, 'Produto cadastrado')) : React.createElement('p', { className: 'text-xs text-muted-foreground' }, 'Venda avulsa')),
          !editMode ? React.createElement('button', { type: 'button', onClick: () => wizard.updateData({ produtoNome: '', produtoServicoId: null, valorPadrao: null }), className: 'text-xs text-primary hover:underline font-medium' }, 'Alterar') : null)
        : !editMode ? React.createElement(ProductAutocomplete, { produtos, allowVendaAvulsa: true, onSelect: handleSelectProduct, onCreateNew: handleCreateProduct }) : null),
      React.createElement('div', { className: 'flex justify-end gap-2 pt-4 border-t' },
        React.createElement('button', { type: 'button', onClick: handleCancel, className: 'px-4 py-2 text-sm font-medium rounded-md border hover:bg-accent' }, 'Cancelar'),
        React.createElement('button', { type: 'button', onClick: wizard.proximoPasso, disabled: !isPasso1Valid, className: 'px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed' }, 'Continuar'))
    ) : null,

    passoAtual === 2 ? React.createElement('div', { className: 'space-y-6' },
      React.createElement('h2', { className: 'text-lg font-semibold text-foreground' }, 'Passo 2: Valor e Pagamento'),
      editMode && !edicaoCompleta
        ? React.createElement('div', { className: 'rounded-md border bg-muted/20 p-4 space-y-3' },
            React.createElement('p', { className: 'text-sm' }, `Valor: ${formatarMoeda(valorNumerico)}`),
            React.createElement('p', { className: 'text-sm' }, `Forma: ${data.formaPagamento ? FORMA_LABEL[data.formaPagamento] : '—'}`),
            React.createElement('p', { className: 'text-sm' }, `Parcelas: ${data.quantidadeParcelas}`),
            data.formaPagamento === 'pix' ? React.createElement('div', { className: 'space-y-1 pt-2' },
              React.createElement('label', { htmlFor: 'pix-edicao-limitada', className: 'block text-sm font-medium' }, 'PIX utilizado'),
              React.createElement('input', { id: 'pix-edicao-limitada', type: 'text', value: data.pixUtilizado, onChange: (e: React.ChangeEvent<HTMLInputElement>) => wizard.updateData({ pixUtilizado: e.target.value }), className: 'w-full rounded-md border px-3 py-2 text-sm' })) : null)
        : React.createElement(React.Fragment, null,
            React.createElement('div', { className: 'space-y-1' },
              React.createElement('label', { htmlFor: 'valor-cobranca', className: 'block text-sm font-medium text-foreground' }, 'Valor (R$)'),
              React.createElement('input', { id: 'valor-cobranca', type: 'text', inputMode: 'decimal', value: data.valor, onChange: handleValorChange, placeholder: '0,00', className: 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm' })),
            React.createElement('div', { className: 'space-y-2' },
              React.createElement('label', { className: 'block text-sm font-medium text-foreground' }, 'Forma de Pagamento'),
              React.createElement(PaymentSelector, { value: data.formaPagamento, onChange: handleFormaPagamentoChange, pixUtilizado: data.pixUtilizado, onPixUtilizadoChange: handlePixUtilizadoChange, quantidadeParcelas: data.quantidadeParcelas, onQuantidadeParcelasChange: handleQuantidadeParcelasChange }))),
      React.createElement('div', { className: 'flex justify-between items-center gap-2 pt-4 border-t' },
        React.createElement('button', { type: 'button', onClick: wizard.voltarPasso, className: 'px-4 py-2 text-sm font-medium rounded-md border hover:bg-accent' }, 'Voltar'),
        React.createElement('button', { type: 'button', onClick: wizard.proximoPasso, disabled: !isPasso2EfetivamenteValido, className: 'px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed' }, 'Continuar'))
    ) : null,

    passoAtual === 3 ? React.createElement('div', { className: 'space-y-6' },
      React.createElement('h2', { className: 'text-lg font-semibold text-foreground' }, 'Passo 3: Vencimento'),
      editMode && !edicaoCompleta
        ? React.createElement('div', { className: 'rounded-md border bg-muted/20 p-4 space-y-2' },
            React.createElement('p', { className: 'text-sm' }, `Dia fixo: ${String(data.diaVencimentoFixo).padStart(2, '0')}`),
            React.createElement('p', { className: 'text-sm' }, `Primeiro vencimento: ${formatarDataBR(data.primeiroVencimento)}`))
        : React.createElement(React.Fragment, null,
            React.createElement('div', { className: 'space-y-2' },
              React.createElement('label', { className: 'block text-sm font-medium text-foreground' }, 'Dia fixo de vencimento'),
              React.createElement(DaySelector, { value: data.diaVencimentoFixo, onChange: wizard.selecionarDiaVencimento })),
            React.createElement('div', { className: 'space-y-1' },
              React.createElement('label', { htmlFor: 'primeiro-vencimento', className: 'block text-sm font-medium text-foreground' }, 'Primeiro vencimento'),
              React.createElement('input', { id: 'primeiro-vencimento', type: 'date', value: data.primeiroVencimento, onChange: (e: React.ChangeEvent<HTMLInputElement>) => wizard.updateData({ primeiroVencimento: e.target.value }), className: 'w-full min-h-12 rounded-md border border-input bg-background px-3 py-2 text-sm' }),
              React.createElement('p', { className: 'text-xs text-muted-foreground' }, 'Sugerido automaticamente e editável.'))),
      React.createElement('div', { className: 'space-y-1' },
        React.createElement('label', { htmlFor: 'observacoes-cobranca', className: 'block text-sm font-medium text-foreground' }, 'Observações (opcional)'),
        React.createElement('textarea', { id: 'observacoes-cobranca', value: data.observacoes, onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => wizard.updateData({ observacoes: e.target.value }), rows: 3, className: 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm' })),
      React.createElement('div', { className: 'space-y-2' },
        React.createElement('p', { className: 'text-sm font-semibold text-foreground' }, editMode && !edicaoCompleta ? 'PARCELAS ATUAIS' : 'PARCELAS QUE SERÃO GERADAS'),
        React.createElement(ParcelPreview, { valor: Number.isFinite(valorNumerico) ? valorNumerico : 0, quantidadeParcelas: data.quantidadeParcelas, primeiroVencimento: data.primeiroVencimento, diaVencimentoFixo: data.diaVencimentoFixo })),
      React.createElement('div', { className: 'flex justify-between items-center gap-2 pt-4 border-t' },
        React.createElement('button', { type: 'button', onClick: wizard.voltarPasso, className: 'px-4 py-2 text-sm font-medium rounded-md border hover:bg-accent' }, 'Voltar'),
        React.createElement('button', { type: 'button', onClick: wizard.proximoPasso, disabled: !isPasso3Valid, className: 'px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed' }, 'Continuar'))
    ) : null,

    passoAtual === 4 ? React.createElement('div', { className: 'space-y-6' },
      React.createElement('h2', { className: 'text-lg font-semibold text-foreground' }, 'Passo 4: Salvar'),
      React.createElement('button', { type: 'button', onClick: handleConfirmar, disabled: salvando || !isPasso2EfetivamenteValido, className: 'min-h-12 w-full rounded-md bg-primary px-4 py-3 text-base font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60' }, salvando ? 'Salvando…' : editMode ? '✓ Salvar alterações' : '✓ Confirmar cobrança'),
      React.createElement('dl', { className: 'rounded-md border bg-card p-4 text-sm space-y-3' },
        React.createElement('div', { className: 'flex justify-between gap-4' }, React.createElement('dt', { className: 'text-muted-foreground' }, 'Cliente'), React.createElement('dd', { className: 'text-right font-medium' }, data.cliente?.nome || '—')),
        React.createElement('div', { className: 'flex justify-between gap-4' }, React.createElement('dt', { className: 'text-muted-foreground' }, 'Produto'), React.createElement('dd', { className: 'text-right font-medium' }, data.produtoNome)),
        React.createElement('div', { className: 'flex justify-between gap-4' }, React.createElement('dt', { className: 'text-muted-foreground' }, 'Valor'), React.createElement('dd', { className: 'text-right font-medium' }, formatarMoeda(valorNumerico))),
        React.createElement('div', { className: 'flex justify-between gap-4' }, React.createElement('dt', { className: 'text-muted-foreground' }, 'Pagamento'), React.createElement('dd', { className: 'text-right font-medium' }, data.formaPagamento ? FORMA_LABEL[data.formaPagamento] : '—')),
        React.createElement('div', { className: 'flex justify-between gap-4' }, React.createElement('dt', { className: 'text-muted-foreground' }, 'Parcelas'), React.createElement('dd', { className: 'text-right font-medium' }, data.quantidadeParcelas === 1 ? 'À vista · 1 parcela' : `${data.quantidadeParcelas} parcelas`)),
        React.createElement('div', { className: 'flex justify-between gap-4' }, React.createElement('dt', { className: 'text-muted-foreground' }, 'Vencimento'), React.createElement('dd', { className: 'text-right font-medium' }, formatarDataBR(data.primeiroVencimento)))),
      React.createElement('div', { className: 'flex justify-start pt-4 border-t' },
        React.createElement('button', { type: 'button', onClick: wizard.voltarPasso, disabled: salvando, className: 'px-4 py-2 text-sm font-medium rounded-md border hover:bg-accent disabled:opacity-50' }, 'Voltar'))
    ) : null,

    erroSalvar ? React.createElement('div', { role: 'alert', className: 'fixed bottom-20 md:bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-md border bg-card p-4 shadow-lg' },
      React.createElement('p', { className: 'text-sm font-medium text-destructive' }, erroSalvar),
      React.createElement('div', { className: 'mt-3 flex justify-end gap-2' },
        React.createElement('button', { type: 'button', onClick: () => setErroSalvar(null), className: 'rounded-md px-3 py-2 text-sm hover:bg-accent' }, 'Fechar'),
        passoAtual === 4 ? React.createElement('button', { type: 'button', onClick: handleConfirmar, disabled: salvando, className: 'rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50' }, 'Tentar novamente') : null)) : null
  );
}
