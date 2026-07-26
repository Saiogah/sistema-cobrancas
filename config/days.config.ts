// config/days.config.ts — Fonte única de verdade para dias de vencimento

/** Dias de vencimento fixos disponíveis no sistema (PRD v2.0 seção 6) */
export const DIAS_VENCIMENTO = [5, 10, 15, 20, 25, 30] as const;

/** Tipo derivado dos dias válidos */
export type DiaVencimentoValido = (typeof DIAS_VENCIMENTO)[number];

/** Verifica se um valor é um dia de vencimento válido */
export function isDiaVencimentoValido(valor: number): valor is DiaVencimentoValido {
  return (DIAS_VENCIMENTO as readonly number[]).includes(valor);
}
