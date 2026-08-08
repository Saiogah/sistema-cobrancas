// test_sprint5_m8a_fix.ts — Testes M8a corrigidos
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
  const { render, fireEvent, act } = await import("@testing-library/react");
  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  const { ChargeCard } = await import("/app/components/ChargeCard/ChargeCard");
  const { ClientAutocomplete } = await import("/app/components/ClientAutocomplete/ClientAutocomplete");
  const { ProductAutocomplete } = await import("/app/components/ProductAutocomplete/ProductAutocomplete");
  const { PaymentSelector } = await import("/app/components/PaymentSelector/PaymentSelector");
  const { ParcelPreview } = await import("/app/components/ParcelPreview/ParcelPreview");

  const mockParcela = (o: any = {}) => ({
    id: "p1", cobrancaId: "cb1", clienteId: "c1", numeroParcela: 1,
    valor: 200, valorPago: null, dataVencimento: hoje, status: "pendente",
    dataPagamento: null, dataCobrancaEnviada: null, arquivada: false,
    created_date: "", updated_date: "", ...o,
  });
  const mockCobranca = { id: "cb1", nomeProdutoServico: "Consultoria", quantidadeParcelas: 3, formaPagamento: "pix" as any, pixUtilizado: "email@pix.com", observacoes: "Teste" } as any;
  const mockCliente = { id: "c1", nome: "Maria Silva", telefone: "5511987654321" } as any;

  console.log("=== TESTES M8a — ChargeCard ===\n");

  // 1-5: Renderiza pendente
  { const { container } = render(React.createElement(ChargeCard, { parcela: mockParcela(), cobranca: mockCobranca, cliente: mockCliente } as any));
    const text = container.textContent || "";
    assert(text.includes("Maria Silva"), "1: mostra nome");
    assert(text.includes("Consultoria"), "2: mostra produto");
    assert(text.includes("Cobrar"), "3: mostra Cobrar");
    assert(text.includes("Marcar pago"), "4: mostra Marcar pago");
  }

  // 6: Cobrado
  { const { container } = render(React.createElement(ChargeCard, { parcela: mockParcela({ status: "cobrado", dataCobrancaEnviada: hoje }), cobranca: mockCobranca, cliente: mockCliente } as any));
    assert((container.textContent || "").includes("Confirmar envio"), "5: cobrado mostra Confirmar envio");
  }

  // 7: Pago sem ações
  { const { container } = render(React.createElement(ChargeCard, { parcela: mockParcela({ status: "pago", valorPago: 200, dataPagamento: hoje }), cobranca: mockCobranca, cliente: mockCliente } as any));
    const text = container.textContent || "";
    assert(!text.includes("Cobrar"), "6: pago sem Cobrar");
    assert(!text.includes("Marcar pago"), "7: pago sem Marcar pago");
  }

  // 8: Pago parcial
  { const { container } = render(React.createElement(ChargeCard, { parcela: mockParcela({ status: "pago_parcial", valorPago: 100 }), cobranca: mockCobranca, cliente: mockCliente } as any));
    assert((container.textContent || "").includes("de"), "8: pago_parcial mostra X de Y");
  }

  // 9: onCharge callback
  { let called = false;
    const { container } = render(React.createElement(ChargeCard, { parcela: mockParcela(), cobranca: mockCobranca, cliente: mockCliente, onCharge: () => { called = true; } } as any));
    const btn = Array.from(container.querySelectorAll("button")).find(b => b.textContent?.includes("Cobrar"));
    if (btn) { act(() => { fireEvent.click(btn); }); }
    assert(called, "9: onCharge chamado");
  }

  // 10: onMarkPaid via menu
  { let called = false;
    const { container } = render(React.createElement(ChargeCard, { parcela: mockParcela(), cobranca: mockCobranca, cliente: mockCliente, onMarkPaid: () => { called = true; } } as any));
    const btn = Array.from(container.querySelectorAll("button")).find(b => b.textContent?.includes("Marcar pago"));
    if (btn) { act(() => { fireEvent.click(btn); }); }
    const totalBtn = Array.from(container.querySelectorAll("button")).find(b => b.textContent?.includes("Pagamento total"));
    if (totalBtn) { act(() => { fireEvent.click(totalBtn); }); }
    assert(called, "10: onMarkPaid chamado");
  }

  // 11: Expansão mostra PIX
  { const { container } = render(React.createElement(ChargeCard, { parcela: mockParcela(), cobranca: mockCobranca, cliente: mockCliente } as any));
    const center = container.querySelector(".cursor-pointer");
    if (center) { act(() => { fireEvent.click(center); }); }
    const text = container.textContent || "";
    assert(text.includes("PIX"), "11: expansão mostra PIX");
    assert(text.includes("email@pix.com"), "12: mostra chave PIX");
  }

  // 13: Atrasada
  { const ontem = new Date(Date.now() - 86400000).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
    const { container } = render(React.createElement(ChargeCard, { parcela: mockParcela({ dataVencimento: ontem }), cobranca: mockCobranca, cliente: mockCliente } as any));
    assert((container.textContent || "").includes("Atrasada"), "13: mostra Atrasada");
  }

  // 14: onSelect
  { let selected = false;
    const { container } = render(React.createElement(ChargeCard, { parcela: mockParcela(), cobranca: mockCobranca, cliente: mockCliente, onSelect: () => { selected = true; } } as any));
    const btns = Array.from(container.querySelectorAll("button"));
    const circle = btns.find(b => b.className.includes("rounded-full")) || btns[0];
    if (circle) { act(() => { fireEvent.click(circle); }); }
    assert(selected, "14: onSelect chamado");
  }

  console.log("\n=== TESTES M8a — ClientAutocomplete ===\n");

  // 15: Renderiza com lista
  { const mockClientes = [
    { id: "c1", nome: "Maria Silva", telefone: "5511987654321", ativo: true } as any,
    { id: "c2", nome: "João Costa", telefone: "5511912345678", ativo: true } as any,
  ];
    const { container } = render(React.createElement(ClientAutocomplete, { onSelect: () => {}, clientes: mockClientes } as any));
    const input = container.querySelector("input");
    assert(input !== null, "15: input renderizado");
    // Simular focus para mostrar a lista
    if (input) { act(() => { fireEvent.focus(input); }); }
    const text = container.textContent || "";
    assert(text.includes("RECENTES"), "16: mostra RECENTES");
    assert(text.includes("Maria Silva"), "17: mostra nome na lista");
  }

  // 18: Botão cadastrar
  { const mockClientes = [{ id: "c1", nome: "Maria", telefone: "5511", ativo: true } as any];
    const { container } = render(React.createElement(ClientAutocomplete, { onSelect: () => {}, clientes: mockClientes } as any));
    const input = container.querySelector("input");
    if (input) { act(() => { fireEvent.focus(input); }); }
    assert((container.textContent || "").includes("Cadastrar novo"), "18: mostra cadastrar");
  }

  console.log("\n=== TESTES M8a — ProductAutocomplete ===\n");

  // 19: MAIS VENDIDOS ordenado
  { const mockProdutos = [
    { id: "p1", nome: "Consultoria", valorPadrao: 200, vezesUsado: 5 } as any,
    { id: "p2", nome: "Design", valorPadrao: 100, vezesUsado: 10 } as any,
  ];
    const { container } = render(React.createElement(ProductAutocomplete, { onSelect: () => {}, produtos: mockProdutos } as any));
    const input = container.querySelector("input");
    if (input) { act(() => { fireEvent.focus(input); }); }
    const text = container.textContent || "";
    assert(text.includes("MAIS VENDIDOS"), "19: mostra MAIS VENDIDOS");
    assert(text.indexOf("Design") < text.indexOf("Consultoria"), "20: ordenado por vezesUsado desc");
  }

  // 21: Venda avulsa
  { const { container } = render(React.createElement(ProductAutocomplete, { onSelect: () => {}, produtos: [], allowVendaAvulsa: true } as any));
    const input = container.querySelector("input");
    if (input) { act(() => { fireEvent.focus(input); }); }
    assert((container.textContent || "").includes("Venda avulsa"), "21: mostra Venda avulsa");
  }

  console.log("\n=== TESTES M8a — PaymentSelector ===\n");

  // 22: 5 opções
  { const { container } = render(React.createElement(PaymentSelector, { value: null, onChange: () => {}, quantidadeParcelas: 1, onQuantidadeParcelasChange: () => {} } as any));
    const text = container.textContent || "";
    assert(text.includes("PIX"), "22a: tem PIX");
    assert(text.includes("Cartão Crédito"), "22b: tem Cartão Crédito");
    assert(text.includes("Cartão Débito"), "22c: tem Cartão Débito");
    assert(text.includes("Dinheiro"), "22d: tem Dinheiro");
    assert(text.includes("Transferência"), "22e: tem Transferência");
    assert(!text.includes("Boleto"), "22f: sem Boleto");
  }

  // 23: Campo PIX
  { const { container } = render(React.createElement(PaymentSelector, { value: "pix" as any, onChange: () => {}, pixUtilizado: "", onPixUtilizadoChange: () => {}, quantidadeParcelas: 1, onQuantidadeParcelasChange: () => {} } as any));
    assert((container.textContent || "").includes("PIX utilizado"), "23: campo PIX aparece");
  }

  // 24: À Vista/Parcelado
  { const { container } = render(React.createElement(PaymentSelector, { value: "dinheiro" as any, onChange: () => {}, quantidadeParcelas: 1, onQuantidadeParcelasChange: () => {} } as any));
    const text = container.textContent || "";
    assert(text.includes("À Vista"), "24a: tem À Vista");
    assert(text.includes("Parcelado"), "24b: tem Parcelado");
  }

  console.log("\n=== TESTES M8a — ParcelPreview ===\n");

  // 25: Renderiza parcelas
  { const { container } = render(React.createElement(ParcelPreview, { valor: 600, quantidadeParcelas: 3, primeiroVencimento: "2026-07-15", diaVencimentoFixo: 15 } as any));
    const text = container.textContent || "";
    assert(text.includes("Total"), "25: mostra Total");
    assert(text.includes("200"), "26: mostra valor parcela");
  }

  // 27: Soma = 100
  { const { container } = render(React.createElement(ParcelPreview, { valor: 100, quantidadeParcelas: 3, primeiroVencimento: "2026-07-15", diaVencimentoFixo: 15 } as any));
    assert((container.textContent || "").includes("100,00"), "27: soma total=100");
  }

  console.log("\n=== TESTES M8a — React.memo e setInterval ===\n");

  // 28: Todos são React.memo
  {
    const files = ["ChargeCard", "ClientAutocomplete", "ProductAutocomplete", "PaymentSelector", "ParcelPreview"];
    const ok = files.every(f => readFileSync(`/app/components/${f}/${f}.tsx`, "utf-8").includes("React.memo"));
    assert(ok, "28: todos componentes são React.memo");
  }

  // 29: Nenhum usa setInterval(
  {
    const all = readFileSync("/app/components/ChargeCard/ChargeCard.tsx", "utf-8")
      + readFileSync("/app/components/ClientAutocomplete/ClientAutocomplete.tsx", "utf-8")
      + readFileSync("/app/components/ProductAutocomplete/ProductAutocomplete.tsx", "utf-8")
      + readFileSync("/app/components/PaymentSelector/PaymentSelector.tsx", "utf-8")
      + readFileSync("/app/components/ParcelPreview/ParcelPreview.tsx", "utf-8");
    assert(!all.includes("setInterval("), "29: nenhum usa setInterval(");
  }

  console.log("\n=== RESULTADO M8a ===");
  console.log(`Pass: ${pass}, Fail: ${fail}`);
  if (fail === 0) { console.log("=== TODOS OS TESTES M8a PASSARAM! ==="); } else { console.log("=== FALHAS DETECTADAS ==="); process.exit(1); }
}

main().catch(err => { console.error("ERRO FATAL:", err); process.exit(1); });
