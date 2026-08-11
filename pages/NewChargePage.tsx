// pages/NewChargePage.tsx — Nova Cobrança, Passos 1 e 2 (M10a)
import React, { useCallback } from 'react';
import { useNewChargeWizard } from '../hooks/useNewChargeWizard';
import { useClients } from '../hooks/useClients';
import { useProducts } from '../hooks/useProducts';
import { WizardProgress } from '../components/WizardProgress';
import { ClientAutocomplete } from '../components/ClientAutocomplete';
import { ProductAutocomplete } from '../components/ProductAutocomplete';
import { PaymentSelector } from '../components/PaymentSelector';
import { Cliente as ClienteAPI, ProdutoServico as ProdutoAPI } from '../api/entities';
import { eventBus } from '../lib/event-bus';
import { formatarMoeda, formatarTelefone } from '../lib/format.utils';
import type { Cliente } from '../types/client.types';
import type { ProdutoServico } from '../types/product.types';
import type { FormaPagamento } from '../types/common.types';

export function NewChargePage() {
  const wizard = useNewChargeWizard();
  const { clientes, refresh: refreshClientes } = useClients();
  const { produtos, refresh: refreshProdutos } = useProducts();

  const handleCancel = useCallback(() => {
    if (wizard.isDirty) {
      const confirm = window.confirm('Deseja cancelar? Os dados preenchidos serão perdidos.');
      if (!confirm) return;
    }
    wizard.reset();
  }, [wizard]);

  // Criação inline de cliente
  const handleCreateClient = useCallback(async (nome: string, telefone: string): Promise<Cliente> => {
    const newClient = await ClienteAPI.create({ nome, telefone, ativo: true });
    eventBus.emit('client:created');
    await refreshClientes();
    return newClient;
  }, [refreshClientes]);

  // Seleção de cliente
  const handleSelectClient = useCallback((cliente: Cliente) => {
    wizard.updateData({ cliente });
  }, [wizard]);

  // Criação inline de produto
  const handleCreateProduct = useCallback(async (nome: string, valor: number): Promise<ProdutoServico> => {
    const newProduct = await ProdutoAPI.create({ nome, valorPadrao: valor, vezesUsado: 0 });
    eventBus.emit('product:created');
    await refreshProdutos();
    return newProduct;
  }, [refreshProdutos]);

  // Seleção de produto
  const handleSelectProduct = useCallback((produto: ProdutoServico | { nome: string; produtoServicoId: null }) => {
    const p = produto as any;
    const prodId: string | null = p.id || p.produtoServicoId || null;
    const valorPadrao: number | null = p.valorPadrao !== undefined && p.valorPadrao !== null ? p.valorPadrao : null;

    wizard.updateData({
      produtoNome: p.nome || '',
      produtoServicoId: prodId,
      valorPadrao: valorPadrao,
      ...(valorPadrao !== null ? { valor: String(valorPadrao) } : {}),
    });
  }, [wizard]);

  // Handlers do Passo 2
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
    wizard.updateData({
      quantidadeParcelas: qtd,
      isParcelado: qtd > 1,
    });
  }, [wizard]);

  const { passoAtual, data, isPasso1Valid, isPasso2Valid } = wizard;

  return React.createElement('div', { className: 'max-w-xl mx-auto p-4 space-y-6' },
    // Header
    React.createElement('div', { className: 'flex items-center justify-between border-b pb-4' },
      React.createElement('h1', { className: 'text-xl font-bold text-foreground' }, 'Nova Cobrança'),
      React.createElement('button', {
        onClick: handleCancel,
        className: 'rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground text-lg leading-none',
        title: 'Cancelar',
        'aria-label': 'Cancelar',
      }, '✕')
    ),

    // Progress Bar
    React.createElement(WizardProgress, { passoAtual }),

    // Passo 1: Cliente e Produto
    passoAtual === 1 ? React.createElement('div', { className: 'space-y-6' },
      React.createElement('h2', { className: 'text-lg font-semibold text-foreground' }, 'Passo 1: Cliente e Produto'),

      // Campo Cliente
      React.createElement('div', { className: 'space-y-2' },
        React.createElement('label', { className: 'block text-sm font-medium text-foreground' }, 'Cliente'),
        data.cliente ? React.createElement('div', { className: 'flex items-center justify-between p-3 rounded-md border bg-muted/30' },
          React.createElement('div', null,
            React.createElement('p', { className: 'font-medium text-sm text-foreground' }, data.cliente.nome),
            React.createElement('p', { className: 'text-xs text-muted-foreground' }, formatarTelefone(data.cliente.telefone))
          ),
          React.createElement('button', {
            onClick: () => wizard.updateData({ cliente: null }),
            className: 'text-xs text-primary hover:underline font-medium'
          }, 'Alterar')
        ) : React.createElement(ClientAutocomplete, {
          clientes,
          onSelect: handleSelectClient,
          onCreateNew: handleCreateClient,
        })
      ),

      // Campo Produto / Serviço
      React.createElement('div', { className: 'space-y-2' },
        React.createElement('label', { className: 'block text-sm font-medium text-foreground' }, 'Produto ou Serviço'),
        data.produtoNome ? React.createElement('div', { className: 'flex items-center justify-between p-3 rounded-md border bg-muted/30' },
          React.createElement('div', null,
            React.createElement('p', { className: 'font-medium text-sm text-foreground' }, data.produtoNome),
            data.valorPadrao !== null ? React.createElement('p', { className: 'text-xs text-muted-foreground' }, `Valor padrão: ${formatarMoeda(data.valorPadrao)}`) : React.createElement('p', { className: 'text-xs text-muted-foreground' }, 'Venda avulsa')
          ),
          React.createElement('button', {
            onClick: () => wizard.updateData({ produtoNome: '', produtoServicoId: null, valorPadrao: null }),
            className: 'text-xs text-primary hover:underline font-medium'
          }, 'Alterar')
        ) : React.createElement(ProductAutocomplete, {
          produtos,
          allowVendaAvulsa: true,
          onSelect: handleSelectProduct,
          onCreateNew: handleCreateProduct,
        })
      ),

      // Botões do Passo 1
      React.createElement('div', { className: 'flex justify-end gap-2 pt-4 border-t' },
        React.createElement('button', {
          onClick: handleCancel,
          className: 'px-4 py-2 text-sm font-medium rounded-md border hover:bg-accent'
        }, 'Cancelar'),
        React.createElement('button', {
          onClick: wizard.proximoPasso,
          disabled: !isPasso1Valid,
          className: 'px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed'
        }, 'Continuar')
      )
    ) : null,

    // Passo 2: Valor e Forma de Pagamento
    passoAtual === 2 ? React.createElement('div', { className: 'space-y-6' },
      React.createElement('h2', { className: 'text-lg font-semibold text-foreground' }, 'Passo 2: Valor e Pagamento'),

      // Input de Valor
      React.createElement('div', { className: 'space-y-1' },
        React.createElement('label', { className: 'block text-sm font-medium text-foreground' }, 'Valor (R$)'),
        React.createElement('input', {
          type: 'text',
          value: data.valor,
          onChange: handleValorChange,
          placeholder: '0,00',
          className: 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm'
        })
      ),

      // PaymentSelector
      React.createElement('div', { className: 'space-y-2' },
        React.createElement('label', { className: 'block text-sm font-medium text-foreground' }, 'Forma de Pagamento'),
        React.createElement(PaymentSelector, {
          value: data.formaPagamento,
          onChange: handleFormaPagamentoChange,
          pixUtilizado: data.pixUtilizado,
          onPixUtilizadoChange: handlePixUtilizadoChange,
          quantidadeParcelas: data.quantidadeParcelas,
          onQuantidadeParcelasChange: handleQuantidadeParcelasChange,
        })
      ),

      // Botões do Passo 2
      React.createElement('div', { className: 'flex justify-between items-center gap-2 pt-4 border-t' },
        React.createElement('button', {
          onClick: wizard.voltarPasso,
          className: 'px-4 py-2 text-sm font-medium rounded-md border hover:bg-accent'
        }, 'Voltar'),
        React.createElement('button', {
          onClick: wizard.proximoPasso,
          disabled: !isPasso2Valid,
          className: 'px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed'
        }, 'Continuar')
      )
    ) : null,

    // Passos 3 e 4 (Placeholder M10b)
    passoAtual >= 3 ? React.createElement('div', { className: 'py-12 text-center space-y-6 border rounded-lg p-6 bg-muted/10' },
      React.createElement('p', { className: 'text-muted-foreground font-medium text-base' }, 'Próxima etapa (M10b)'),
      React.createElement('div', { className: 'flex justify-center' },
        React.createElement('button', {
          onClick: wizard.voltarPasso,
          className: 'px-4 py-2 text-sm font-medium rounded-md border hover:bg-accent'
        }, 'Voltar')
      )
    ) : null
  );
}
