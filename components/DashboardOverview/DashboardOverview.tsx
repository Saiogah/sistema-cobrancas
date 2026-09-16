import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Cliente, Parcela } from '../../api/entities';
import { eventBus } from '../../lib/event-bus';
import { hoje } from '../../lib/date.utils';
import { formatarMoeda } from '../../lib/format.utils';
import type { Parcela as ParcelaType } from '../../types/parcel.types';

interface OverviewData {
  clientesAtivos: number;
  clientesNovosMes: number;
  pagasNoMes: number;
  valorPagoNoMes: number;
  parcelasEmAberto: number;
  valorEmAberto: number;
  proximosSeteDias: number;
}

const EMPTY_OVERVIEW: OverviewData = {
  clientesAtivos: 0,
  clientesNovosMes: 0,
  pagasNoMes: 0,
  valorPagoNoMes: 0,
  parcelasEmAberto: 0,
  valorEmAberto: 0,
  proximosSeteDias: 0,
};

function addDaysIso(iso: string, amount: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year, month - 1, day + amount);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia!';
  if (hour < 18) return 'Boa tarde!';
  return 'Boa noite!';
}

function formatLongDate(): string {
  const formatted = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function isPaidThisMonth(parcela: ParcelaType, monthPrefix: string): boolean {
  return parcela.status === 'pago' && Boolean(parcela.dataPagamento?.startsWith(monthPrefix));
}

export function DashboardOverview() {
  const [data, setData] = useState<OverviewData>(EMPTY_OVERVIEW);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [clientes, parcelas] = await Promise.all([Cliente.list(), Parcela.list()]);
      const today = hoje();
      const monthPrefix = today.slice(0, 7);
      const nextSevenDays = addDaysIso(today, 7);
      const activeClientIds = new Set(clientes.filter(cliente => cliente.ativo).map(cliente => cliente.id));
      const activeParcels = parcelas.filter(parcela => activeClientIds.has(parcela.clienteId));
      const paidThisMonth = parcelas.filter(parcela => isPaidThisMonth(parcela, monthPrefix));
      const openParcels = activeParcels.filter(parcela => !parcela.arquivada && parcela.status !== 'pago');
      const upcoming = openParcels.filter(parcela => parcela.dataVencimento > today && parcela.dataVencimento <= nextSevenDays);

      setData({
        clientesAtivos: activeClientIds.size,
        clientesNovosMes: clientes.filter(cliente => cliente.ativo && cliente.created_date.startsWith(monthPrefix)).length,
        pagasNoMes: paidThisMonth.length,
        valorPagoNoMes: paidThisMonth.reduce((sum, parcela) => sum + (parcela.valorPago ?? parcela.valor), 0),
        parcelasEmAberto: openParcels.length,
        valorEmAberto: openParcels.reduce((sum, parcela) => sum + Math.max(0, parcela.valor - (parcela.valorPago ?? 0)), 0),
        proximosSeteDias: upcoming.length,
      });
    } catch {
      // Este resumo é apenas visual. Falhas de leitura não interferem no Dashboard funcional.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const unsubs = [
      eventBus.on('client:created', () => void refresh()),
      eventBus.on('client:updated', () => void refresh()),
      eventBus.on('client:inactivated', () => void refresh()),
      eventBus.on('charge:created', () => void refresh()),
      eventBus.on('charge:updated', () => void refresh()),
      eventBus.on('charge:deleted', () => void refresh()),
      eventBus.on('parcel:paid', () => void refresh()),
      eventBus.on('parcel:charged', () => void refresh()),
      eventBus.on('parcel:archived', () => void refresh()),
      eventBus.on('parcel:unarchived', () => void refresh()),
      eventBus.on('parcel:updated', () => void refresh()),
      eventBus.on('parcel:batch:paid', () => void refresh()),
    ];
    return () => unsubs.forEach(unsub => unsub());
  }, [refresh]);

  const cards = useMemo(() => [
    {
      label: 'Clientes ativos',
      value: loading ? '—' : String(data.clientesAtivos),
      detail: loading ? 'Carregando...' : data.clientesNovosMes > 0 ? `+${data.clientesNovosMes} este mês` : 'Cadastros ativos',
      icon: '👥',
      accent: 'border-emerald-500/15 bg-card/90 dark:border-emerald-400/15 dark:bg-card/95',
      iconStyle: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/45 dark:text-emerald-300',
      detailStyle: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Pagas no mês',
      value: loading ? '—' : formatarMoeda(data.valorPagoNoMes),
      detail: loading ? 'Carregando...' : `${data.pagasNoMes} parcela${data.pagasNoMes === 1 ? '' : 's'}`,
      icon: '💳',
      accent: 'border-violet-500/15 bg-card/90 dark:border-violet-400/15 dark:bg-card/95',
      iconStyle: 'bg-violet-100 text-violet-700 dark:bg-violet-900/45 dark:text-violet-300',
      detailStyle: 'text-violet-600 dark:text-violet-400',
    },
    {
      label: 'Em aberto',
      value: loading ? '—' : formatarMoeda(data.valorEmAberto),
      detail: loading ? 'Carregando...' : `${data.parcelasEmAberto} parcela${data.parcelasEmAberto === 1 ? '' : 's'}`,
      icon: '🕘',
      accent: 'border-orange-500/15 bg-card/90 dark:border-orange-400/15 dark:bg-card/95',
      iconStyle: 'bg-orange-100 text-orange-700 dark:bg-orange-900/45 dark:text-orange-300',
      detailStyle: 'text-orange-600 dark:text-orange-400',
    },
    {
      label: 'Próximos vencimentos',
      value: loading ? '—' : String(data.proximosSeteDias),
      detail: 'Nos próximos 7 dias',
      icon: '📅',
      accent: 'border-blue-500/15 bg-card/90 dark:border-blue-400/15 dark:bg-card/95',
      iconStyle: 'bg-blue-100 text-blue-700 dark:bg-blue-900/45 dark:text-blue-300',
      detailStyle: 'text-blue-600 dark:text-blue-400',
    },
  ], [data, loading]);

  return (
    <section className="mx-auto w-full max-w-5xl px-4 pt-7 sm:px-6 sm:pt-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-[1.7rem]">
            {getGreeting()} <span aria-hidden="true">👋</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Aqui está o resumo das suas cobranças de hoje.
          </p>
        </div>
        <p className="text-xs text-muted-foreground sm:pb-1 sm:text-sm">{formatLongDate()}</p>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(card => (
          <div key={card.label} className={`rounded-2xl border p-4 shadow-sm transition-colors ${card.accent}`}>
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-base ${card.iconStyle}`} aria-hidden="true">
              {card.icon}
            </div>
            <p className="mt-3 text-sm font-medium text-muted-foreground">{card.label}</p>
            <p className="mt-1 text-xl font-bold tracking-tight text-foreground">{card.value}</p>
            <p className={`mt-1 text-xs font-medium ${card.detailStyle}`}>{card.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
