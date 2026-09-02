// hooks/useParcelActions.ts — Ações de parcela com undo (M6b + correções M15)
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
    await ParcelaAPI.update(parcela.id, {
      status: "pago",
      dataPagamento: hoje(),
      valorPago: parcela.valor,
    } as any);
    eventBus.emit("parcel:paid");

    return async () => {
      const { camposAtualizar } = desfazerStatus(estadoAnterior);
      await ParcelaAPI.update(parcela.id, camposAtualizar as any);
      eventBus.emit("parcel:updated");
    };
  }, []);

  const marcarParcial = useCallback(async (parcela: Parcela, valorRecebido: number): Promise<void> => {
    if (!Number.isFinite(valorRecebido) || valorRecebido <= 0) {
      throw new Error("Digite um valor maior que zero");
    }
    const valorNormalizado = Math.floor(valorRecebido * 100) / 100;
    if (valorNormalizado <= 0) {
      throw new Error("Digite um valor maior que zero");
    }

    const valorPagoAtual = parcela.valorPago || 0;
    const novoValorPago = Math.floor((valorPagoAtual + valorNormalizado) * 100) / 100;
    if (novoValorPago >= parcela.valor) {
      await ParcelaAPI.update(parcela.id, {
        status: "pago",
        dataPagamento: hoje(),
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
    // PRD 7.6: arquivamento é flag separado; o status financeiro deve ser preservado.
    await ParcelaAPI.update(parcelaId, { arquivada: true } as any);
    eventBus.emit("parcel:archived");
  }, []);

  const desarquivar = useCallback(async (parcelaId: string): Promise<void> => {
    const parcela = await ParcelaAPI.get(parcelaId) as any;
    const patch: Record<string, unknown> = { arquivada: false };

    // Compatibilidade com registros gerados antes da correção M15, quando arquivar
    // sobrescrevia status='arquivado'. Registros novos apenas limpam o flag.
    if (parcela.status === "arquivado") {
      let statusAnterior = "pendente";
      if (parcela.valorPago !== null && parcela.valorPago >= parcela.valor) {
        statusAnterior = "pago";
      } else if (parcela.valorPago !== null && parcela.valorPago > 0) {
        statusAnterior = "pago_parcial";
      } else if (parcela.dataCobrancaEnviada !== null) {
        statusAnterior = "cobrado";
      }
      patch.status = statusAnterior;
    }

    await ParcelaAPI.update(parcelaId, patch as any);
    eventBus.emit("parcel:unarchived");
  }, []);

  const desfazerPagamento = useCallback(async (parcelaId: string, estadoAnterior: EstadoAnterior): Promise<void> => {
    const { camposAtualizar } = desfazerStatus(estadoAnterior);
    await ParcelaAPI.update(parcelaId, camposAtualizar as any);
    eventBus.emit("parcel:updated");
  }, []);

  return { marcarPago, marcarParcial, cobrar, confirmarEnvio, arquivar, desarquivar, desfazerPagamento };
}
