"use server";

import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma";

export async function cadastrarLojista(formData: FormData) {
  const nome = String(formData.get("nome") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const senha = String(formData.get("senha") || "");
  const confirmarSenha = String(formData.get("confirmarSenha") || "");
  const documento = String(formData.get("documento") || "").trim();
  const telefone = String(formData.get("telefone") || "").trim();
  const endereco = String(formData.get("endereco") || "").trim();
  const cidade = String(formData.get("cidade") || "").trim();
  const estado = String(formData.get("estado") || "").trim().toUpperCase();
  const cep = String(formData.get("cep") || "").trim();

  // Todos os campos são obrigatórios
  if (
    !nome ||
    !email ||
    !senha ||
    !confirmarSenha ||
    !documento ||
    !telefone ||
    !endereco ||
    !cidade ||
    !estado ||
    !cep
  ) {
    return { success: false, error: "Todos os campos do cadastro são obrigatórios." };
  }

  if (senha !== confirmarSenha) {
    return { success: false, error: "As senhas não coincidem." };
  }

  if (senha.length < 6) {
    return { success: false, error: "A senha precisa ter pelo menos 6 caracteres." };
  }

  try {
    const existing = await prisma.usuario.findUnique({
      where: { email },
    });

    if (existing) {
      return { success: false, error: "Este e-mail já está cadastrado." };
    }

    const hashedPassword = await bcrypt.hash(senha, 10);

    await prisma.usuario.create({
      data: {
        nome,
        email,
        senha: hashedPassword,
        tipo: "lojista",
        documento,
        telefone,
        endereco,
        cidade,
        estado,
        cep,
        status: "pendente",
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Erro ao cadastrar lojista:", error);
    return { success: false, error: "Não foi possível concluir o cadastro." };
  }
}
