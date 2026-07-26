/**
 * Funções utilitárias matemáticas para o sistema de cobrança.
 */

/**
 * Divide um valor em parcelas de forma que a soma de todas as parcelas seja exatamente igual ao valor original.
 * Utiliza truncamento na base e joga a diferença centesimal na última parcela.
 * 
 * @param valor Valor total a ser parcelado
 * @param parcelas Quantidade de parcelas
 */
export function dividirValor(valor: number, parcelas: number): { valorBase: number, valorUltima: number } {
  if (parcelas <= 0) {
    throw new Error("A quantidade de parcelas deve ser maior que zero.");
  }
  
  const valorBase = Math.floor((valor / parcelas) * 100) / 100;
  const valorUltima = Math.round((valor - (valorBase * (parcelas - 1))) * 100) / 100;
  
  return { valorBase, valorUltima };
}
