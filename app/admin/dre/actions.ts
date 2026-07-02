"use server";

import { revalidatePath } from "next/cache";
import { getAdminSession } from "../../../lib/auth";
import {
  calcularFinanceiro,
  normalizarCompetencia,
  competenciaAtual,
} from "../../../lib/financeiro";
import { prisma } from "../../../lib/prisma";

export async function criarPassivo(formData: FormData) {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Sessão administrativa expirada." };

  const data = String(formData.get("data") || "");
  const categoria = String(formData.get("categoria") || "").trim();
  const valor = Number(formData.get("valor") || 0);
  const observacao = String(formData.get("observacao") || "").trim();
  const competencia = normalizarCompetencia(data.slice(0, 7));

  if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || !categoria || valor <= 0)
    return { success: false, error: "Preencha data, categoria e valor corretamente." };

  const fechamento = await prisma.fechamentoFinanceiro.findFirst({ where: { competencia } });
  if (fechamento) return { success: false, error: "Este mês já foi fechado." };

  await prisma.lancamentoFinanceiro.create({
    data: {
      data: new Date(`${data}T12:00:00`).toISOString(),
      competencia,
      tipo: "passivo",
      grupo: "passivo_operacional",
      categoria,
      valor,
      observacao: observacao || null,
    },
  });
  revalidatePath("/admin/dre");
  return { success: true };
}

export async function criarInvestimento(formData: FormData) {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Sessão administrativa expirada." };

  const data = String(formData.get("data") || "");
  const categoria = String(formData.get("categoria") || "").trim();
  const valor = Number(formData.get("valor") || 0);
  const observacao = String(formData.get("observacao") || "").trim();
  const competencia = normalizarCompetencia(data.slice(0, 7));

  if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || !categoria || valor <= 0)
    return { success: false, error: "Preencha data, categoria e valor corretamente." };

  const fechamento = await prisma.fechamentoFinanceiro.findFirst({ where: { competencia } });
  if (fechamento) return { success: false, error: "Este mês já foi fechado." };

  await prisma.lancamentoFinanceiro.create({
    data: {
      data: new Date(`${data}T12:00:00`).toISOString(),
      competencia,
      tipo: "investimento",
      grupo: "ativo_financeiro",
      categoria,
      valor,
      observacao: observacao || null,
    },
  });
  revalidatePath("/admin/dre");
  return { success: true };
}

export async function criarEmprestimo(formData: FormData) {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Sessão administrativa expirada." };

  const banco = String(formData.get("banco") || "").trim();
  const dataStr = String(formData.get("data") || "");
  const valorRecebido = Number(formData.get("valorRecebido") || 0);
  const valorParcela = Math.round(Number(formData.get("valorParcela") || 0) * 100) / 100;
  const totalParcelas = Math.max(1, Math.round(Number(formData.get("totalParcelas") || 1)));
  const observacao = String(formData.get("observacao") || "").trim();

  if (!banco) return { success: false, error: "Informe o nome do banco." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataStr)) return { success: false, error: "Data inválida." };
  if (valorRecebido <= 0) return { success: false, error: "Informe o valor recebido." };
  if (valorParcela <= 0) return { success: false, error: "Informe o valor da parcela." };

  // Lança o valor recebido como entrada no banco (LancamentoFinanceiro tipo emprestimo)
  const competencia = normalizarCompetencia(dataStr.slice(0, 7));
  await prisma.lancamentoFinanceiro.create({
    data: {
      data: new Date(`${dataStr}T12:00:00`).toISOString(),
      competencia,
      tipo: "emprestimo",
      grupo: "passivo_financeiro",
      categoria: banco,
      valor: valorRecebido,
      observacao: observacao || null,
    },
  });

  // Cria o registro de controle do empréstimo
  await prisma.emprestimo.create({
    data: {
      banco,
      valorRecebido,
      valorParcela,
      totalParcelas,
      parcelasPagas: 0,
      dataInicio: dataStr,
      observacao: observacao || null,
      status: "ativo",
    },
  });

  revalidatePath("/admin/dre");
  return { success: true };
}

export async function pagarParcela(emprestimoId: number, competencia: string) {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Sessão administrativa expirada." };

  const emprestimo = await prisma.emprestimo.findUnique({ where: { id: emprestimoId } });
  if (!emprestimo) return { success: false, error: "Empréstimo não encontrado." };
  if (emprestimo.status === "quitado") return { success: false, error: "Empréstimo já quitado." };

  const fechamento = await prisma.fechamentoFinanceiro.findFirst({ where: { competencia } });
  if (fechamento) return { success: false, error: "Este mês já foi fechado." };

  const novasParcelasPagas = Number(emprestimo.parcelasPagas || 0) + 1;
  const quitado = novasParcelasPagas >= Number(emprestimo.totalParcelas);
  const hoje = new Date().toISOString().slice(0, 10);

  await prisma.lancamentoFinanceiro.create({
    data: {
      data: new Date(`${hoje}T12:00:00`).toISOString(),
      competencia,
      tipo: "despesa",
      grupo: "despesa_financeira",
      categoria: `Parcela Empréstimo — ${emprestimo.banco}`,
      valor: Number(emprestimo.valorParcela),
      observacao: `Parcela ${novasParcelasPagas}/${emprestimo.totalParcelas}`,
    },
  });

  await prisma.emprestimo.update({
    where: { id: emprestimoId },
    data: {
      parcelasPagas: novasParcelasPagas,
      status: quitado ? "quitado" : "ativo",
    },
  });

  revalidatePath("/admin/dre");
  return { success: true };
}

