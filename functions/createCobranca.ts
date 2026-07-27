// functions/createCobranca.ts — Backend function: cria cobrança + parcelas atomicamente (M2)
//
// Duplicação consciente de dividirValor e adicionarMeses de lib/ (M3a).
// Backend functions em Base44 são isoladas — não importam de src/.
// Se M3a mudar, revalidar este arquivo contra os mesmos testes.

import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const input = await req.json();

    // ===== VALIDAÇÃO =====
    const erros: string[] = [];

    if (!input.clienteId) erros.push("Cliente é obrigatório");
    if (!input.nomeProdutoServico || String(input.nomeProdutoServico).trim().length < 3)
      erros.push("Nome do produto/serviço deve ter no mínimo 3 caracteres");
    if (!input.valor || input.valor <= 0 || input.valor > 999999.99)
      erros.push("Valor deve ser maior que zero e menor ou igual a 999999.99");
    if (!input.quantidadeParcelas || !Number.isInteger(input.quantidadeParcelas) || input.quantidadeParcelas < 1 || input.quantidadeParcelas > 60)
      erros.push("Quantidade de parcelas deve ser entre 1 e 60");
    if (!input.formaPagamento || !["pix", "dinheiro", "cartao_credito", "cartao_debito", "transferencia"].includes(input.formaPagamento))
      erros.push("Forma de pagamento inválida");
    if (input.formaPagamento === "pix" && (!input.pixUtilizado || String(input.pixUtilizado).trim() === ""))
      erros.push("PIX utilizado é obrigatório quando a forma de pagamento é PIX");
    if (!input.diaVencimentoFixo || ![5, 10, 15, 20, 25, 30].includes(input.diaVencimentoFixo))
      erros.push("Dia de vencimento fixo deve ser um dos valores: 5, 10, 15, 20, 25, 30");
    if (!input.primeiroVencimento || !/^\d{4}-\d{2}-\d{2}$/.test(input.primeiroVencimento))
      erros.push("Primeiro vencimento deve ser uma data válida no formato YYYY-MM-DD");

    if (erros.length > 0) {
      return new Response(JSON.stringify({ sucesso: false, erros }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ===== FUNÇÕES DUPLICADAS DE M3a =====
    // dividirValor — arredondamento na última parcela
    function dividirValor(valor: number, parcelas: number) {
      const valorBase = Math.floor((valor / parcelas) * 100) / 100;
      const valorUltima = Math.round((valor - (valorBase * (parcelas - 1))) * 100) / 100;
      return { valorBase, valorUltima };
    }

    // adicionarMeses — ajusta mês curto
    function adicionarMeses(data: string, meses: number): string {
      const [y, m, d] = data.split("-").map(Number);
      let year = y;
      let month = m + meses;
      while (month > 12) { month -= 12; year += 1; }
      while (month < 1) { month += 12; year -= 1; }
      const targetDate = new Date(year, month, 0);
      const maxDay = targetDate.getDate();
      const day = Math.min(d, maxDay);
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }

    // mesAlvoExisteDia
    function mesAlvoExisteDia(ano: number, mes: number, dia: number): boolean {
      const d = new Date(ano, mes - 1, dia);
      return d.getFullYear() === ano && (d.getMonth() + 1) === mes && d.getDate() === dia;
    }

    // calcularVencimentoParcela
    function calcularVencimentoParcela(primeiroVencimento: string, diaVencimentoFixo: number, numeroParcela: number): string {
      if (numeroParcela === 1) return primeiroVencimento;
      const base = adicionarMeses(primeiroVencimento, numeroParcela - 1);
      const [ano, mes] = base.split("-").map(Number);
      if (mesAlvoExisteDia(ano, mes, diaVencimentoFixo)) {
        return `${ano}-${String(mes).padStart(2, "0")}-${String(diaVencimentoFixo).padStart(2, "0")}`;
      }
      const lastDay = new Date(ano, mes, 0).getDate();
      return `${ano}-${String(mes).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    }

    // ===== CRIAR COBRANÇA =====
    const cobranca = await base44.entities.Cobranca.create({
      clienteId: input.clienteId,
      produtoServicoId: input.produtoServicoId || null,
      nomeProdutoServico: input.nomeProdutoServico,
      valor: input.valor,
      formaPagamento: input.formaPagamento,
      quantidadeParcelas: input.quantidadeParcelas,
      primeiroVencimento: input.primeiroVencimento,
      diaVencimentoFixo: input.diaVencimentoFixo,
      pixUtilizado: input.pixUtilizado || null,
      observacoes: input.observacoes || "",
    });

    // ===== CALCULAR E CRIAR PARCELAS =====
    const { valorBase, valorUltima } = dividirValor(input.valor, input.quantidadeParcelas);

    const parcelasData = [];
    for (let i = 1; i <= input.quantidadeParcelas; i++) {
      const valorParcela = i === input.quantidadeParcelas ? valorUltima : valorBase;
      const dataVencimento = calcularVencimentoParcela(input.primeiroVencimento, input.diaVencimentoFixo, i);
      parcelasData.push({
        cobrancaId: cobranca.id,
        clienteId: input.clienteId,
        numeroParcela: i,
        valor: valorParcela,
        valorPago: null,
        dataVencimento: dataVencimento,
        status: "pendente",
        dataPagamento: null,
        dataCobrancaEnviada: null,
        arquivada: false,
      });
    }

    // Criar parcelas — uma a uma (createMany não existe no SDK, usar Promise.all)
    try {
      const parcelasCriadas = await Promise.all(
        parcelasData.map((p) => base44.entities.Parcela.create(p))
      );

      // ===== INCREMENTAR vezesUsado (best-effort) =====
      if (input.produtoServicoId) {
        try {
          const produto = await base44.asServiceRole.entities.ProdutoServico.get(input.produtoServicoId);
          if (produto) {
            await base44.asServiceRole.entities.ProdutoServico.update(input.produtoServicoId, {
              vezesUsado: (produto.vezesUsado || 0) + 1,
            });
          }
        } catch (e) {
          // Não crítico — registrar e continuar
          console.log("[createCobranca] Aviso ao incrementar vezesUsado:", e);
        }
      }

      return new Response(JSON.stringify({
        sucesso: true,
        cobrancaId: cobranca.id,
        parcelas: parcelasCriadas.map((p) => ({
          numeroParcela: p.numeroParcela,
          valor: p.valor,
          dataVencimento: p.dataVencimento,
        })),
      }), {
        headers: { "Content-Type": "application/json" },
      });

    } catch (batchError) {
      // ===== COMPENSAÇÃO: deletar cobrança se batch falha =====
      try {
        await base44.entities.Cobranca.delete(cobranca.id);
      } catch (deleteError) {
        console.log("[createCobranca] Falha ao deletar cobranca órfã:", deleteError);
      }

      return new Response(JSON.stringify({
        sucesso: false,
        erro: "Falha ao criar parcelas. Cobrança removida.",
        detalhe: batchError instanceof Error ? batchError.message : String(batchError),
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

  } catch (error) {
    return new Response(JSON.stringify({
      sucesso: false,
      erro: error instanceof Error ? error.message : String(error),
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
