// test_hooks_runtime.ts — Validacao runtime dos 4 hooks em ambiente React minimo
// Usa jsdom + @testing-library/react renderHook com act flush

import { JSDOM } from "jsdom";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", { url: "http://localhost", pretendToBeVisual: true });
(globalThis as any).document = dom.window.document;
(globalThis as any).window = dom.window;
(globalThis as any).navigator = dom.window.navigator;
(globalThis as any).HTMLElement = dom.window.HTMLElement;
(globalThis as any).Element = dom.window.Element;
(globalThis as any).Node = dom.window.Node;

// Helper: flush pending state updates
async function flush(ms = 50) {
  const { act } = await import("@testing-library/react");
  await act(async () => { await new Promise(r => setTimeout(r, ms)); });
}

async function main() {
  const { renderHook, act, waitFor } = await import("@testing-library/react");
  const entities = await import("/app/api/entities");

  // === MOCK DATA ===
  const mockClientes = [
    { id: "c1", nome: "Maria Silva", telefone: "11987654321", observacoes: "", ativo: true, created_date: "", updated_date: "" },
    { id: "c2", nome: "João Pereira", telefone: "11912345678", observacoes: "", ativo: true, created_date: "", updated_date: "" },
    { id: "c3", nome: "Ana Costa", telefone: "11999998888", observacoes: "VIP", ativo: false, created_date: "", updated_date: "" },
  ];
  const mockProdutos = [
    { id: "p1", nome: "Manutenção", valorPadrao: 150, vezesUsado: 8, created_date: "", updated_date: "" },
    { id: "p2", nome: "Consultoria", valorPadrao: 500, vezesUsado: 5, created_date: "", updated_date: "" },
    { id: "p3", nome: "Hospedagem", valorPadrao: 80, vezesUsado: 3, created_date: "", updated_date: "" },
  ];
  const mockCobrancas = [
    { id: "cb1", clienteId: "c1", produtoServicoId: "p1", nomeProdutoServico: "Manutenção", valor: 150, formaPagamento: "pix", quantidadeParcelas: 1, primeiroVencimento: "2024-01-15", diaVencimentoFixo: 15, pixUtilizado: "", observacoes: "", created_date: "", updated_date: "" },
    { id: "cb2", clienteId: "c1", produtoServicoId: "p2", nomeProdutoServico: "Consultoria", valor: 1500, formaPagamento: "cartao", quantidadeParcelas: 3, primeiroVencimento: "2024-02-01", diaVencimentoFixo: 1, pixUtilizado: "", observacoes: "", created_date: "", updated_date: "" },
  ];
  const mockParcelas = [
    { id: "par1", cobrancaId: "cb1", clienteId: "c1", numeroParcela: 1, valor: 150, valorPago: null, dataVencimento: "2024-01-15", status: "pendente", dataPagamento: null, dataCobrancaEnviada: null, arquivada: false, created_date: "", updated_date: "" },
    { id: "par2", cobrancaId: "cb2", clienteId: "c1", numeroParcela: 1, valor: 500, valorPago: null, dataVencimento: "2024-02-01", status: "pendente", dataPagamento: null, dataCobrancaEnviada: null, arquivada: false, created_date: "", updated_date: "" },
    { id: "par3", cobrancaId: "cb2", clienteId: "c1", numeroParcela: 2, valor: 500, valorPago: null, dataVencimento: "2024-03-01", status: "pendente", dataPagamento: null, dataCobrancaEnviada: null, arquivada: false, created_date: "", updated_date: "" },
    { id: "par4", cobrancaId: "cb2", clienteId: "c1", numeroParcela: 3, valor: 500, valorPago: null, dataVencimento: "2024-04-01", status: "pendente", dataPagamento: null, dataCobrancaEnviada: null, arquivada: false, created_date: "", updated_date: "" },
  ];

  let mockState = {
    clientesError: false, produtosError: false, cobrancasError: false,
    configExists: true, configDias: "1,2,3,4,5",
    configUpdateCalled: false, configCreateCalled: false,
  };
  function resetMockState() {
    mockState = { clientesError: false, produtosError: false, cobrancasError: false, configExists: true, configDias: "1,2,3,4,5", configUpdateCalled: false, configCreateCalled: false };
  }

  // Patch entities (mesma referencia usada pelos hooks)
  (entities as any).Cliente.list = async () => { if (mockState.clientesError) throw new Error("API offline"); return mockClientes; };
  (entities as any).Cliente.filter = async () => mockClientes;
  (entities as any).ProdutoServico.list = async () => { if (mockState.produtosError) throw new Error("API offline"); return [...mockProdutos].sort((a,b) => b.vezesUsado - a.vezesUsado); };
  (entities as any).ProdutoServico.filter = async () => mockProdutos;
  (entities as any).Cobranca.filter = async (p: any) => { if (mockState.cobrancasError) throw new Error("API offline"); return mockCobrancas.filter(c => c.clienteId === p.clienteId); };
  (entities as any).Parcela.filter = async (p: any) => mockParcelas.filter(par => par.cobrancaId === p.cobrancaId);
  (entities as any).Configuracao.list = async () => { if (mockState.configExists) return [{ id: "cfg1", diasTrabalhados: mockState.configDias, created_date: "", updated_date: "" }]; return []; };
  (entities as any).Configuracao.create = async (d: any) => { mockState.configCreateCalled = true; return { id: "cfg_new", diasTrabalhados: d.diasTrabalhados, created_date: "", updated_date: "" }; };
  (entities as any).Configuracao.update = async (id: string, d: any) => { mockState.configUpdateCalled = true; mockState.configDias = d.diasTrabalhados; return { id, diasTrabalhados: d.diasTrabalhados, created_date: "", updated_date: "" }; };

  // Import hooks (apos patch)
  const { useClients } = await import("/app/hooks/useClients");
  const { useProducts } = await import("/app/hooks/useProducts");
  const { useCharges } = await import("/app/hooks/useCharges");
  const { useConfig, parseDiasTrabalhados, serializeDiasTrabalhados } = await import("/app/hooks/useConfig");
  const { eventBus } = await import("/app/lib/event-bus");

  let pass = 0, fail = 0;
  function assert(cond: boolean, msg: string) { if (cond) { pass++; } else { fail++; console.error(`FALHOU: ${msg}`); } }

  console.log("=== TESTES RUNTIME DOS HOOKS ===\n");

  // ===== useClients =====
  console.log("--- useClients ---");

  // 1-5: Montagem + carregamento inicial
  {
    resetMockState();
    const { result, unmount } = renderHook(() => useClients());
    assert(result.current.loading === true, "1: useClients inicia loading=true");
    await flush();
    assert(result.current.loading === false, "2: loading=false apos carregar");
    assert(result.current.clientes.length === 3, "3: carrega 3 clientes");
    assert(result.current.error === null, "4: error=null");
    assert(result.current.clientes[0].nome === "Maria Silva", "5: primeiro = Maria Silva");
    unmount();
  }

  // 6-8: Comportamento de erro
  {
    resetMockState(); mockState.clientesError = true;
    const { result, unmount } = renderHook(() => useClients());
    await flush();
    assert(result.current.error !== null, "6: error preenchido quando API falha");
    assert(result.current.loading === false, "7: loading=false apos erro");
    assert(result.current.clientes.length === 0, "8: clientes=[] apos erro (sem cache)");
    unmount();
  }

  // 9: Invalidacao por EventBus (client:created)
  {
    resetMockState();
    const { result, unmount } = renderHook(() => useClients());
    await flush();
    assert(result.current.clientes.length === 3, "9a: carregou 3 clientes");
    mockClientes.push({ id: "c4", nome: "Carlos Novo", telefone: "11000000000", observacoes: "", ativo: true, created_date: "", updated_date: "" });
    await act(async () => { eventBus.emit("client:created"); });
    await flush();
    assert(result.current.clientes.length === 4, "9b: refaz busca apos client:created (4)");
    mockClientes.pop();
    unmount();
  }

  // ===== useProducts =====
  console.log("--- useProducts ---");

  // 10-16: Montagem + ordenacao
  {
    resetMockState();
    const { result, unmount } = renderHook(() => useProducts());
    assert(result.current.loading === true, "10: useProducts inicia loading=true");
    await flush();
    assert(result.current.produtos.length === 3, "11: carrega 3 produtos");
    assert(result.current.loading === false, "12: loading=false");
    assert(result.current.error === null, "13: error=null");
    assert(result.current.produtos[0].nome === "Manutenção", "14: primeiro = Manutenção (8)");
    assert(result.current.produtos[1].nome === "Consultoria", "15: segundo = Consultoria (5)");
    assert(result.current.produtos[2].nome === "Hospedagem", "16: terceiro = Hospedagem (3)");
    unmount();
  }

  // 17-18: Erro
  {
    resetMockState(); mockState.produtosError = true;
    const { result, unmount } = renderHook(() => useProducts());
    await flush();
    assert(result.current.error !== null, "17: error quando API falha");
    assert(result.current.loading === false, "18: loading=false apos erro");
    unmount();
  }

  // 19: Invalidacao por EventBus (product:created)
  {
    resetMockState();
    const { result, unmount } = renderHook(() => useProducts());
    await flush();
    assert(result.current.produtos.length === 3, "19a: carregou 3");
    mockProdutos.push({ id: "p4", nome: "Novo", valorPadrao: 100, vezesUsado: 10, created_date: "", updated_date: "" });
    await act(async () => { eventBus.emit("product:created"); });
    await flush();
    assert(result.current.produtos.length === 4, "19b: refaz busca apos product:created (4)");
    assert(result.current.produtos[0].nome === "Novo", "19c: Novo primeiro (vezesUsado=10)");
    mockProdutos.pop();
    unmount();
  }

  // ===== useCharges =====
  console.log("--- useCharges ---");

  // 20-26: Montagem + dados + parcelas
  {
    resetMockState();
    const { result, unmount } = renderHook(() => useCharges("c1"));
    assert(result.current.loading === true, "20: useCharges inicia loading=true");
    await flush(100);
    assert(result.current.cobrancas.length === 2, "21: carrega 2 cobrancas para c1");
    assert(result.current.loading === false, "22: loading=false");
    assert(result.current.error === null, "23: error=null");
    assert(result.current.cobrancas[0].parcelas.length === 1, "24: cb1 tem 1 parcela");
    assert(result.current.cobrancas[1].parcelas.length === 3, "25: cb2 tem 3 parcelas");
    assert(result.current.todasCarregadas === false, "26: todasCarregadas=false");
    unmount();
  }

  // 27-28: clienteId null
  {
    resetMockState();
    const { result, unmount } = renderHook(() => useCharges(null));
    await flush();
    assert(result.current.cobrancas.length === 0, "27: null -> 0 cobrancas");
    assert(result.current.loading === false, "28: null -> loading=false");
    unmount();
  }

  // 29-32: Limite + carregarTodas
  {
    resetMockState();
    const origCob = [...mockCobrancas];
    const origPar = [...mockParcelas];
    for (let i = 0; i < 6; i++) {
      const cbId = `cb_extra_${i}`;
      mockCobrancas.push({ id: cbId, clienteId: "c1", produtoServicoId: "p1", nomeProdutoServico: "Extra", valor: 100, formaPagamento: "pix", quantidadeParcelas: 1, primeiroVencimento: "2024-01-15", diaVencimentoFixo: 15, pixUtilizado: "", observacoes: "", created_date: "", updated_date: "" });
      mockParcelas.push({ id: `par_extra_${i}`, cobrancaId: cbId, clienteId: "c1", numeroParcela: 1, valor: 100, valorPago: null, dataVencimento: "2024-01-15", status: "pendente", dataPagamento: null, dataCobrancaEnviada: null, arquivada: false, created_date: "", updated_date: "" });
    }
    const { result, unmount } = renderHook(() => useCharges("c1"));
    await flush(100);
    assert(result.current.cobrancas.length === 5, "29: limita a 5 (COBRANCAS_RECENTES_LIMIT)");
    assert(result.current.todasCarregadas === false, "30: todasCarregadas=false");
    await act(async () => { await result.current.carregarTodas(); });
    await flush(100);
    assert(result.current.cobrancas.length === 8, "31: carregarTodas -> 8 cobrancas");
    assert(result.current.todasCarregadas === true, "32: todasCarregadas=true");
    mockCobrancas.length = 0; mockCobrancas.push(...origCob);
    mockParcelas.length = 0; mockParcelas.push(...origPar);
    unmount();
  }

  // 33-34: Erro
  {
    resetMockState(); mockState.cobrancasError = true;
    const { result, unmount } = renderHook(() => useCharges("c1"));
    await flush(100);
    assert(result.current.error !== null, "33: error quando API falha");
    assert(result.current.loading === false, "34: loading=false apos erro");
    unmount();
  }

  // ===== useConfig =====
  console.log("--- useConfig ---");

  // 35-40: Montagem + carregamento
  {
    resetMockState();
    const { result, unmount } = renderHook(() => useConfig());
    assert(result.current.loading === true, "35: useConfig inicia loading=true");
    await flush();
    assert(result.current.config !== null, "36: carrega config");
    assert(result.current.loading === false, "37: loading=false");
    assert(result.current.error === null, "38: error=null");
    assert(result.current.config!.id === "cfg1", "39: config.id = cfg1");
    assert(JSON.stringify(result.current.config!.diasTrabalhados) === JSON.stringify([1,2,3,4,5]), "40: dias = [1,2,3,4,5]");
    unmount();
  }

  // 41-43: Criacao de defaults
  {
    resetMockState(); mockState.configExists = false;
    const { result, unmount } = renderHook(() => useConfig());
    await flush();
    assert(result.current.config !== null, "41: cria config quando vazio");
    assert(mockState.configCreateCalled === true, "42: Configuracao.create chamada");
    assert(result.current.config!.diasTrabalhados.length === 5, "43: defaults com 5 dias");
    unmount();
  }

  // 44-46: salvar()
  {
    resetMockState();
    const { result, unmount } = renderHook(() => useConfig());
    await flush();
    assert(result.current.config !== null, "44a: config carregada");
    let salvou = false;
    await act(async () => { salvou = await result.current.salvar([1,2,3,4,5,6]); });
    assert(salvou === true, "44b: salvar() retorna true");
    assert(mockState.configUpdateCalled === true, "45: Configuracao.update chamada");
    assert(JSON.stringify(result.current.config!.diasTrabalhados) === JSON.stringify([1,2,3,4,5,6]), "46: config 6 dias");
    unmount();
  }

  // 47: salvar() conversao number[] -> string
  {
    resetMockState();
    const { result, unmount } = renderHook(() => useConfig());
    await flush();
    assert(result.current.config !== null, "47a: config carregada");
    await act(async () => { await result.current.salvar([0, 6]); });
    assert(mockState.configDias === "0,6", "47b: salvar([0,6]) persiste '0,6' (ordenado)");
    unmount();
  }

  // 48-50: Erro na API
  {
    resetMockState();
    (entities as any).Configuracao.list = async () => { throw new Error("Config API down"); };
    const { result, unmount } = renderHook(() => useConfig());
    await flush();
    assert(result.current.error !== null, "48: error quando API falha");
    assert(result.current.loading === false, "49: loading=false apos erro");
    assert(result.current.config === null, "50: config=null apos erro");
    (entities as any).Configuracao.list = async () => { if (mockState.configExists) return [{ id: "cfg1", diasTrabalhados: mockState.configDias, created_date: "", updated_date: "" }]; return []; };
    unmount();
  }

  // 51-52: Funcoes puras no runtime
  assert(JSON.stringify(parseDiasTrabalhados("1,2,3,4,5")) === JSON.stringify([1,2,3,4,5]), "51: parseDiasTrabalhados runtime");
  assert(serializeDiasTrabalhados([6,0,1]) === "0,1,6", "52: serializeDiasTrabalhados runtime (ordena)");

  console.log("\n=== RESULTADO RUNTIME ===");
  console.log(`Pass: ${pass}, Fail: ${fail}`);
  if (fail === 0) { console.log("=== TODOS OS TESTES RUNTIME PASSARAM! ==="); } else { console.log("=== FALHAS DETECTADAS ==="); process.exit(1); }
}

main().catch(err => { console.error("ERRO FATAL:", err); process.exit(1); });
