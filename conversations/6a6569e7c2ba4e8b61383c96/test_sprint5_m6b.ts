// test_sprint5_m6b.ts — Testes unitários e de runtime para M6b (useDashboard + useParcelActions)

import { JSDOM } from "jsdom";
import { readFileSync } from "fs";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", { url: "http://localhost", pretendToBeVisual: true });
(globalThis as any).document = dom.window.document;
(globalThis as any).window = dom.window;
(globalThis as any).navigator = dom.window.navigator;
(globalThis as any).HTMLElement = dom.window.HTMLElement;
(globalThis as any).Element = dom.window.Element;
(globalThis as any).Node = dom.window.Node;

let pass = 0, fail = 0;
function assert(cond: boolean, msg: string) { if (cond) { pass++; } else { fail++; console.error(`FALHOU: ${msg}`); } }

async function flush(ms = 50) {
  const { act } = await import("@testing-library/react");
  await act(async () => { await new Promise(r => setTimeout(r, ms)); });
}

async function main() {
  const { renderHook, act } = await import("@testing-library/react");
  const entities = await import("/app/api/entities");

  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  const ontem = new Date(Date.now() - 86400000).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  const amanha = new Date(Date.now() + 86400000).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  const doisDias = new Date(Date.now() + 2 * 86400000).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  const tresDias = new Date(Date.now() + 3 * 86400000).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  const cincoDias = new Date(Date.now() - 5 * 86400000).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });

  const mockClientes = [
    { id: "c1", nome: "Maria Silva", telefone: "5511987654321", observacoes: "", ativo: true, created_date: "", updated_date: "" },
    { id: "c2", nome: "João Pereira", telefone: "5511912345678", observacoes: "", ativo: true, created_date: "", updated_date: "" },
    { id: "c3", nome: "Ana Costa", telefone: "5511999998888", observacoes: "", ativo: false, created_date: "", updated_date: "" },
  ];

  const mockParcelas = [
    { id: "p1", cobrancaId: "cb1", clienteId: "c1", numeroParcela: 1, valor: 200, valorPago: null, dataVencimento: cincoDias, status: "pendente", dataPagamento: null, dataCobrancaEnviada: null, arquivada: false, created_date: "", updated_date: "" },
    { id: "p2", cobrancaId: "cb2", clienteId: "c2", numeroParcela: 1, valor: 150, valorPago: null, dataVencimento: ontem, status: "pendente", dataPagamento: null, dataCobrancaEnviada: null, arquivada: false, created_date: "", updated_date: "" },
    { id: "p3", cobrancaId: "cb3", clienteId: "c1", numeroParcela: 1, valor: 100, valorPago: null, dataVencimento: hoje, status: "pendente", dataPagamento: null, dataCobrancaEnviada: null, arquivada: false, created_date: "", updated_date: "" },
    { id: "p4", cobrancaId: "cb4", clienteId: "c2", numeroParcela: 1, valor: 300, valorPago: null, dataVencimento: hoje, status: "cobrado", dataPagamento: null, dataCobrancaEnviada: hoje, arquivada: false, created_date: "", updated_date: "" },
    { id: "p5", cobrancaId: "cb5", clienteId: "c1", numeroParcela: 1, valor: 50, valorPago: 50, dataVencimento: ontem, status: "pago", dataPagamento: ontem, dataCobrancaEnviada: null, arquivada: false, created_date: "", updated_date: "" },
    { id: "p6", cobrancaId: "cb6", clienteId: "c1", numeroParcela: 1, valor: 400, valorPago: null, dataVencimento: hoje, status: "arquivado", dataPagamento: null, dataCobrancaEnviada: null, arquivada: true, created_date: "", updated_date: "" },
    { id: "p7", cobrancaId: "cb7", clienteId: "c3", numeroParcela: 1, valor: 500, valorPago: null, dataVencimento: hoje, status: "pendente", dataPagamento: null, dataCobrancaEnviada: null, arquivada: false, created_date: "", updated_date: "" },
    { id: "p8", cobrancaId: "cb8", clienteId: "c1", numeroParcela: 1, valor: 250, valorPago: null, dataVencimento: amanha, status: "pendente", dataPagamento: null, dataCobrancaEnviada: null, arquivada: false, created_date: "", updated_date: "" },
    { id: "p9", cobrancaId: "cb9", clienteId: "c2", numeroParcela: 1, valor: 350, valorPago: null, dataVencimento: doisDias, status: "pendente", dataPagamento: null, dataCobrancaEnviada: null, arquivada: false, created_date: "", updated_date: "" },
    { id: "p10", cobrancaId: "cb10", clienteId: "c1", numeroParcela: 1, valor: 180, valorPago: null, dataVencimento: tresDias, status: "pendente", dataPagamento: null, dataCobrancaEnviada: null, arquivada: false, created_date: "", updated_date: "" },
  ];

  let mockState: any = { parcelas: [...mockParcelas], clientes: [...mockClientes], updates: {} };
  function resetMockState() { mockState = { parcelas: [...mockParcelas], clientes: [...mockClientes], updates: {} }; }

  (entities as any).Parcela.list = async () => mockState.parcelas;
  (entities as any).Parcela.get = async (id: string) => mockState.parcelas.find((p: any) => p.id === id);
  (entities as any).Parcela.update = async (id: string, data: any) => {
    mockState.updates[id] = data;
    const idx = mockState.parcelas.findIndex((p: any) => p.id === id);
    if (idx >= 0) mockState.parcelas[idx] = { ...mockState.parcelas[idx], ...data };
    return mockState.parcelas[idx];
  };
  (entities as any).Cliente.list = async () => mockState.clientes;

  const { useDashboard } = await import("/app/hooks/useDashboard");
  const { useParcelActions } = await import("/app/hooks/useParcelActions");
  const { eventBus } = await import("/app/lib/event-bus");

  console.log("=== TESTES M6b — useDashboard ===\n");

  // 1-3: Montagem + loading
  { resetMockState(); const { result, unmount } = renderHook(() => useDashboard());
    assert(result.current.loading === true, "1: loading=true inicial");
    await flush();
    assert(result.current.loading === false, "2: loading=false apos carregar");
    assert(result.current.error === null, "3: error=null");
    unmount(); }

  // 4-6: parcelasAtrasadas
  { resetMockState(); const { result, unmount } = renderHook(() => useDashboard());
    await flush();
    assert(result.current.parcelasAtrasadas.length === 2, "4: 2 atrasadas (exclui pago, inativo, arquivado)");
    assert(result.current.parcelasAtrasadas[0].id === "p1", "5: vermelha (5 dias) primeiro");
    assert(result.current.parcelasAtrasadas[1].id === "p2", "6: laranja (1 dia) segundo");
    unmount(); }

  // 7-8: parcelasHoje
  { resetMockState(); const { result, unmount } = renderHook(() => useDashboard());
    await flush();
    assert(result.current.parcelasHoje.length === 2, "7: 2 parcelas de hoje (pendente+cobrado)");
    assert(result.current.parcelasHoje[0].id === "p4", "8: cobrado antes de pendente");
    unmount(); }

  // 9-10: proximosVencimentos
  { resetMockState(); const { result, unmount } = renderHook(() => useDashboard());
    await flush();
    assert(result.current.proximosVencimentos.length === 3, "9: 3 proximos vencimentos");
    assert(result.current.proximosVencimentos[0].total === 1, "10a: amanha 1 parcela");
    assert(result.current.proximosVencimentos[0].valor === 250, "10b: amanha valor=250");
    assert(result.current.proximosVencimentos[1].valor === 350, "10c: 2 dias valor=350");
    unmount(); }

  // 11: contadores
  { resetMockState(); const { result, unmount } = renderHook(() => useDashboard());
    await flush();
    assert(result.current.contadores.total === 4, "11a: total=4 (2 atrasadas + 2 hoje)");
    assert(result.current.contadores.valor === 750, "11b: valor=750");
    assert(result.current.contadores.atrasadas === 2, "11c: atrasadas=2");
    unmount(); }

  // 12: sem inativos
  { resetMockState(); const { result, unmount } = renderHook(() => useDashboard());
    await flush();
    const todas = [...result.current.parcelasHoje, ...result.current.parcelasAtrasadas];
    assert(!todas.some(p => p.clienteId === "c3"), "12: inativos excluidos");
    unmount(); }

  // 13: sem arquivadas
  { resetMockState(); const { result, unmount } = renderHook(() => useDashboard());
    await flush();
    const todas = [...result.current.parcelasHoje, ...result.current.parcelasAtrasadas];
    assert(!todas.some(p => p.id === "p6"), "13: arquivadas excluidas");
    unmount(); }

  // 14: sem pagas
  { resetMockState(); const { result, unmount } = renderHook(() => useDashboard());
    await flush();
    const todas = [...result.current.parcelasHoje, ...result.current.parcelasAtrasadas];
    assert(!todas.some(p => p.id === "p5"), "14: pagas excluidas");
    unmount(); }

  // 15: invalidacao parcel:paid
  { resetMockState(); const { result, unmount } = renderHook(() => useDashboard());
    await flush();
    assert(result.current.contadores.total === 4, "15a: total=4");
    mockState.parcelas.find((p: any) => p.id === "p3").status = "pago";
    await act(async () => { eventBus.emit("parcel:paid"); });
    await flush();
    assert(result.current.contadores.total === 3, "15b: apos parcel:paid total=3");
    mockState.parcelas.find((p: any) => p.id === "p3").status = "pendente";
    unmount(); }

  // 16: invalidacao client:inactivated
  { resetMockState(); const { result, unmount } = renderHook(() => useDashboard());
    await flush();
    assert(result.current.contadores.total === 4, "16a: total=4");
    mockState.clientes.find((c: any) => c.id === "c2").ativo = false;
    await act(async () => { eventBus.emit("client:inactivated"); });
    await flush();
    assert(result.current.contadores.total === 2, "16b: apos inativar c2 total=2");
    mockState.clientes.find((c: any) => c.id === "c2").ativo = true;
    unmount(); }

  console.log("\n=== TESTES M6b — useParcelActions ===\n");

  // 17-19: marcarPago + undo
  { resetMockState(); const { result, unmount } = renderHook(() => useParcelActions());
    const parcela = mockState.parcelas.find((p: any) => p.id === "p3");
    assert(parcela.status === "pendente", "17: p3 pendente");
    let undoFn: any = null;
    await act(async () => { undoFn = await result.current.marcarPago(parcela); });
    assert(mockState.updates["p3"]?.status === "pago", "18: status=pago");
    assert(typeof undoFn === "function", "19: retorna undo");
    await act(async () => { await undoFn(); });
    assert(mockState.updates["p3"]?.status === "pendente", "19b: undo restaura pendente");
    unmount(); }

  // 20: marcarParcial total
  { resetMockState(); const { result, unmount } = renderHook(() => useParcelActions());
    const parcela = mockState.parcelas.find((p: any) => p.id === "p3");
    await act(async () => { await result.current.marcarParcial(parcela, 100); });
    assert(mockState.updates["p3"]?.status === "pago", "20: 100 em 100 -> pago");
    unmount(); }

  // 21: marcarParcial parcial
  { resetMockState(); const { result, unmount } = renderHook(() => useParcelActions());
    const parcela = mockState.parcelas.find((p: any) => p.id === "p1");
    await act(async () => { await result.current.marcarParcial(parcela, 100); });
    assert(mockState.updates["p1"]?.status === "pago_parcial", "21: 100 em 200 -> pago_parcial");
    assert(mockState.updates["p1"]?.valorPago === 100, "21b: valorPago=100");
    unmount(); }

  // 22: confirmarEnvio
  { resetMockState(); const { result, unmount } = renderHook(() => useParcelActions());
    await act(async () => { await result.current.confirmarEnvio("p3"); });
    assert(mockState.updates["p3"]?.status === "cobrado", "22: status=cobrado");
    unmount(); }

  // 23: arquivar
  { resetMockState(); const { result, unmount } = renderHook(() => useParcelActions());
    await act(async () => { await result.current.arquivar("p3"); });
    assert(mockState.updates["p3"]?.arquivada === true, "23: arquivada=true");
    assert(mockState.updates["p3"]?.status === "arquivado", "23b: status=arquivado");
    unmount(); }

  // 24: desfazerPagamento
  { resetMockState(); const { result, unmount } = renderHook(() => useParcelActions());
    const estado = { status: "cobrado" as const, valorPago: null as any, dataPagamento: null as any, dataCobrancaEnviada: hoje as any };
    await act(async () => { await result.current.desfazerPagamento("p3", estado); });
    assert(mockState.updates["p3"]?.status === "cobrado", "24: desfazerPagamento restaura cobrado");
    unmount(); }

  // 25: sem setInterval
  {
    const dash = readFileSync("/app/hooks/useDashboard.ts", "utf-8");
    const act2 = readFileSync("/app/hooks/useParcelActions.ts", "utf-8");
    assert(!dash.includes("setInterval("), "25a: useDashboard sem setInterval");
    assert(!act2.includes("setInterval("), "25b: useParcelActions sem setInterval");
  }

  console.log("\n=== RESULTADO M6b ===");
  console.log(`Pass: ${pass}, Fail: ${fail}`);
  if (fail === 0) { console.log("=== TODOS OS TESTES M6b PASSARAM! ==="); } else { console.log("=== FALHAS DETECTADAS ==="); process.exit(1); }
}

main().catch(err => { console.error("ERRO FATAL:", err); process.exit(1); });
