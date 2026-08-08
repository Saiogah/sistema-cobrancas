// test_sprint5_m8a.ts — Testes para M8a (Componentes Compostos Core)
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

async function main() {
  const React = await import("react");
  const { render, screen, fireEvent, act } = await import("@testing-library/react");
  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });

  // === ChargeCard ===
  console.log("=== TESTES M8a — ChargeCard ===\n");

  const mockParcela = (overrides: any = {}) => ({
    id: "p1", cobrancaId: "cb1", clienteId: "c1", numeroParcela: 1,
    valor: 200, valorPago: null, dataVencimento: hoje, status: "pendente",
    dataPagamento: null, dataCobrancaEnviada: null, arquivada: false,
    created_date: "", updated_date: "", ...overrides,
  });
  const mockCobranca = { id: "cb1", nomeProdutoServico: "Consultoria", quantidadeParcelas: 3, formaPagamento: "pix", pixUtilizado: "email@pix.com", observacoes: "Teste" } as any;
  const mockCliente = { id: "c1", nome: "Maria Silva", telefone: "5511987654321" } as any;

  // 1: Renderiza pendente
  { const { container } = render(React.createElement((await import("/app/components/ChargeCard/ChargeCard")).ChargeCard, {
    parcela: mockParcela(), cobranca: mockCobranca, cliente: mockCliente,
  } as any));
    const text = container.textContent || "";
    assert(text.includes("Maria Silva"), "1: mostra nome do cliente");
    assert(text.includes("200"), "2: mostra valor");
    assert(text.includes("Consultoria"), "3: mostra produto");
    assert(text.includes("Cobrar"), "4: mostra botão Cobrar pendente");
    assert(text.includes("Marcar pago"), "5: mostra botão Marcar pago");
  }

  // 6: Cobrado mostra Confirmar envio
  { const { container } = render(React.createElement((await import("/app/components/ChargeCard/ChargeCard")).ChargeCard, {
    parcela: mockParcela({ status: "cobrado", dataCobrancaEnviada: hoje }), cobranca: mockCobranca, cliente: mockCliente,
  } as any));
    const text = container.textContent || "";
    assert(text.includes("Confirmar envio"), "6: cobrado mostra Confirmar envio");
    assert(!text.includes("Cobrar"), "6b: cobrado não mostra Cobrar");
  }

  // 7: Pago não mostra ações
  { const { container } = render(React.createElement((await import("/app/components/ChargeCard/ChargeCard")).ChargeCard, {
    parcela: mockParcela({ status: "pago", valorPago: 200, dataPagamento: hoje }), cobranca: mockCobranca, cliente: mockCliente,
  } as any));
    const text = container.textContent || "";
    assert(!text.includes("Cobrar"), "7: pago não mostra Cobrar");
    assert(!text.includes("Marcar pago"), "7b: pago não mostra Marcar pago");
  }

  // 8: Pago parcial mostra "R$ X de R$ Y"
  { const { container } = render(React.createElement((await import("/app/components/ChargeCard/ChargeCard")).ChargeCard, {
    parcela: mockParcela({ status: "pago_parcial", valorPago: 100 }), cobranca: mockCobranca, cliente: mockCliente,
  } as any));
    const text = container.textContent || "";
    assert(text.includes("de"), "8: pago_parcial mostra X de Y");
  }

  // 9: Callback onCharge
  { let called = false;
    const { container } = render(React.createElement((await import("/app/components/ChargeCard/ChargeCard")).ChargeCard, {
      parcela: mockParcela(), cobranca: mockCobranca, cliente: mockCliente,
      onCharge: () => { called = true; },
    } as any));
    const btn = Array.from(container.querySelectorAll("button")).find(b => b.textContent?.includes("Cobrar"));
    if (btn) { act(() => { fireEvent.click(btn); }); }
    assert(called, "9: onCharge chamado ao clicar Cobrar");
  }

  // 10: Callback onMarkPaid
  { let called = false;
    const { container } = render(React.createElement((await import("/app/components/ChargeCard/ChargeCard")).ChargeCard, {
      parcela: mockParcela(), cobranca: mockCobranca, cliente: mockCliente,
      onMarkPaid: () => { called = true; },
    } as any));
    const btn = Array.from(container.querySelectorAll("button")).find(b => b.textContent?.includes("Marcar pago"));
    if (btn) { act(() => { fireEvent.click(btn); }); }
    const totalBtn = Array.from(container.querySelectorAll("button")).find(b => b.textContent?.includes("Pagamento total"));
    if (totalBtn) { act(() => { fireEvent.click(totalBtn); }); }
    assert(called, "10: onMarkPaid chamado via menu total");
  }

  // 11: Expansão mostra PIX
  { const { container } = render(React.createElement((await import("/app/components/ChargeCard/ChargeCard")).ChargeCard, {
    parcela: mockParcela(), cobranca: mockCobranca, cliente: mockCliente,
  } as any));
    const center = container.querySelector(".cursor-pointer");
    if (center) { act(() => { fireEvent.click(center); }); }
    const text = container.textContent || "";
    assert(text.includes("PIX"), "11: expansão mostra PIX");
    assert(text.includes("email@pix.com"), "11b: mostra chave PIX");
  }

  // 12: Atrasada mostra "Atrasada há X dias"
  { const ontem = new Date(Date.now() - 86400000).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
    const { container } = render(React.createElement((await import("/app/components/ChargeCard/ChargeCard")).ChargeCard, {
      parcela: mockParcela({ dataVencimento: ontem }), cobranca: mockCobranca, cliente: mockCliente,
    } as any));
    const text = container.textContent || "";
    assert(text.includes("Atrasada"), "12: mostra Atrasada");
  }

  // 13: Seleção funciona
  { let selected = false;
    const { container } = render(React.createElement((await import("/app/components/ChargeCard/ChargeCard")).ChargeCard, {
      parcela: mockParcela(), cobranca: mockCobranca, cliente: mockCliente,
      onSelect: () => { selected = true; }, isSelected: false,
    } as any));
    const circle = container.querySelector("button[aria-label='Selecionar']");
    if (circle) { act(() => { fireEvent.click(circle); }); }
    assert(selected, "13: onSelect chamado");
  }

  console.log("\n=== TESTES M8a — ClientAutocomplete ===\n");

  // 14: Renderiza e filtra
  { const mockClientes = [
    { id: "c1", nome: "Maria Silva", telefone: "5511987654321", ativo: true } as any,
    { id: "c2", nome: "João Costa", telefone: "5511912345678", ativo: true } as any,
  ];
    const { container } = render(React.createElement((await import("/app/components/ClientAutocomplete/ClientAutocomplete")).ClientAutocomplete, {
      onSelect: () => {}, clientes: mockClientes,
    } as any));
    const input = container.querySelector("input");
    assert(input !== null, "14: input renderizado");
    const text = container.textContent || "";
    assert(text.includes("RECENTES"), "15: mostra RECENTES");
  }

  // 16: Botão + Cadastrar novo
  { const mockClientes = [{ id: "c1", nome: "Maria", telefone: "5511", ativo: true } as any];
    const { container } = render(React.createElement((await import("/app/components/ClientAutocomplete/ClientAutocomplete")).ClientAutocomplete, {
      onSelect: () => {}, clientes: mockClientes,
    } as any));
    const text = container.textContent || "";
    assert(text.includes("Cadastrar novo"), "16: mostra botão cadastrar");
  }

  console.log("\n=== TESTES M8a — ProductAutocomplete ===\n");

  // 17: Renderiza e ordena por vezesUsado
  { const mockProdutos = [
    { id: "p1", nome: "Consultoria", valorPadrao: 200, vezesUsado: 5 } as any,
    { id: "p2", nome: "Design", valorPadrao: 100, vezesUsado: 10 } as any,
  ];
    const { container } = render(React.createElement((await import("/app/components/ProductAutocomplete/ProductAutocomplete")).ProductAutocomplete, {
      onSelect: () => {}, produtos: mockProdutos,
    } as any));
    const text = container.textContent || "";
    assert(text.includes("MAIS VENDIDOS"), "17: mostra MAIS VENDIDOS");
    // Design (10x) deve aparecer antes de Consultoria (5x)
    const idxDesign = text.indexOf("Design");
    const idxCons = text.indexOf("Consultoria");
    assert(idxDesign < idxCons, "18: ordenado por vezesUsado desc");
  }

  // 19: Venda avulsa
  { const { container } = render(React.createElement((await import("/app/components/ProductAutocomplete/ProductAutocomplete")).ProductAutocomplete, {
    onSelect: () => {}, produtos: [], allowVendaAvulsa: true,
  } as any));
    const text = container.textContent || "";
    assert(text.includes("Venda avulsa"), "19: mostra Venda avulsa");
  }

  console.log("\n=== TESTES M8a — PaymentSelector ===\n");

  // 20: 5 opções de pagamento
  { const { container } = render(React.createElement((await import("/app/components/PaymentSelector/PaymentSelector")).PaymentSelector, {
    value: null, onChange: () => {}, quantidadeParcelas: 1, onQuantidadeParcelasChange: () => {},
  } as any));
    const text = container.textContent || "";
    assert(text.includes("PIX"), "20a: tem PIX");
    assert(text.includes("Cartão Crédito"), "20b: tem Cartão Crédito");
    assert(text.includes("Cartão Débito"), "20c: tem Cartão Débito");
    assert(text.includes("Dinheiro"), "20d: tem Dinheiro");
    assert(text.includes("Transferência"), "20e: tem Transferência");
    assert(!text.includes("Boleto"), "20f: não tem Boleto");
  }

  // 21: Campo PIX aparece quando PIX selecionado
  { const { container } = render(React.createElement((await import("/app/components/PaymentSelector/PaymentSelector")).PaymentSelector, {
    value: "pix", onChange: () => {}, pixUtilizado: "", onPixUtilizadoChange: () => {},
    quantidadeParcelas: 1, onQuantidadeParcelasChange: () => {},
  } as any));
    const text = container.textContent || "";
    assert(text.includes("PIX utilizado"), "21: campo PIX aparece");
  }

  // 22: Toggle À Vista/Parcelado
  { const { container } = render(React.createElement((await import("/app/components/PaymentSelector/PaymentSelector")).PaymentSelector, {
    value: "dinheiro", onChange: () => {}, quantidadeParcelas: 1, onQuantidadeParcelasChange: () => {},
  } as any));
    const text = container.textContent || "";
    assert(text.includes("À Vista"), "22a: tem À Vista");
    assert(text.includes("Parcelado"), "22b: tem Parcelado");
  }

  console.log("\n=== TESTES M8a — ParcelPreview ===\n");

  // 23: Renderiza parcelas
  { const { container } = render(React.createElement((await import("/app/components/ParcelPreview/ParcelPreview")).ParcelPreview, {
    valor: 600, quantidadeParcelas: 3, primeiroVencimento: "2026-07-15", diaVencimentoFixo: 15,
  } as any));
    const text = container.textContent || "";
    assert(text.includes("200,00") || text.includes("200.00") || text.includes("200"), "23: mostra valor das parcelas");
    assert(text.includes("Total"), "24: mostra Total");
  }

  // 25: Soma total correta
  { const { container } = render(React.createElement((await import("/app/components/ParcelPreview/ParcelPreview")).ParcelPreview, {
    valor: 100, quantidadeParcelas: 3, primeiroVencimento: "2026-07-15", diaVencimentoFixo: 15,
  } as any));
    const text = container.textContent || "";
    assert(text.includes("100,00") || text.includes("100.00"), "25: soma total = 100");
  }

  // 26: Componentes são React.memo
  {
    const cc = readFileSync("/app/components/ChargeCard/ChargeCard.tsx", "utf-8");
    const ca = readFileSync("/app/components/ClientAutocomplete/ClientAutocomplete.tsx", "utf-8");
    const pa = readFileSync("/app/components/ProductAutocomplete/ProductAutocomplete.tsx", "utf-8");
    const ps = readFileSync("/app/components/PaymentSelector/PaymentSelector.tsx", "utf-8");
    const pp = readFileSync("/app/components/ParcelPreview/ParcelPreview.tsx", "utf-8");
    assert(cc.includes("React.memo"), "26a: ChargeCard é memo");
    assert(ca.includes("React.memo"), "26b: ClientAutocomplete é memo");
    assert(pa.includes("React.memo"), "26c: ProductAutocomplete é memo");
    assert(ps.includes("React.memo"), "26d: PaymentSelector é memo");
    assert(pp.includes("React.memo"), "26e: ParcelPreview é memo");
  }

  // 27: Nenhum componente usa setInterval(
  {
    const all = cc = readFileSync("/app/components/ChargeCard/ChargeCard.tsx", "utf-8")
      + readFileSync("/app/components/ClientAutocomplete/ClientAutocomplete.tsx", "utf-8")
      + readFileSync("/app/components/ProductAutocomplete/ProductAutocomplete.tsx", "utf-8")
      + readFileSync("/app/components/PaymentSelector/PaymentSelector.tsx", "utf-8")
      + readFileSync("/app/components/ParcelPreview/ParcelPreview.tsx", "utf-8");
    assert(!all.includes("setInterval("), "27: nenhum componente usa setInterval(");
  }

  console.log("\n=== RESULTADO M8a ===");
  console.log(`Pass: ${pass}, Fail: ${fail}`);
  if (fail === 0) { console.log("=== TODOS OS TESTES M8a PASSARAM! ==="); } else { console.log("=== FALHAS DETECTADAS ==="); process.exit(1); }
}

main().catch(err => { console.error("ERRO FATAL:", err); process.exit(1); });
