// hooks/useParcelActions.ts — Ações de parcela com undo (M6b)
//
// PRD v2.0 seção 5 — Performance: sem polling, sem setInterval.
// Ações: marcarPago, marcarParcial, cobrar, confirmarEnvio, arquivar, desarquivar, desfazerPagamento.
// Cada ação atualiza o backend via Parcela.update e emite evento do EventBus.
// marcarPago retorna função de undo que restaura o estado anterior.
//
// NOTA: marcarPago e marcarParcial fazem atualização direta (Plano v2.0 seção M6b),
// sem passar por proximoStatus. A máquina de estados (status.rules) valida transições
// mas a ação de pagamento é direta — o usuário pode marcar como pago de qualquer estado.

import { useCallback } from "react";
import { Parcela as ParcelaAPI } from "../api/entities";
import { eventBus } from "../lib/event-bus";
import { hoje } from "../lib/date.utils";
import { desfazerStatus } from "../domain/status.rules";
import { gerarLinkWhatsApp, gerarMensagem } from "../services/whatsapp.service";
import type { Parcela } from "../types/parcel.types";
import type { Cobranca } from "../types/charge.types";
import type { Cliente } from "../types/client.types";
import type { EstadoAnterior } from "../types/common.types";

export interface UseParcelActionsResult {
  marcarPago: (parcela: Parcela) => Promise<() => Promise<void>>;
  marcarParcial: (parcela: Parcela, valorRecebido: number) => Promise<void>;
  cobrar: (parcela: Parcela, cobranca: Cobranca, cliente: Cliente) => string;
  confirmarEnvio: (parcelaId: string) => Promise<void>;
  arquivar: (parcelaId: string) => Promise<void>;
  desarquivar: (parcelaId: string) => Promise<void>;
  desfazerPagamento: (parcelaId: string, estadoAnterior: EstadoAnterior) => Promise<void>;
}

export function useParcelActions(): UseParcelActionsResult {
  const marcarPago = useCallback(async (parcela: Parcela): Promise<() => Promise<void>> => {
    const estadoAnterior: EstadoAnterior = {
      status: parcela.status,
      valorPago: parcela.valorPago,
      dataPagamento: parcela.dataPagamento,
      dataCobrancaEnviada: parcela.dataCobrancaEnviada,
    };

    // Atualização direta (Plano v2.0 seção M6b)
    const dataHoje = hoje();
    await ParcelaAPI.update(parcela.id, {
      status: "pago",
      dataPagamento: dataHoje,
      valorPago: parcela.valor,
    } as any);
    eventBus.emit("parcel:paid");

    // Função de undo
    return async () => {
      const { camposAtualizar } = desfazerStatus(estadoAnterior);
      await ParcelaAPI.update(parcela.id, camposAtualizar as any);
      eventBus.emit("parcel:updated");
    };
  }, []);

  const marcarParcial = useCallback(async (parcela: Parcela, valorRecebido: number): Promise<void> => {
    const dataHoje = hoje();
    const valorPagoAtual = parcela.valorPago || 0;
    const novoValorPago = valorPagoAtual + valorRecebido;

    if (novoValorPago >= parcela.valor) {
      // Trata como total
      await ParcelaAPI.update(parcela.id, {
        status: "pago",
        dataPagamento: dataHoje,
        valorPago: parcela.valor,
      } as any);
    } else {
      await ParcelaAPI.update(parcela.id, {
        status: "pago_parcial",
        valorPago: novoValorPago,
      } as any);
    }
    eventBus.emit("parcel:updated");
  }, []);

  const cobrar = useCallback((parcela: Parcela, cobranca: Cobranca, cliente: Cliente): string => {
    const mensagem = gerarMensagem(parcela, cobranca, cliente, hoje());
    return gerarLinkWhatsApp(cliente.telefone, mensagem);
  }, []);

  const confirmarEnvio = useCallback(async (parcelaId: string): Promise<void> => {
    await ParcelaAPI.update(parcelaId, {
      status: "cobrado",
      dataCobrancaEnviada: hoje(),
    } as any);
    eventBus.emit("parcel:charged");
  }, []);

  const arquivar = useCallback(async (parcelaId: string): Promise<void> => {
    await ParcelaAPI.update(parcelaId, {
      arquivada: true,
      status: "arquivado",
    } as any);
    eventBus.emit("parcel:archived");
  }, []);

  const desarquivar = useCallback(async (parcelaId: string): Promise<void> => {
    // Buscar a parcela para inferir o status anterior
    const parcela = await ParcelaAPI.get(parcelaId) as any;
    let statusAnterior: string = "pendente";
    if (parcela.valorPago !== null && parcela.valorPago >= parcela.valor) {
      statusAnterior = "pago";
    } else if (parcela.valorPago !== null && parcela.valorPago > 0) {
      statusAnterior = "pago_parcial";
    } else if (parcela.dataCobrancaEnviada !== null) {
      statusAnterior = "cobrado";
    }

    await ParcelaAPI.update(parcelaId, {
      arquivada: false,
      status: statusAnterior,
    } as any);
    eventBus.emit("parcel:unarchived");
  }, []);

  const desfazerPagamento = useCallback(async (parcelaId: string, estadoAnterior: EstadoAnterior): Promise<void> => {
    const { camposAtualizar } = desfazerStatus(estadoAnterior);
    await ParcelaAPI.update(parcelaId, camposAtualizar as any);
    eventBus.emit("parcel:updated");
  }, []);

  return {
    marcarPago,
    marcarParcial,
    cobrar,
    confirmarEnvio,
    arquivar,
    desarquivar,
    desfazerPagamento,
  };
}
