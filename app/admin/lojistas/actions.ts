"use server";

import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "../../../lib/prisma";

function siteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` ||
    "https://mouratoassociados.com.br"
  );
}

function gerarCodigoRevenda(nome: string, id?: number) {
  const base = nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "lojista";

  return `${base}-${id || randomBytes(3).toString("hex")}`;
}

async function enviarEmailRecuperacao(email: string, nome: string, link: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "Mourato & Associados <onboarding@resend.dev>";

  if (!apiKey) {
    return { sent: false, error: "Serviço de e-mail não configurado. Copie o link e envie manualmente." };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: email,
      subject: "Recuperação de senha - Mourato & Associados",
      html: `
        <p>Olá, ${nome}.</p>
        <p>O administrador gerou um link para você criar uma nova senha de lojista.</p>
        <p><a href="${link}">Clique aqui para redefinir sua senha</a></p>
        <p>Depois da troca, o administrador precisará aprovar seu acesso novamente.</p>
      `,
    }),
  });

  if (!response.ok) {
    return { sent: false, error: "Não foi possível enviar o e-mail automaticamente." };
  }

  return { sent: true };
}

export async function createLojista(formData: FormData) {
  const nome = String(formData.get("nome") || "").trim();
  const documento = String(formData.get("documento") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const telefone = String(formData.get("telefone") || "").trim();
  const endereco = String(formData.get("endereco") || "").trim();
  const cidade = String(formData.get("cidade") || "").trim();
  const estado = String(formData.get("estado") || "").trim().toUpperCase();
  const cep = String(formData.get("cep") || "").trim();
  const senha = String(formData.get("senha") || "");
  const confirmarSenha = String(formData.get("confirmarSenha") || "");

  if (!nome || !documento || !email || !telefone || !senha || !confirmarSenha) {
    return { success: false, error: "Preencha nome, CPF/CNPJ, e-mail, WhatsApp, senha e confirmação da senha." };
  }

  if (senha.length < 6) {
    return { success: false, error: "A senha precisa ter pelo menos 6 caracteres." };
  }

  if (senha !== confirmarSenha) {
    return { success: false, error: "As senhas não conferem. Digite a mesma senha nos dois campos." };
  }

  try {
    const existing = await prisma.usuario.findUnique({
      where: { email },
    });

    if (existing) {
      return { success: false, error: "Este e-mail já está cadastrado." };
    }

    const hashedPassword = await bcrypt.hash(senha, 10);

    const novo = await prisma.usuario.create({
      data: {
        nome,
        documento,
        email,
        telefone,
        endereco,
        cidade,
        estado,
        cep,
        senha: hashedPassword,
        tipo: "lojista",
        status: "aprovado",
        codigoRevenda: gerarCodigoRevenda(nome),
        estoquePessoal: {},
      },
    });

    if (!String(novo.codigoRevenda || "").match(/\d|[a-f]{6}$/)) {
      await prisma.usuario.update({
        where: { id: novo.id },
        data: { codigoRevenda: gerarCodigoRevenda(nome, novo.id) },
      });
    }

    revalidatePath("/admin");
    revalidatePath("/admin/lojistas");
    return { success: true };
  } catch (error) {
    console.error("Erro ao cadastrar lojista:", error);
    return { success: false, error: "Erro ao cadastrar lojista" };
  }
}

export async function deleteLojista(id: number) {
  try {
    // Verificar se o lojista possui pedidos ativos (não cancelados)
    const pedidosAtivos = await prisma.pedido.count({
      where: {
        usuarioId: id,
        status: { notIn: ["cancelado"] },
      },
    });

    if (pedidosAtivos > 0) {
      return {
        success: false,
        error: `Este lojista possui ${pedidosAtivos} pedido(s) ativo(s). Cancele todos os pedidos antes de excluir o cadastro.`,
      };
    }

    await prisma.usuario.delete({
      where: { id },
    });

    revalidatePath("/admin");
    revalidatePath("/admin/lojistas");
    return { success: true };
  } catch (error) {
    console.error("Erro ao excluir lojista:", error);
    return { success: false, error: "Erro ao excluir lojista" };
  }
}

export async function aprovarLojista(id: number) {
  try {
    const lojista = await prisma.usuario.findUnique({
      where: { id },
    });

    if (!lojista) {
      return { success: false, error: "Lojista não encontrado." };
    }

    const senhaAtual = String(lojista.senha || "");
    const senhaSegura = senhaAtual.startsWith("$2") ? senhaAtual : await bcrypt.hash(senhaAtual, 10);

    await prisma.usuario.update({
      where: { id },
      data: {
        senha: senhaSegura,
        status: "aprovado",
        codigoRevenda: lojista.codigoRevenda || gerarCodigoRevenda(lojista.nome, lojista.id),
        estoquePessoal: lojista.estoquePessoal || {},
        resetToken: null,
        resetExpiresAt: null,
        resetRequestedAt: null,
      },
    });

    revalidatePath("/admin");
    revalidatePath("/admin/lojistas");
    return { success: true };
  } catch (error) {
    console.error("Erro ao aprovar lojista:", error);
    return { success: false, error: "Erro ao aprovar lojista." };
  }
}

export async function gerarLinkRecuperacaoLojista(id: number) {
  try {
    const lojista = await prisma.usuario.findUnique({
      where: { id },
    });

    if (!lojista || lojista.tipo !== "lojista") {
      return { success: false, error: "Lojista não encontrado." };
    }

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
    const link = `${siteUrl()}/lojista/redefinir/${token}`;

    await prisma.usuario.update({
      where: { id },
      data: {
        resetToken: token,
        resetExpiresAt: expiresAt,
        resetRequestedAt: new Date().toISOString(),
      },
    });

    const emailResult = await enviarEmailRecuperacao(lojista.email, lojista.nome, link);

    revalidatePath("/admin");
    revalidatePath("/admin/lojistas");

    return {
      success: true,
      link,
      emailed: emailResult.sent,
      message: emailResult.sent
        ? "Link enviado por e-mail. Após a troca de senha, aprove o lojista novamente."
        : emailResult.error,
    };
  } catch (error) {
    console.error("Erro ao gerar recuperação:", error);
    return { success: false, error: "Erro ao gerar link de recuperação." };
  }
}

export async function registrarPagamentoFornecedor(formData: FormData) {
  const pedidoId = Number(formData.get("pedidoId"));
  const quantidadePaga = Number(formData.get("quantidadePaga"));

  if (!pedidoId || !quantidadePaga || quantidadePaga < 1) {
    return;
  }

  try {
    const pedido = await prisma.pedido.findUnique({
      where: { id: pedidoId },
    });

    if (!pedido) {
      return;
    }

    const fluxoFornecedor =
      String(pedido.tipoFluxo || "") === "compra_fornecedor" ||
      String(pedido.pagamento || "").includes("Pedido ao fornecedor") ||
      String(pedido.pagamento || "").includes("Compra do fornecedor");

    if (!fluxoFornecedor) {
      return;
    }

    const produto = pedido.produtoId ? await prisma.produto.findUnique({ where: { id: pedido.produtoId } }) : null;
    const quantidadeTotal = Number(pedido.quantidade || 0);
    const quantidadeJaPaga = Number(pedido.quantidadePagaFornecedor || 0);
    const quantidadeRestante = Math.max(0, quantidadeTotal - quantidadeJaPaga);
    const quantidadeBaixa = Math.min(quantidadePaga, quantidadeRestante);

    if (quantidadeBaixa < 1) {
      return;
    }

    const precoUnitario = Number(pedido.precoUnitario || produto?.precoAtacado || 0);
    const totalPagoFornecedor = Number(pedido.totalPagoFornecedor || 0) + quantidadeBaixa * precoUnitario;
    const saldoFornecedor = Math.max(0, Number(pedido.total || 0) - totalPagoFornecedor);
    const quantidadePagaFornecedor = quantidadeJaPaga + quantidadeBaixa;

    await prisma.pedido.update({
      where: { id: pedido.id },
      data: {
        quantidadePagaFornecedor,
        totalPagoFornecedor,
        saldoFornecedor,
        tipoFluxo: "compra_fornecedor",
        status: saldoFornecedor <= 0 ? "pago" : "pendente fornecedor",
      },
    });

    if (produto) {
      await prisma.produto.update({
        where: { id: produto.id },
        data: {
          estoque: Math.max(0, Number(produto.estoque || 0) - quantidadeBaixa),
          estoqueLojista: Math.max(0, Number(produto.estoqueLojista || 0) - quantidadeBaixa),
        },
      });
    }

    revalidatePath("/admin");
    revalidatePath("/admin/lojistas");
    revalidatePath(`/admin/lojistas/${pedido.usuarioId}`);
    revalidatePath("/admin/pedidos");
    revalidatePath("/admin/produtos");
    revalidatePath("/lojista/painel");
    revalidatePath("/produtos");

  } catch (error) {
    console.error("Erro ao registrar pagamento do fornecedor:", error);
  }
}
