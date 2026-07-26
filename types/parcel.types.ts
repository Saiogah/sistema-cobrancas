// types/parcel.types.ts — Tipos da entidade Parcela

import type { ParcelaStatus, EstadoAnterior } from "./common.types";

/** Registro completo de Parcela (como retornado pela API) */
export interface Parcela {
  id: string;
  cobrancaId: string;
  clienteId: string;
  numeroParcela: number;
  valor: number;
  valorPago: number | null;
  dataVencimento: string; // YYYY-MM-DD
  status: ParcelaStatus;
  dataPagamento: string | null; // YYYY-MM-DD
  dataCobrancaEnviada: string | null; // YYYY-MM-DD
  arquivada: boolean;
  created_date: string;
  updated_date: string;
}

/** Dados para criar uma nova parcela (gerada automaticamente) */
export interface ParcelaInput {
  cobrancaId: string;
  clienteId: string;
  numeroParcela: number;
  valor: number;
  dataVencimento: string; // YYYY-MM-DD
  status: "pendente";
}

/** Dados para atualizar uma parcela existente */
export interface ParcelaUpdate {
  status?: ParcelaStatus;
  valorPago?: number | null;
  dataPagamento?: string | null;
  dataCobrancaEnviada?: string | null;
  arquivada?: boolean;
}

/** Estado derivado de uma parcela calculado em tempo de execução */
export interface ParcelaComStatusCalculado extends Parcela {
  isAtrasada: boolean;
  diasAtraso: number;
  corAtraso: "laranja" | "vermelho" | null;
}

/** Export EstadoAnterior para conveniência */
export type { EstadoAnterior };
