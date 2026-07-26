// lib/seed-test-data.ts — Cria dados de teste com datas relativas a hoje (reutilizável em M9, M10, M14, M15)
//
// Deployado como backend function para poder ser chamado via HTTP a qualquer momento.
// Cria 5 clientes, 3 produtos, cobranças variadas e parcelas cobrindo todos os cenários de teste.

// Helper: formata data para YYYY-MM-DD
function formatarData(date: Date): string {
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, "0");
  const dia = String(date.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

// Helper: adiciona dias a uma data
function adicionarDias(date: Date, dias: number): Date {
  const nova = new Date(date);
  nova.setDate(nova.getDate() + dias);
  return nova;
}

export default async function seedTestData(input?: { limpar?: boolean }) {
  const limpar = input?.limpar ?? true;
  const hoje = new Date();
  const hojeStr = formatarData(hoje);

  try {
    // Limpar dados existentes se solicitado
    if (limpar) {
      try {
        const parcelas = await base44.entities.Parcela.list({ limit: 500 });
        for (const p of parcelas) {
          await base44.entities.Parcela.delete(p.id);
        }
      } catch (e) {
        console.log("[seed] Aviso ao limpar parcelas:", e);
      }

      try {
        const cobrancas = await base44.entities.Cobranca.list({ limit: 500 });
        for (const c of cobrancas) {
          await base44.entities.Cobranca.delete(c.id);
        }
      } catch (e) {
        console.log("[seed] Aviso ao limpar cobranças:", e);
      }

      try {
        const clientes = await base44.entities.Cliente.list({ limit: 500 });
        for (const c of clientes) {
          await base44.entities.Cliente.delete(c.id);
        }
      } catch (e) {
        console.log("[seed] Aviso ao limpar clientes:", e);
      }

      try {
        const produtos = await base44.entities.ProdutoServico.list({ limit: 500 });
        for (const p of produtos) {
          await base44.entities.ProdutoServico.delete(p.id);
        }
      } catch (e) {
        console.log("[seed] Aviso ao limpar produtos:", e);
      }

      try {
        const configs = await base44.entities.Configuracao.list({ limit: 10 });
        for (const c of configs) {
          await base44.entities.Configuracao.delete(c.id);
        }
      } catch (e) {
        console.log("[seed] Aviso ao limpar configurações:", e);
      }
    }

    // 1. Criar clientes
    const clientes = await Promise.all([
      base44.entities.Cliente.create({ nome: "Maria Silva", telefone: "5511987654321", ativo: true, observacoes: "Cliente desde 2024" }),
      base44.entities.Cliente.create({ nome: "João Pereira", telefone: "5511912345678", ativo: true, observacoes: "" }),
      base44.entities.Cliente.create({ nome: "Ana Costa", telefone: "5511998765432", ativo: true, observacoes: "Paga sempre em dia" }),
      base44.entities.Cliente.create({ nome: "Carlos Santos", telefone: "55119234567890", ativo: true, observacoes: "" }),
      base44.entities.Cliente.create({ nome: "Fernanda Souza", telefone: "5511977778888", ativo: false, observacoes: "Inativa temporariamente" }),
    ]);

    // 2. Criar produtos
    const produtos = await Promise.all([
      base44.entities.ProdutoServico.create({ nome: "Manutenção Mensal", valorPadrao: 200, vezesUsado: 8 }),
      base44.entities.ProdutoServico.create({ nome: "Consultoria", valorPadrao: 150, vezesUsado: 5 }),
      base44.entities.ProdutoServico.create({ nome: "Hospedagem", valorPadrao: 80, vezesUsado: 3 }),
    ]);

    // 3. Criar cobranças e parcelas
    // Cobrança 1: Maria - Manutenção Mensal - À vista - PIX - Vence HOJE
    const cob1 = await base44.entities.Cobranca.create({
      clienteId: clientes[0].id,
      produtoServicoId: produtos[0].id,
      nomeProdutoServico: "Manutenção Mensal",
      valor: 200,
      formaPagamento: "pix",
      quantidadeParcelas: 1,
      primeiroVencimento: hojeStr,
      diaVencimentoFixo: 5,
      pixUtilizado: "PIX João",
      observacoes: "",
    });
    await base44.entities.Parcela.create({
      cobrancaId: cob1.id, clienteId: clientes[0].id,
      numeroParcela: 1, valor: 200, valorPago: null,
      dataVencimento: hojeStr, status: "pendente",
      dataPagamento: null, dataCobrancaEnviada: null, arquivada: false,
    });

    // Cobrança 2: João - Consultoria - 3x - Dinheiro - Atrasada 10 dias (vermelha)
    const cob2 = await base44.entities.Cobranca.create({
      clienteId: clientes[1].id,
      produtoServicoId: produtos[1].id,
      nomeProdutoServico: "Consultoria",
      valor: 450,
      formaPagamento: "dinheiro",
      quantidadeParcelas: 3,
      primeiroVencimento: formatarData(adicionarDias(hoje, -12)),
      diaVencimentoFixo: 10,
      pixUtilizado: null,
      observacoes: "",
    });
    const cob2p1 = await base44.entities.Parcela.create({
      cobrancaId: cob2.id, clienteId: clientes[1].id,
      numeroParcela: 1, valor: 150, valorPago: null,
      dataVencimento: formatarData(adicionarDias(hoje, -12)), status: "pendente",
      dataPagamento: null, dataCobrancaEnviada: null, arquivada: false,
    });
    await base44.entities.Parcela.create({
      cobrancaId: cob2.id, clienteId: clientes[1].id,
      numeroParcela: 2, valor: 150, valorPago: null,
      dataVencimento: formatarData(adicionarDias(hoje, -2)), status: "pendente",
      dataPagamento: null, dataCobrancaEnviada: null, arquivada: false,
    });
    await base44.entities.Parcela.create({
      cobrancaId: cob2.id, clienteId: clientes[1].id,
      numeroParcela: 3, valor: 150, valorPago: null,
      dataVencimento: formatarData(adicionarDias(hoje, 8)), status: "pendente",
      dataPagamento: null, dataCobrancaEnviada: null, arquivada: false,
    });

    // Cobrança 3: Ana - Hospedagem - À vista - PIX - PAGA
    const cob3 = await base44.entities.Cobranca.create({
      clienteId: clientes[2].id,
      produtoServicoId: produtos[2].id,
      nomeProdutoServico: "Hospedagem",
      valor: 80,
      formaPagamento: "pix",
      quantidadeParcelas: 1,
      primeiroVencimento: formatarData(adicionarDias(hoje, -15)),
      diaVencimentoFixo: 15,
      pixUtilizado: "PIX Ana",
      observacoes: "",
    });
    await base44.entities.Parcela.create({
      cobrancaId: cob3.id, clienteId: clientes[2].id,
      numeroParcela: 1, valor: 80, valorPago: 80,
      dataVencimento: formatarData(adicionarDias(hoje, -15)), status: "pago",
      dataPagamento: formatarData(adicionarDias(hoje, -14)), dataCobrancaEnviada: formatarData(adicionarDias(hoje, -15)), arquivada: false,
    });

    // Cobrança 4: Carlos - Manutenção Mensal - À vista - PIX - PAGO PARCIAL (R$ 100 de R$ 200)
    const cob4 = await base44.entities.Cobranca.create({
      clienteId: clientes[3].id,
      produtoServicoId: produtos[0].id,
      nomeProdutoServico: "Manutenção Mensal",
      valor: 200,
      formaPagamento: "pix",
      quantidadeParcelas: 1,
      primeiroVencimento: formatarData(adicionarDias(hoje, -3)),
      diaVencimentoFixo: 20,
      pixUtilizado: "PIX Carlos",
      observacoes: "",
    });
    await base44.entities.Parcela.create({
      cobrancaId: cob4.id, clienteId: clientes[3].id,
      numeroParcela: 1, valor: 200, valorPago: 100,
      dataVencimento: formatarData(adicionarDias(hoje, -3)), status: "pago_parcial",
      dataPagamento: null, dataCobrancaEnviada: formatarData(adicionarDias(hoje, -3)), arquivada: false,
    });

    // Cobrança 5: Maria - Venda Avulsa - À vista - Dinheiro - ARQUIVADA
    const cob5 = await base44.entities.Cobranca.create({
      clienteId: clientes[0].id,
      produtoServicoId: null,
      nomeProdutoServico: "Instalação extra",
      valor: 50,
      formaPagamento: "dinheiro",
      quantidadeParcelas: 1,
      primeiroVencimento: formatarData(adicionarDias(hoje, -20)),
      diaVencimentoFixo: 25,
      pixUtilizado: null,
      observacoes: "",
    });
    await base44.entities.Parcela.create({
      cobrancaId: cob5.id, clienteId: clientes[0].id,
      numeroParcela: 1, valor: 50, valorPago: null,
      dataVencimento: formatarData(adicionarDias(hoje, -20)), status: "pendente",
      dataPagamento: null, dataCobrancaEnviada: null, arquivada: true,
    });

    // Cobrança 6: Ana - Consultoria - 10x - PIX - Futuras
    const cob6 = await base44.entities.Cobranca.create({
      clienteId: clientes[2].id,
      produtoServicoId: produtos[1].id,
      nomeProdutoServico: "Consultoria",
      valor: 1500,
      formaPagamento: "pix",
      quantidadeParcelas: 10,
      primeiroVencimento: formatarData(adicionarDias(hoje, 5)),
      diaVencimentoFixo: 10,
      pixUtilizado: "PIX Ana",
      observacoes: "Contrato anual",
    });
    for (let i = 0; i < 10; i++) {
      const dataVenc = new Date(hoje);
      dataVenc.setDate(5 + (i * 30)); // aproximação: 1 parcela por mês
      await base44.entities.Parcela.create({
        cobrancaId: cob6.id, clienteId: clientes[2].id,
        numeroParcela: i + 1, valor: 150, valorPago: null,
        dataVencimento: formatarData(adicionarDias(hoje, 5 + i * 30)), status: "pendente",
        dataPagamento: null, dataCobrancaEnviada: null, arquivada: false,
      });
    }

    // 4. Criar configuração
    await base44.entities.Configuracao.create({
      diasTrabalhados: "1,2,3,4,5",
    });

    return {
      sucesso: true,
      mensagem: "Dados de teste criados com sucesso",
      resumo: {
        clientes: 5,
        produtos: 3,
        cobrancas: 6,
        parcelas: 16,
        configuracao: 1,
        dataHoje: hojeStr,
      },
    };
  } catch (error) {
    return {
      sucesso: false,
      erro: error instanceof Error ? error.message : String(error),
    };
  }
}
