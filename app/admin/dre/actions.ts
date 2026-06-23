"use server";

import { revalidatePath } from "next/cache";
import { getAdminSession } from "../../../lib/auth";
import {
  calcularFinanceiro,
  normalizarCompetencia,
} from "../../../lib/financeiro";
import { prisma } from "../../../lib/prisma";

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

export async function excluirDespesa(id: number) {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Sessão administrativa expirada." };

  const lancamento = await prisma.lancamentoFinanceiro.findUnique({ where: { id } });
  if (!lancamento) return { success: false, error: "Despesa não encontrada." };

  const fechamento = await prisma.fechamentoFinanceiro.findFirst({
    where: { competencia: lancamento.competencia },
  });
  if (fechamento) {
    return { success: false, error: "Despesas de um mês fechado não podem ser excluídas." };
  }

  await prisma.lancamentoFinanceiro.delete({ where: { id } });
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
