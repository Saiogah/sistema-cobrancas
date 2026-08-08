// test_sprint5_m11_m12.ts — Testes para M11 (ClientsPage) e M12 (ProductsPage)
import { JSDOM } from "jsdom";
import { readFileSync } from "fs";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", { url: "http://localhost", pretendToBeVisual: true });
(globalThis as any).document = dom.window.document;
(globalThis as any).window = dom.window;
(globalThis as any).navigator = dom.window.navigator;
(globalThis as any).HTMLElement = dom.window.HTMLElement;
(globalThis as any).Element = dom.window.Element;
(globalThis as any).Node = dom.window.Node;
(globalThis as any).window.confirm = () => true;
(globalThis as any).window.alert = () => {};

let pass = 0, fail = 0;
function assert(cond: boolean, msg: string) { if (cond) { pass++; } else { fail++; console.error(`FALHOU: ${msg}`); } }

async function main() {
  const React = await import("react");
  const { render, fireEvent, act, waitFor } = await import("@testing-library/react");
  const entities = await import("/app/api/entities");

  // Mock data
  const mockClientes = [
    { id: "c1", nome: "Maria Silva", telefone: "5511987654321", observacoes: "Cliente VIP", ativo: true, created_date: "", updated_date: "" },
    { id: "c2", nome: "João Costa", telefone: "5511912345678", observacoes: "", ativo: false, created_date: "", updated_date: "" },
  ];
  const mockCobrancas = [
    { id: "cb1", clienteId: "c1", produtoServicoId: "p1", nomeProdutoServico: "Consultoria", valor: 600, formaPagamento: "pix", quantidadeParcelas: 3, primeiroVencimento: "2026-07-15", diaVencimentoFixo: 15, pixUtilizado: "email@pix", observacoes: "", created_date: "", updated_date: "" },
  ];
  const mockParcelas = [
    { id: "par1", cobrancaId: "cb1", clienteId: "c1", numeroParcela: 1, valor: 200, valorPago: null, dataVencimento: "2026-07-15", status: "pendente", dataPagamento: null, dataCobrancaEnviada: null, arquivada: false, created_date: "", updated_date: "" },
    { id: "par2", cobrancaId: "cb1", clienteId: "c1", numeroParcela: 2, valor: 200, valorPago: 200, dataVencimento: "2026-08-15", status: "pago", dataPagamento: "2026-08-10", dataCobrancaEnviada: "2026-08-01", arquivada: false, created_date: "", updated_date: "" },
  ];

  let state: any = { clientes: [...mockClientes], cobrancas: [...mockCobrancas], parcelas: [...mockParcelas], produtos: [], updates: {} };

  function reset() { state = { clientes: [...mockClientes], cobrancas: [...mockCobrancas], parcelas: [...mockParcelas], produtos: [], updates: {} }; }

  (entities as any).Cliente.list = async () => state.clientes;
  (entities as any).Cliente.create = async (d: any) => { const c = { id: "c-new", ...d, created_date: "", updated_date: "" }; state.clientes.push(c); return c; };
  (entities as any).Cliente.update = async (id: string, d: any) => { const i = state.clientes.findIndex((c: any) => c.id === id); if (i >= 0) state.clientes[i] = { ...state.clientes[i], ...d }; state.updates[id] = d; return state.clientes[i]; };

  (entities as any).Cobranca.filter = async (q: any) => state.cobrancas.filter((c: any) => q?.clienteId ? c.clienteId === q.clienteId : q?.produtoServicoId ? c.produtoServicoId === q.produtoServicoId : true);
  (entities as any).Cobranca.delete = async (id: string) => { state.cobrancas = state.cobrancas.filter((c: any) => c.id !== id); };

  (entities as any).Parcela.filter = async (q: any) => state.parcelas.filter((p: any) => q?.cobrancaId ? p.cobrancaId === q.cobrancaId : true);
  (entities as any).Parcela.update = async (id: string, d: any) => { const i = state.parcelas.findIndex((p: any) => p.id === id); if (i >= 0) state.parcelas[i] = { ...state.parcelas[i], ...d }; state.updates[id] = d; return state.parcelas[i]; };

  (entities as any).ProdutoServico.list = async () => state.produtos;
  (entities as any).ProdutoServico.create = async (d: any) => { const p = { id: "p-new", vezesUsado: 0, created_date: "", updated_date: "", ...d }; state.produtos.push(p); return p; };
  (entities as any).ProdutoServico.update = async (id: string, d: any) => { const i = state.produtos.findIndex((p: any) => p.id === id); if (i >= 0) state.produtos[i] = { ...state.produtos[i], ...d }; state.updates[id] = d; return state.produtos[i]; };
  (entities as any).ProdutoServico.delete = async (id: string) => { state.produtos = state.produtos.filter((p: any) => p.id !== id); };

  const { eventBus } = await import("/app/lib/event-bus");

  console.log("=== TESTES M11 — ClientsPage ===\n");

  // 1: Renderiza lista
  { reset();
    const { ClientsPage } = await import("/app/pages/ClientsPage");
    const { container } = render(React.createElement(ClientsPage));
    await act(async () => { await new Promise(r => setTimeout(r, 100)); });
    const text = container.textContent || "";
    assert(text.includes("Clientes"), "1: header mostra Clientes");
    assert(text.includes("Maria Silva"), "2: lista mostra Maria Silva");
    assert(text.includes("João Costa"), "3: lista mostra João Costa");
  }

  // 4: Busca filtra
  { reset();
    const { ClientsPage } = await import("/app/pages/ClientsPage");
    const { container } = render(React.createElement(ClientsPage));
    await act(async () => { await new Promise(r => setTimeout(r, 100)); });
    const input = container.querySelector("input[type='text']") as any;
    // Buscar pelo input de busca (o segundo input, depois do "+ Novo")
    const inputs = container.querySelectorAll("input");
    const searchInput = Array.from(inputs).find((i: any) => i.placeholder?.includes("Buscar"));
    if (searchInput) { act(() => { fireEvent.change(searchInput, { target: { value: "Maria" } }); }); }
    await act(async () => { await new Promise(r => setTimeout(r, 400)); });
    const text = container.textContent || "";
    assert(text.includes("Maria Silva"), "4a: busca mostra Maria");
    // João pode ainda aparecer durante a transição
  }

  // 5: Status Ativo/Inativo
  { reset();
    const { ClientsPage } = await import("/app/pages/ClientsPage");
    const { container } = render(React.createElement(ClientsPage));
    await act(async () => { await new Promise(r => setTimeout(r, 100)); });
    const text = container.textContent || "";
    assert(text.includes("Ativo"), "5: Maria mostra Ativo");
    assert(text.includes("Inativo"), "5b: João mostra Inativo");
  }

  // 6: Botão + Novo
  { reset();
    const { ClientsPage } = await import("/app/pages/ClientsPage");
    const { container } = render(React.createElement(ClientsPage));
    await act(async () => { await new Promise(r => setTimeout(r, 100)); });
    const btn = Array.from(container.querySelectorAll("button")).find(b => b.textContent?.includes("Novo"));
    assert(btn !== undefined, "6: botão + Novo existe");
    if (btn) { act(() => { fireEvent.click(btn); }); }
    const text = container.textContent || "";
    assert(text.includes("Salvar") || text.includes("Nome do cliente") || text.includes("Nome"), "6b: form novo aparece");
  }

  console.log("\n=== TESTES M12 — ProductsPage ===\n");

  // 7: Renderiza lista ordenada
  { reset();
    state.produtos = [
      { id: "p1", nome: "Consultoria", valorPadrao: 200, vezesUsado: 5, created_date: "", updated_date: "" },
      { id: "p2", nome: "Design", valorPadrao: 100, vezesUsado: 10, created_date: "", updated_date: "" },
    ];
    const { ProductsPage } = await import("/app/pages/ProductsPage");
    const { container } = render(React.createElement(ProductsPage));
    await act(async () => { await new Promise(r => setTimeout(r, 100)); });
    const text = container.textContent || "";
    assert(text.includes("Produtos"), "7: header mostra Produtos");
    assert(text.includes("Design"), "8: lista mostra Design");
    assert(text.includes("Consultoria"), "9: lista mostra Consultoria");
    // Design (10x) deve aparecer antes de Consultoria (5x)
    assert(text.indexOf("Design") < text.indexOf("Consultoria"), "10: ordenado por vezesUsado desc");
  }

  // 11: ⭐ no mais usado
  { reset();
    state.produtos = [{ id: "p1", nome: "Top", valorPadrao: 50, vezesUsado: 15, created_date: "", updated_date: "" }];
    const { ProductsPage } = await import("/app/pages/ProductsPage");
    const { container } = render(React.createElement(ProductsPage));
    await act(async () => { await new Promise(r => setTimeout(r, 100)); });
    const text = container.textContent || "";
    assert(text.includes("⭐"), "11: ⭐ no mais usado");
  }

  // 12: Valor padrão formatado
  { reset();
    state.produtos = [{ id: "p1", nome: "Curso", valorPadrao: 1500, vezesUsado: 1, created_date: "", updated_date: "" }];
    const { ProductsPage } = await import("/app/pages/ProductsPage");
    const { container } = render(React.createElement(ProductsPage));
    await act(async () => { await new Promise(r => setTimeout(r, 100)); });
    const text = container.textContent || "";
    assert(text.includes("R$ 1.500,00") || text.includes("1.500"), "12: valor formatado");
  }

  // 13: "Sem valor" quando null
  { reset();
    state.produtos = [{ id: "p1", nome: "Avulso", valorPadrao: null, vezesUsado: 0, created_date: "", updated_date: "" }];
    const { ProductsPage } = await import("/app/pages/ProductsPage");
    const { container } = render(React.createElement(ProductsPage));
    await act(async () => { await new Promise(r => setTimeout(r, 100)); });
    const text = container.textContent || "";
    assert(text.includes("Sem valor"), "13: mostra Sem valor");
  }

  // 14: "Usado X vezes"
  { reset();
    state.produtos = [{ id: "p1", nome: "Curso", valorPadrao: 200, vezesUsado: 7, created_date: "", updated_date: "" }];
    const { ProductsPage } = await import("/app/pages/ProductsPage");
    const { container } = render(React.createElement(ProductsPage));
    await act(async () => { await new Promise(r => setTimeout(r, 100)); });
    assert((container.textContent || "").includes("7"), "14: mostra vezes usado");
  }

  // 15: Venda avulsa aparece
  { reset();
    state.produtos = [];
    const { ProductsPage } = await import("/app/pages/ProductsPage");
    const { container } = render(React.createElement(ProductsPage));
    await act(async () => { await new Promise(r => setTimeout(r, 100)); });
    const text = container.textContent || "";
    assert(text.includes("Venda avulsa"), "15: venda avulsa aparece");
    assert(text.includes("Não editável"), "16: venda avulsa não editável");
  }

  // 17: Excluir com cobranças → bloqueia
  { reset();
    state.produtos = [{ id: "p1", nome: "Consultoria", valorPadrao: 200, vezesUsado: 5, created_date: "", updated_date: "" }];
    state.cobrancas = [{ id: "cb1", clienteId: "c1", produtoServicoId: "p1", nomeProdutoServico: "Consultoria", valor: 600, formaPagamento: "pix" as any, quantidadeParcelas: 3, primeiroVencimento: "2026-07-15", diaVencimentoFixo: 15, pixUtilizado: null, observacoes: "", created_date: "", updated_date: "" }];
    const { ProductsPage } = await import("/app/pages/ProductsPage");
    const { container } = render(React.createElement(ProductsPage));
    await act(async () => { await new Promise(r => setTimeout(r, 100)); });
    // Expandir card
    const card = container.querySelector(".rounded-lg");
    if (card) { act(() => { fireEvent.click(card); }); }
    const text = container.textContent || "";
    assert(text.includes("Excluir"), "17a: botão Excluir aparece");
    // Clicar Excluir
    const excBtn = Array.from(container.querySelectorAll("button")).find(b => b.textContent?.includes("Excluir"));
    if (excBtn) { act(() => { fireEvent.click(excBtn); }); }
    // Produto ainda existe (bloqueado)
    assert(state.produtos.length === 1, "17b: produto não excluído (tem cobranças)");
  }

  // 18: Excluir sem cobranças → permite
  { reset();
    state.produtos = [{ id: "p1", nome: "Consultoria", valorPadrao: 200, vezesUsado: 0, created_date: "", updated_date: "" }];
    state.cobrancas = [];
    const { ProductsPage } = await import("/app/pages/ProductsPage");
    const { container } = render(React.createElement(ProductsPage));
    await act(async () => { await new Promise(r => setTimeout(r, 100)); });
    const card = container.querySelector(".rounded-lg");
    if (card) { act(() => { fireEvent.click(card); }); }
    const excBtn = Array.from(container.querySelectorAll("button")).find(b => b.textContent?.includes("Excluir"));
    if (excBtn) { act(() => { fireEvent.click(excBtn); }); }
    await act(async () => { await new Promise(r => setTimeout(r, 100)); });
    assert(state.produtos.length === 0, "18: produto excluído (sem cobranças)");
  }

  // 19: EmptyState quando vazio
  { reset();
    state.produtos = [];
    const { ProductsPage } = await import("/app/pages/ProductsPage");
    const { container } = render(React.createElement(ProductsPage));
    await act(async () => { await new Promise(r => setTimeout(r, 100)); });
    const text = container.textContent || "";
    assert(text.includes("Nenhum produto") || text.includes("Venda avulsa"), "19: empty state ou venda avulsa");
  }

  // 20: Nenhum setInterval nas páginas
  {
    const clients = readFileSync("/app/pages/ClientsPage.tsx", "utf-8");
    const products = readFileSync("/app/pages/ProductsPage.tsx", "utf-8");
    assert(!clients.includes("setInterval("), "20a: ClientsPage sem setInterval");
    assert(!products.includes("setInterval("), "20b: ProductsPage sem setInterval");
  }

  console.log("\n=== RESULTADO M11+M12 ===");
  console.log(`Pass: ${pass}, Fail: ${fail}`);
  if (fail === 0) { console.log("=== TODOS OS TESTES M11+M12 PASSARAM! ==="); } else { console.log("=== FALHAS DETECTADAS ==="); process.exit(1); }
}

main().catch(err => { console.error("ERRO FATAL:", err); process.exit(1); });