export async function excluirEmprestimo(id: number) {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Sessão administrativa expirada." };
  await prisma.emprestimo.delete({ where: { id } });
  revalidatePath("/admin/dre");
  return { success: true };
}

export async function criarDespesa(formData: FormData) {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Sessão administrativa expirada." };

  const data = String(formData.get("data") || "");
  const categoria = String(formData.get("categoria") || "").trim();
  const valor = Number(formData.get("valor") || 0);
  const observacao = String(formData.get("observacao") || "").trim();
  const competencia = normalizarCompetencia(data.slice(0, 7));

  if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || !categoria || valor <= 0) {
    return { success: false, error: "Preencha data, categoria e valor corretamente." };
  }

  const fechamento = await prisma.fechamentoFinanceiro.findFirst({
    where: { competencia },
  });
  if (fechamento) {
    return { success: false, error: "Este mês já foi fechado e não aceita novos lançamentos." };
  }

  await prisma.lancamentoFinanceiro.create({
    data: {
      data: new Date(`${data}T12:00:00`).toISOString(),
      competencia,
      tipo: "despesa",
      grupo: "despesa_operacional",
      categoria,
      valor,
      observacao: observacao || null,
    },
  });

  revalidatePath("/admin/dre");
  return { success: true };
}

export async function excluirLancamento(id: number) {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Sessão administrativa expirada." };

  const lancamento = await prisma.lancamentoFinanceiro.findUnique({ where: { id } });
  if (!lancamento) return { success: false, error: "Lançamento não encontrado." };

  const fechamento = await prisma.fechamentoFinanceiro.findFirst({
    where: { competencia: lancamento.competencia },
  });
  if (fechamento) {
    return { success: false, error: "Lançamentos de um mês fechado não podem ser excluídos." };
  }

  await prisma.lancamentoFinanceiro.delete({ where: { id } });
  revalidatePath("/admin/dre");
  return { success: true };
}

export async function excluirDespesa(id: number) {
  return excluirLancamento(id);
}

export async function zerarTudo() {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Sessão administrativa expirada." };

  const lancamentos = await prisma.lancamentoFinanceiro.findMany();
  for (const l of lancamentos) {
    await prisma.lancamentoFinanceiro.delete({ where: { id: l.id } });
  }
  const emprestimos = await prisma.emprestimo.findMany();
  for (const e of emprestimos) {
    await prisma.emprestimo.delete({ where: { id: e.id } });
  }
  const fechamentos = await prisma.fechamentoFinanceiro.findMany();
  for (const f of fechamentos) {
    await prisma.fechamentoFinanceiro.delete({ where: { id: f.id } });
  }
  revalidatePath("/admin/dre");
  return { success: true };
}

export async function reabrirMes(competenciaInformada: string) {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Sessão administrativa expirada." };

  const competencia = normalizarCompetencia(competenciaInformada);
  const existente = await prisma.fechamentoFinanceiro.findFirst({ where: { competencia } });
  if (existente) {
    await prisma.fechamentoFinanceiro.delete({ where: { id: existente.id } });
  }
  revalidatePath("/admin/dre");
  return { success: true };
}

export async function fecharMes(competenciaInformada: string) {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Sessão administrativa expirada." };

  const competencia = normalizarCompetencia(competenciaInformada);
  const existente = await prisma.fechamentoFinanceiro.findFirst({
    where: { competencia },
  });
  if (existente) return { success: false, error: "Este mês já está fechado." };

  const [produtos, pedidos, lancamentos] = await Promise.all([
    prisma.produto.findMany(),
    prisma.pedido.findMany(),
    prisma.lancamentoFinanceiro.findMany(),
  ]);
  const resumo = calcularFinanceiro({
    produtos,
    pedidos,
    lancamentos,
    competencia,
  });

  await prisma.fechamentoFinanceiro.create({
    data: {
      competencia,
      fechadoEm: new Date().toISOString(),
      receitaAtacado: resumo.receitaAtacado,
      receitaSite: resumo.receitaSite,
      receitaTotal: resumo.receitaTotal,
      cmv: resumo.cmv,
      estoque: resumo.estoque,
      contasReceber: resumo.contasReceber,
      totalDespesas: resumo.totalDespesas,
      saldoBancario: resumo.saldoBancario,
      resultadoOperacional: resumo.resultadoOperacional,
      despesasPorCategoria: resumo.despesasPorCategoria,
    },
  });

  revalidatePath("/admin/dre");
  return { success: true };
}
