// test_regression.ts — Regressão dos Sprints 1-3 (M3a + M3b + lib)
// Foco: funções críticas que os hooks do Sprint 4 dependem.

import { dividirValor } from "/app/lib/math.utils";
import { adicionarMeses, hoje, isFimDeSemana } from "/app/lib/date.utils";
import { formatarMoeda, formatarMoedaSimples, formatarTelefone } from "/app/lib/format.utils";
import { calcularVencimentoParcela } from "/app/domain/billing-cycle";
import { gerarParcelas, podeEditarCobranca } from "/app/domain/parcel.rules";
import { proximoStatus } from "/app/domain/status.rules";
import { isAtrasada, diasAtraso } from "/app/domain/overdue.rules";
import type { CobrancaInput } from "/app/types/charge.types";
import type { Parcela } from "/app/types/parcel.types";

let pass = 0;
let fail = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { pass++; } else { fail++; console.error(`FALHOU: ${msg}`); }
}

console.log("=== REGRESSAO SPRINTS 1-3 ===\n");

// --- math.utils ---
console.log("--- math.utils ---");
assert(dividirValor(100, 3).valorBase === 33.33, "R1: 100/3 base=33.33");
assert(dividirValor(100, 3).valorUltima === 33.34, "R2: 100/3 ultima=33.34");
assert(dividirValor(300, 3).valorBase === 100, "R3: 300/3 base=100");
assert(dividirValor(300, 3).valorUltima === 100, "R4: 300/3 ultima=100");

// --- date.utils ---
console.log("--- date.utils ---");
assert(adicionarMeses("2024-01-15", 1) === "2024-02-15", "R5: +1 mes jan->fev");
assert(adicionarMeses("2024-01-31", 1) === "2024-02-29", "R6: 31/jan -> 29/fev (leap)");
assert(adicionarMeses("2024-01-15", 12) === "2025-01-15", "R7: +12 meses");

// --- format.utils ---
console.log("--- format.utils ---");
assert(formatarMoeda(100).includes("100"), "R8: formatarMoeda(100) tem 100");
assert(formatarMoedaSimples(100) === "100,00", "R9: formatarMoedaSimples(100)=100,00");
assert(formatarTelefone("11987654321").includes("98765"), "R10: formatarTelefone");

// --- billing-cycle ---
console.log("--- billing-cycle ---");
assert(calcularVencimentoParcela("2024-01-15", 10, 1) === "2024-01-15", "R11: parcela 1 = primeiro");
assert(calcularVencimentoParcela("2024-01-15", 10, 2) === "2024-02-10", "R12: parcela 2 -> dia 10 fev");
assert(calcularVencimentoParcela("2024-01-30", 30, 2) === "2024-02-29", "R13: 30/jan -> 29/fev (leap)");

// --- parcel.rules ---
console.log("--- parcel.rules ---");
{
  const input: CobrancaInput = {
    clienteId: "cli1", produtoServicoId: null, nomeProdutoServico: "Teste",
    valor: 300, formaPagamento: "pix", quantidadeParcelas: 3,
    primeiroVencimento: "2024-01-15", diaVencimentoFixo: 15
  };
  const parcelas = gerarParcelas(input);
  assert(parcelas.length === 3, "R14: 3 parcelas geradas");
  assert(parcelas[0].status === "pendente", "R15: status=pendente");
  assert(parcelas[2].valor === 100, "R16: valor 300/3 = 100");

  // podeEditarCobranca
  const todasPendentes: Parcela[] = parcelas.map((p, i) => ({
    ...p, id: `p${i}`, cobrancaId: "c1", valorPago: null,
    dataPagamento: null, dataCobrancaEnviada: null, arquivada: false,
    created_date: "", updated_date: ""
  }));
  assert(podeEditarCobranca(todasPendentes) === true, "R17: todas pendentes -> pode editar");

  const umaCobrada = [...todasPendentes];
  umaCobrada[0] = { ...umaCobrada[0], status: "cobrado" };
  assert(podeEditarCobranca(umaCobrada) === false, "R18: uma cobrada -> nao pode editar");
}

// --- status.rules ---
console.log("--- status.rules ---");
{
  const parcela: Parcela = {
    id: "p1", cobrancaId: "c1", clienteId: "cli1", numeroParcela: 1,
    valor: 100, valorPago: null, dataVencimento: "2024-01-15",
    status: "pendente", dataPagamento: null, dataCobrancaEnviada: null,
    arquivada: false, created_date: "", updated_date: ""
  };
  const result = proximoStatus("pendente", "confirmar_envio", parcela, undefined, "2024-01-20");
  assert(result.novoStatus === "cobrado", "R19: confirmar_envio -> cobrado");
}

// --- overdue.rules ---
console.log("--- overdue.rules ---");
{
  const parcela: Parcela = {
    id: "p1", cobrancaId: "c1", clienteId: "cli1", numeroParcela: 1,
    valor: 100, valorPago: null, dataVencimento: "2024-01-15",
    status: "pendente", dataPagamento: null, dataCobrancaEnviada: null,
    arquivada: false, created_date: "", updated_date: ""
  };
  assert(isAtrasada(parcela, "2024-01-20") === true, "R20: vencida 5 dias -> atrasada");
  assert(isAtrasada(parcela, "2024-01-15") === false, "R21: vence hoje -> nao atrasada");
  assert(diasAtraso(parcela, "2024-01-20") === 5, "R22: 5 dias de atraso");
}

console.log("\n=== RESULTADO REGRESSAO ===");
console.log(`Pass: ${pass}, Fail: ${fail}`);
if (fail === 0) { console.log("=== REGRESSAO PASSOU! ==="); } else { console.log("=== FALHAS NA REGRESSAO ==="); process.exit(1); }
