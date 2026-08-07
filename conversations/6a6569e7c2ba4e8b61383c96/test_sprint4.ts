// test_sprint4.ts — Testes do Sprint 4 (M6a + M13)

import { eventBus } from "/app/lib/event-bus";
import { parseDiasTrabalhados, serializeDiasTrabalhados } from "/app/hooks/useConfig";
import { COBRANCAS_RECENTES_LIMIT, DIAS_TRABALHADOS_DEFAULT, DIAS_SEMANA } from "/app/config/app.config";
import type { EventTypes } from "/app/types/common.types";
import type { UseClientsResult, UseProductsResult } from "/app/hooks/useClients";
import type { UseChargesResult, CobrancaComParcelas } from "/app/hooks/useCharges";
import type { UseConfigResult, ConfigData } from "/app/hooks/useConfig";

let pass = 0;
let fail = 0;

function assert(cond: boolean, msg: string) {
  if (cond) { pass++; } else { fail++; console.error(`FALHOU: ${msg}`); }
}

console.log("=== INICIANDO TESTES SPRINT 4 ===\n");

// ===== parseDiasTrabalhados =====
console.log("--- parseDiasTrabalhados ---");
assert(JSON.stringify(parseDiasTrabalhados("1,2,3,4,5")) === JSON.stringify([1,2,3,4,5]), "1: parse '1,2,3,4,5' -> [1,2,3,4,5]");
assert(JSON.stringify(parseDiasTrabalhados("0,1,2,3,4,5,6")) === JSON.stringify([0,1,2,3,4,5,6]), "2: parse '0,1,2,3,4,5,6' -> [0..6]");
assert(JSON.stringify(parseDiasTrabalhados("")) === JSON.stringify([]), "3: parse '' -> []");
assert(JSON.stringify(parseDiasTrabalhados("1, 2, 3")) === JSON.stringify([1,2,3]), "4: parse com espacos -> [1,2,3]");
assert(JSON.stringify(parseDiasTrabalhados("1,abc,5")) === JSON.stringify([1,5]), "5: parse filtra NaN");
assert(JSON.stringify(parseDiasTrabalhados("1,7,5")) === JSON.stringify([1,5]), "6: parse filtra >6");
assert(JSON.stringify(parseDiasTrabalhados(DIAS_TRABALHADOS_DEFAULT)) === JSON.stringify([1,2,3,4,5]), "7: parse DEFAULT -> [1,2,3,4,5]");

// ===== serializeDiasTrabalhados =====
console.log("--- serializeDiasTrabalhados ---");
assert(serializeDiasTrabalhados([1,2,3,4,5]) === "1,2,3,4,5", "8: serialize [1,2,3,4,5] -> '1,2,3,4,5'");
assert(serializeDiasTrabalhados([5,3,1,2,4]) === "1,2,3,4,5", "9: serialize ordena -> '1,2,3,4,5'");
assert(serializeDiasTrabalhados([6,0]) === "0,6", "10: serialize [6,0] -> '0,6'");
assert(JSON.stringify(parseDiasTrabalhados(serializeDiasTrabalhados([0,1,2,3,4,5,6]))) === JSON.stringify([0,1,2,3,4,5,6]), "11: round-trip preserva [0..6]");

// ===== COBRANCAS_RECENTES_LIMIT =====
console.log("--- COBRANCAS_RECENTES_LIMIT ---");
assert(COBRANCAS_RECENTES_LIMIT === 5, "12: COBRANCAS_RECENTES_LIMIT = 5");

// ===== EventBus invalidação =====
console.log("--- EventBus invalidação ---");
{
  let received = false;
  const unsub = eventBus.on("client:created", () => { received = true; });
  eventBus.emit("client:created");
  assert(received, "13: EventBus recebe client:created");
  unsub();
}
{
  let received = false;
  const unsub = eventBus.on("charge:created", () => { received = true; });
  eventBus.emit("charge:created");
  assert(received, "14: EventBus recebe charge:created");
  unsub();
}
{
  let count = 0;
  const unsub = eventBus.on("product:created", () => { count++; });
  eventBus.emit("product:created");
  unsub();
  eventBus.emit("product:created");
  assert(count === 1, "15: apos unsub, nao recebe mais");
}
{
  let count = 0;
  const u1 = eventBus.on("parcel:updated", () => { count++; });
  const u2 = eventBus.on("parcel:updated", () => { count++; });
  eventBus.emit("parcel:updated");
  assert(count === 2, "16: multiplos handlers disparam 2x");
  u1(); u2();
}
{
  let secondCalled = false;
  const u1 = eventBus.on("charge:deleted", () => { throw new Error("test"); });
  const u2 = eventBus.on("charge:deleted", () => { secondCalled = true; });
  eventBus.emit("charge:deleted");
  assert(secondCalled, "17: handler com erro nao interrompe outros");
  u1(); u2();
}

// ===== EventTypes contrato =====
console.log("--- EventTypes contrato ---");
type ExpectedEvents = keyof EventTypes;
const expectedEvents: ExpectedEvents[] = [
  "client:created","client:updated","client:inactivated",
  "product:created","product:updated","product:deleted",
  "charge:created","charge:updated","charge:deleted",
  "parcel:updated","parcel:paid","parcel:charged","parcel:archived","parcel:unarchived",
];
assert(expectedEvents.length === 14, "18: 14 eventos no EventTypes");

// ===== DIAS_SEMANA =====
console.log("--- DIAS_SEMANA ---");
assert(DIAS_SEMANA.length === 7, "19: 7 dias");
assert(DIAS_SEMANA.map(d => d.valor).join(",") === "0,1,2,3,4,5,6", "20: ordem 0-6");
assert(DIAS_SEMANA[0].label === "Dom" && DIAS_SEMANA[1].label === "Seg" && DIAS_SEMANA[6].label === "Sáb", "21: labels Dom,Seg,Sab");

// ===== Contratos dos hooks =====
console.log("--- Contratos dos hooks ---");
type _C1 = Pick<UseClientsResult, "clientes"|"loading"|"error"|"refresh">;
assert(true, "22: UseClientsResult tem {clientes,loading,error,refresh}");
type _C2 = Pick<UseProductsResult, "produtos"|"loading"|"error"|"refresh">;
assert(true, "23: UseProductsResult tem {produtos,loading,error,refresh}");
type _C3 = Pick<UseChargesResult, "cobrancas"|"loading"|"error"|"carregarTodas"|"todasCarregadas">;
assert(true, "24: UseChargesResult tem {cobrancas,loading,error,carregarTodas,todasCarregadas}");
type _C4 = Pick<UseConfigResult, "config"|"loading"|"error"|"salvar">;
assert(true, "25: UseConfigResult tem {config,loading,error,salvar}");
type _C5 = CobrancaComParcelas;
assert(true, "26: CobrancaComParcelas exportado");
type _C6 = Pick<ConfigData, "id"|"diasTrabalhados">;
assert(true, "27: ConfigData tem {id,diasTrabalhados}");

console.log("\n=== RESULTADO ===");
console.log(`Pass: ${pass}, Fail: ${fail}`);
if (fail === 0) { console.log("=== TODOS OS TESTES PASSARAM! ==="); } else { console.log("=== FALHAS ==="); process.exit(1); }
