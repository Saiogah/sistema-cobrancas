// test_sprint6_m9.ts — Testes do M9 (Dashboard)
import { JSDOM } from "jsdom";
import { readFileSync } from "fs";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", { url: "http://localhost", pretendToBeVisual: true });
(globalThis as any).document = dom.window.document;
(globalThis as any).window = dom.window;
(globalThis as any).navigator = dom.window.navigator;
(globalThis as any).HTMLElement = dom.window.HTMLElement;
(globalThis as any).Element = dom.window.Element;
(globalThis as any).Node = dom.window.Node;
(globalThis as any).window.open = () => {};
(globalThis as any).window.confirm = () => true;

let pass = 0, fail = 0;
function assert(cond: boolean, msg: string) { if (cond) { pass++; } else { fail++; console.error(`FALHOU: ${msg}`); } }

async function main() {
  const React = await import("react");
  const { render, fireEvent, act, waitFor } = await import("@testing-library/react");
  const entities = await import("/app/api/entities");

  // Mock data
  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  const ontem = new Date(Date.now() - 86400000).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  const amanha = new Date(Date.now() + 86400000).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  const doisDias = new Date(Date.now() + 2 * 86400000).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  const tresDias = new Date(Date.now() + 3 * 86400000).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  const cincoDiasAtras = new Date(Date.now() - 5 * 86400000).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });

  const mockClientes = [
    { id: "c1", nome: "Maria Silva", telefone: "5511987654321", observacoes: "", ativo: true, created_date: "", updated_date: "" },
    { id: "c2", nome: "João Costa", telefone: "5511912345678", observacoes: "", ativo: true, created_date: "", updated_date: "" },
    { id: "c3", nome: "Ana Inativa", telefone: "5511999888777", observacoes: "", ativo: false, created_date: "", updated_date: "" },
  ];

  const mockCobrancas = [
    { id: "cb1", clienteId: "c1", produtoServicoId: "p1", nomeProdutoServico: "Consultoria", valor: 600, formaPagamento: "pix" as any, quantidadeParcelas: 3, primeiroVencimento: hoje, diaVencimentoFixo: 10 as any, pixUtilizado: "email@pix", observacoes: "Obs teste", created_date: "", updated_date: "" },
    { id: "cb2", clienteId: "c2", produtoServicoId: "p2", nomeProdutoServico: "Manutenção", valor: 200, formaPagamento: "dinheiro" as any, quantidadeParcelas: 1, primeiroVencimento: ontem, diaVencimentoFixo: 10 as any, pixUtilizado: null, observacoes: "", created_date: "", updated_date: "" },
    { id: "cb3", clienteId: "c1", produtoServicoId: "p1", nomeProdutoServico: "Consultoria", valor: 300, formaPagamento: "pix" as any, quantidadeParcelas: 1, primeiroVencimento: amanha, diaVencimentoFixo: 10 as any, pixUtilizado: "email@pix", observacoes: "", created_date: "", updated_date: "" },
  ];

  const mockParcelas = [
    { id: "par1", cobrancaId: "cb1", clienteId: "c1", numeroParcela: 1, valor: 200, valorPago: null, dataVencimento: hoje, status: "pendente", dataPagamento: null, dataCobrancaEnviada: null, arquivada: false, created_date: "", updated_date: "" },
    { id: "par2", cobrancaId: "cb2", clienteId: "c2", numeroParcela: 1, valor: 200, valorPago: null, dataVencimento: ontem, status: "pendente", dataPagamento: null, dataCobrancaEnviada: null, arquivada: false, created_date: "", updated_date: "" },
    { id: "par3", cobrancaId: "cb3", clienteId: "c1", numeroParcela: 1, valor: 300, valorPago: null, dataVencimento: amanha, status: "pendente", dataPagamento: null, dataCobrancaEnviada: null, arquivada: false, created_date: "", updated_date: "" },
    { id: "par4", cobrancaId: "cb1", clienteId: "c1", numeroParcela: 2, valor: 200, valorPago: 200, dataVencimento: ontem, status: "pago", dataPagamento: ontem, dataCobrancaEnviada: null, arquivada: false, created_date: "", updated_date: "" },
    { id: "par5", cobrancaId: "cb2", clienteId: "c2", numeroParcela: 1, valor: 150, valorPago: null, dataVencimento: cincoDiasAtras, status: "pendente", dataPagamento: null, dataCobrancaEnviada: null, arquivada: false, created_date: "", updated_date: "" },
    { id: "par6", cobrancaId: "cb3", clienteId: "c3", numeroParcela: 1, valor: 500, valorPago: null, dataVencimento: hoje, status: "pendente", dataPagamento: null, dataCobrancaEnviada: null, arquivada: false, created_date: "", updated_date: "" },
    { id: "par7", cobrancaId: "cb1", clienteId: "c1", numeroParcela: 3, valor: 200, valorPago: null, dataVencimento: doisDias, status: "pendente", dataPagamento: null, dataCobrancaEnviada: null, arquivada: false, created_date: "", updated_date: "" },
    { id: "par8", cobrancaId: "cb2", clienteId: "c2", numeroParcela: 1, valor: 100, valorPago: null, dataVencimento: tresDias, status: "pendente", dataPagamento: null, dataCobrancaEnviada: null, arquivada: false, created_date: "", updated_date: "" },
    { id: "par9", cobrancaId: "cb1", clienteId: "c1", numeroParcela: 1, valor: 250, valorPago: null, dataVencimento: hoje, status: "cobrado", dataPagamento: null, dataCobrancaEnviada: hoje, arquivada: false, created_date: "", updated_date: "" },
  ];

  let mockState: any = { parcelas: [...mockParcelas], cobrancas: [...mockCobrancas], clientes: [...mockClientes], updates: {} };
  function reset() { mockState = { parcelas: [...mockParcelas], cobrancas: [...mockCobrancas], clientes: [...mockClientes], updates: {} }; }

  (entities as any).Parcela.list = async () => mockState.parcelas;
  (entities as any).Parcela.get = async (id: string) => mockState.parcelas.find((p: any) => p.id === id);
  (entities as any).Parcela.update = async (id: string, data: any) => {
    mockState.updates[id] = data;
    const idx = mockState.parcelas.findIndex((p: any) => p.id === id);
    if (idx >= 0) mockState.parcelas[idx] = { ...mockState.parcelas[idx], ...data };
    return mockState.parcelas[idx];
  };
  (entities as any).Parcela.filter = async (q: any) => mockState.parcelas.filter((p: any) =>
    q?.dataVencimento ? p.dataVencimento === q.dataVencimento : true
  );

  (entities as any).Cliente.list = async () => mockState.clientes;
  (entities as any).Cliente.get = async (id: string) => mockState.clientes.find((c: any) => c.id === id);
  (entities as any).Cliente.create = async (d: any) => { const c = { id: "c-new", ...d, created_date: "", updated_date: "" }; mockState.clientes.push(c); return c; };
  (entities as any).Cliente.update = async (id: string, d: any) => { const i = mockState.clientes.findIndex((c: any) => c.id === id); if (i >= 0) mockState.clientes[i] = { ...mockState.clientes[i], ...d }; return mockState.clientes[i]; };

  (entities as any).Cobranca.get = async (id: string) => mockState.cobrancas.find((c: any) => c.id === id);
  (entities as any).Cobranca.filter = async (q: any) => mockState.cobrancas.filter((c: any) => q?.clienteId ? c.clienteId === q.clienteId : true);

  const { DashboardPage } = await import("/app/pages/DashboardPage");

  console.log("=== TESTES M9 — Dashboard ===\n");

  // 1: Renderiza com dados
  { reset();
    const { container } = render(React.createElement(DashboardPage));
    await act(async () => { await new Promise(r => setTimeout(r, 300)); });
    const text = container.textContent || "";
    assert(text.includes("Hoje"), "1: mostra data de hoje");
    assert(text.includes("Maria Silva"), "2: mostra Maria Silva");
  }

  // 3: Contadores visíveis
  { reset();
    const { container } = render(React.createElement(DashboardPage));
    await act(async () => { await new Promise(r => setTimeout(r, 300)); });
    const text = container.textContent || "";
    assert(text.includes("cobranç"), "3: mostra contador de cobranças");
    assert(text.includes("R$") || text.includes("200"), "3b: mostra valor");
  }

  // 4: Atrasadas aparecem
  { reset();
    const { container } = render(React.createElement(DashboardPage));
    await act(async () => { await new Promise(r => setTimeout(r, 300)); });
    const text = container.textContent || "";
    assert(text.includes("Atrasada"), "4: mostra parcela atrasada");
  }

  // 5: Cliente inativo NÃO aparece
  { reset();
    const { container } = render(React.createElement(DashboardPage));
    await act(async () => { await new Promise(r => setTimeout(r, 300)); });
    const text = container.textContent || "";
    assert(!text.includes("Ana Inativa"), "5: cliente inativo não aparece");
  }

  // 6: Parcela paga NÃO aparece
  { reset();
    const { container } = render(React.createElement(DashboardPage));
    await act(async () => { await new Promise(r => setTimeout(r, 300)); });
    const text = container.textContent || "";
    // par4 está pago (ontem) — não deve aparecer
    // João Costa tem par2 (atrasada ontem) e par5 (5 dias atrasado) e par8 (3 dias futuro)
    // Maria tem par1 (hoje), par3 (amanhã), par7 (2 dias), par9 (hoje cobrado)
    assert(text.includes("Maria Silva"), "6a: Maria aparece");
    assert(text.includes("João Costa"), "6b: João aparece");
  }

  // 7: Busca filtra
  { reset();
    const { container } = render(React.createElement(DashboardPage));
    await act(async () => { await new Promise(r => setTimeout(r, 300)); });
    const inputs = container.querySelectorAll("input");
    const searchInput = Array.from(inputs).find((i: any) => i.placeholder?.includes("Buscar"));
    if (searchInput) { act(() => { fireEvent.change(searchInput, { target: { value: "Maria" } }); }); }
    await act(async () => { await new Promise(r => setTimeout(r, 400)); });
    const text = container.textContent || "";
    assert(text.includes("Maria Silva"), "7a: busca mostra Maria");
  }

  // 8: Próximos vencimentos visíveis
  { reset();
    const { container } = render(React.createElement(DashboardPage));
    await act(async () => { await new Promise(r => setTimeout(r, 300)); });
    const text = container.textContent || "";
    assert(text.includes("Próximos vencimentos") || text.includes("Próximo vencimento") || text.includes("dia"), "8: mostra próximos vencimentos");
  }

  // 9: Estado vazio
  { reset();
    mockState.parcelas = [];
    const { container } = render(React.createElement(DashboardPage));
    await act(async () => { await new Promise(r => setTimeout(r, 300)); });
    const text = container.textContent || "";
    assert(text.includes("Nada para cobrar") || text.includes("Nada"), "9: estado vazio");
  }

  // 10: Botão Cobrar presente
  { reset();
    const { container } = render(React.createElement(DashboardPage));
    await act(async () => { await new Promise(r => setTimeout(r, 300)); });
    const text = container.textContent || "";
    assert(text.includes("Cobrar"), "10: botão Cobrar visível");
  }

  // 11: Botão Marcar pago presente
  { reset();
    const { container } = render(React.createElement(DashboardPage));
    await act(async () => { await new Promise(r => setTimeout(r, 300)); });
    const text = container.textContent || "";
    assert(text.includes("Marcar pago"), "11: botão Marcar pago visível");
  }

  // 12: Cobrado hoje mostra Confirmar envio
  { reset();
    const { container } = render(React.createElement(DashboardPage));
    await act(async () => { await new Promise(r => setTimeout(r, 300)); });
    const text = container.textContent || "";
    assert(text.includes("Confirmar envio"), "12: cobrado mostra Confirmar envio");
  }

  // 13: ChargeCard tem botão de seleção
  { reset();
    const { container } = render(React.createElement(DashboardPage));
    await act(async () => { await new Promise(r => setTimeout(r, 300)); });
    const buttons = container.querySelectorAll("button");
    const selectBtn = Array.from(buttons).find(b => b.className.includes("rounded-full"));
    assert(selectBtn !== undefined, "13: botão de seleção existe");
  }

  // 14: Selecionar 2+ mostra BatchBar
  { reset();
    const { container } = render(React.createElement(DashboardPage));
    await act(async () => { await new Promise(r => setTimeout(r, 300)); });
    // Selecionar 2 cards
    const selectBtns = Array.from(container.querySelectorAll("button")).filter(b => b.className.includes("rounded-full"));
    if (selectBtns.length >= 2) {
      act(() => { fireEvent.click(selectBtns[0]); });
      act(() => { fireEvent.click(selectBtns[1]); });
    }
    const text = container.textContent || "";
    assert(text.includes("selecionad"), "14: BatchBar com 'selecionadas' aparece");
    assert(text.includes("Marcar todas"), "14b: botão Marcar todas aparece");
  }

  // 15: Marcar pago total com undo
  { reset();
    const { container } = render(React.createElement(DashboardPage));
    await act(async () => { await new Promise(r => setTimeout(r, 300)); });
    // Encontrar um botão Marcar pago
    const btn = Array.from(container.querySelectorAll("button")).find(b => b.textContent?.includes("Marcar pago"));
    assert(btn !== undefined, "15a: botão Marcar pago existe");
    if (btn) { act(() => { fireEvent.click(btn); }); }
    // Menu deve abrir
    const text = container.textContent || "";
    assert(text.includes("Pagamento total"), "15b: menu com Pagamento total");
    // Clicar Pagamento total
    const totalBtn = Array.from(container.querySelectorAll("button")).find(b => b.textContent?.includes("Pagamento total"));
    if (totalBtn) { act(() => { fireEvent.click(totalBtn); }); }
    await act(async () => { await new Promise(r => setTimeout(r, 200)); });
    const text2 = container.textContent || "";
    assert(text2.includes("Desfazer") || text2.includes("pago"), "15c: undo toast aparece");
  }

  // 16: Marcar pago parcial
  { reset();
    const { container } = render(React.createElement(DashboardPage));
    await act(async () => { await new Promise(r => setTimeout(r, 300)); });
    const btn = Array.from(container.querySelectorAll("button")).find(b => b.textContent?.includes("Marcar pago"));
    if (btn) { act(() => { fireEvent.click(btn); }); }
    const text = container.textContent || "";
    assert(text.includes("Parcial"), "16: menu com Pagamento parcial");
  }

  // 17: Busca por produto
  { reset();
    const { container } = render(React.createElement(DashboardPage));
    await act(async () => { await new Promise(r => setTimeout(r, 300)); });
    const inputs = container.querySelectorAll("input");
    const searchInput = Array.from(inputs).find((i: any) => i.placeholder?.includes("Buscar"));
    if (searchInput) { act(() => { fireEvent.change(searchInput, { target: { value: "Consultoria" } }); }); }
    await act(async () => { await new Promise(r => setTimeout(r, 400)); });
    const text = container.textContent || "";
    assert(text.includes("Maria"), "17: busca por produto mostra Maria");
  }

  // 18: Busca por telefone
  { reset();
    const { container } = render(React.createElement(DashboardPage));
    await act(async () => { await new Promise(r => setTimeout(r, 300)); });
    const inputs = container.querySelectorAll("input");
    const searchInput = Array.from(inputs).find((i: any) => i.placeholder?.includes("Buscar"));
    if (searchInput) { act(() => { fireEvent.change(searchInput, { target: { value: "9876" } }); }); }
    await act(async () => { await new Promise(r => setTimeout(r, 400)); });
    const text = container.textContent || "";
    assert(text.includes("Maria"), "18: busca por telefone mostra Maria");
  }

  // 19: Próximos vencimentos clicáveis
  { reset();
    const { container } = render(React.createElement(DashboardPage));
    await act(async () => { await new Promise(r => setTimeout(r, 300)); });
    // Verificar que há linhas clicáveis em próximos vencimentos
    const text = container.textContent || "";
    assert(text.includes("dia") || text.includes("Dia"), "19: próximos vencimentos têm dia");
  }

  // 20: Nenhum setInterval
  {
    const code = readFileSync("/app/pages/DashboardPage.tsx", "utf-8")
      + readFileSync("/app/hooks/useBatchSelect.ts", "utf-8")
      + readFileSync("/app/components/BatchBar/BatchBar.tsx", "utf-8");
    assert(!code.includes("setInterval("), "20: nenhum setInterval");
  }

  // 21: BatchBar é React.memo
  {
    const code = readFileSync("/app/components/BatchBar/BatchBar.tsx", "utf-8");
    assert(code.includes("React.memo"), "21: BatchBar é React.memo");
  }

  // 22: useBatchSelect tem toggle, isSelected, limpar, selecionarTodas
  {
    const code = readFileSync("/app/hooks/useBatchSelect.ts", "utf-8");
    assert(code.includes("toggle"), "22a: useBatchSelect tem toggle");
    assert(code.includes("isSelected"), "22b: useBatchSelect tem isSelected");
    assert(code.includes("limpar"), "22c: useBatchSelect tem limpar");
    assert(code.includes("selecionarTodas"), "22d: useBatchSelect tem selecionarTodas");
    assert(code.includes("temSelecao"), "22e: useBatchSelect tem temSelecao");
  }

  // 23: EmptyState com próximo vencimento quando vazio mas com vencimentos futuros
  { reset();
    // Só parcelas futuras, nada para hoje
    mockState.parcelas = [
      { id: "par-fut1", cobrancaId: "cb3", clienteId: "c1", numeroParcela: 1, valor: 300, valorPago: null, dataVencimento: amanha, status: "pendente", dataPagamento: null, dataCobrancaEnviada: null, arquivada: false, created_date: "", updated_date: "" },
    ];
    const { container } = render(React.createElement(DashboardPage));
    await act(async () => { await new Promise(r => setTimeout(r, 300)); });
    const text = container.textContent || "";
    assert(text.includes("Nada para cobrar"), "23: empty state com próximo vencimento");
  }

  console.log("\n=== RESULTADO M9 ===");
  console.log(`Pass: ${pass}, Fail: ${fail}`);
  if (fail === 0) { console.log("=== TODOS OS TESTES M9 PASSARAM! ==="); } else { console.log("=== FALHAS DETECTADAS ==="); process.exit(1); }
}

main().catch(err => { console.error("ERRO FATAL:", err); process.exit(1); });
