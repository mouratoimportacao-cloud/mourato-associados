"use server";

import { cookies } from "next/headers";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import { signJwt, verifyJwt } from "./jwt";

const JWT_SECRET = process.env.JWT_SECRET || "mourato-associados-default-secret-key-12345";

export interface SessionPayload {
  id: number;
  nome: string;
  email: string;
  tipo: string;
}

// Function to auto-seed admin if database doesn't have it
async function ensureAdminExists() {
  try {
    const adminEmail = "admin@mi.com";
    const existing = await prisma.usuario.findFirst({
      where: {
        OR: [
          { email: adminEmail },
          { tipo: "admin" }
        ]
      }
    });

    if (!existing) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      await prisma.usuario.create({
        data: {
          nome: "Administrador",
          email: adminEmail,
          senha: hashedPassword,
          tipo: "admin",
        },
      });
      console.log("Seeded default admin: admin@mi.com / admin123");
    }
  } catch (error) {
    console.error("Failed to seed admin:", error);
  }
}

export async function getAdminSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  if (!token) return null;

  const payload = await verifyJwt(token, JWT_SECRET);
  if (!payload || payload.tipo !== "admin") return null;

  return {
    id: payload.id,
    nome: payload.nome,
    email: payload.email,
    tipo: payload.tipo,
  };
}

export async function getLojistaSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("lojista_session")?.value;
  if (!token) return null;

  const payload = await verifyJwt(token, JWT_SECRET);
  if (!payload || payload.tipo !== "lojista") return null;

  return {
    id: payload.id,
    nome: payload.nome,
    email: payload.email,
    tipo: payload.tipo,
  };
}

export async function loginAdmin(formData: FormData) {
  await ensureAdminExists(); // Auto seed default user if not exists

  const email = formData.get("email") as string;
  const senha = formData.get("senha") as string;

  if (!email || !senha) {
    return { success: false, error: "Preencha todos os campos." };
  }

  try {
    const usuario = await prisma.usuario.findUnique({
      where: { email },
    });

    if (!usuario || usuario.tipo !== "admin") {
      return { success: false, error: "Credenciais inválidas ou acesso não autorizado." };
    }

    const passwordMatch = await bcrypt.compare(senha, usuario.senha);
    if (!passwordMatch) {
      return { success: false, error: "Credenciais inválidas." };
    }

    const payload: SessionPayload = {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      tipo: usuario.tipo,
    };

    // Sign JWT (valid for 7 days)
    const sevenDaysInSeconds = 7 * 24 * 60 * 60;
    const token = await signJwt(
      {
        ...payload,
        exp: Math.floor(Date.now() / 1000) + sevenDaysInSeconds,
      },
      JWT_SECRET
    );

    const cookieStore = await cookies();
    cookieStore.set("admin_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: sevenDaysInSeconds,
    });

    return { success: true };
  } catch (error) {
    console.error("Erro no loginAdmin:", error);
    return { success: false, error: "Ocorreu um erro interno no servidor." };
  }
}

export async function loginLojista(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const senha = String(formData.get("senha") || "");

  if (!email || !senha) {
    return { success: false, error: "Preencha e-mail e senha." };
  }

  try {
    const usuario = await prisma.usuario.findUnique({
      where: { email },
    });

    if (!usuario) {
      return { success: false, error: "Lojista não cadastrado com este e-mail." };
    }

    if (usuario.tipo !== "lojista") {
      return { success: false, error: "Este e-mail não é de lojista. Use o acesso administrativo ou cadastre um lojista com outro e-mail." };
    }

    if (usuario.status !== "aprovado") {
      return { success: false, error: "Cadastro aguardando aprovação do administrador." };
    }

    const senhaSalva = String(usuario.senha || "");
    const passwordMatch = senhaSalva.startsWith("$2")
      ? await bcrypt.compare(senha, senhaSalva)
      : senha === senhaSalva;

    if (!passwordMatch) {
      return { success: false, error: "Senha inválida." };
    }

    if (!senhaSalva.startsWith("$2")) {
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { senha: await bcrypt.hash(senha, 10) },
      });
    }

    const payload: SessionPayload = {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      tipo: usuario.tipo,
    };

    const sevenDaysInSeconds = 7 * 24 * 60 * 60;
    const token = await signJwt(
      {
        ...payload,
        exp: Math.floor(Date.now() / 1000) + sevenDaysInSeconds,
      },
      JWT_SECRET
    );

    const cookieStore = await cookies();
    cookieStore.set("lojista_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: sevenDaysInSeconds,
    });

    return { success: true };
  } catch (error) {
    console.error("Erro no loginLojista:", error);
    return { success: false, error: "Ocorreu um erro interno no servidor." };
  }
}

export async function configurarAdmin(formData: FormData) {
  const nome = String(formData.get("nome") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const senha = String(formData.get("senha") || "");
  const confirmarSenha = String(formData.get("confirmarSenha") || "");

  if (!nome || !email || !senha || !confirmarSenha) {
    return { success: false, error: "Preencha nome, e-mail, senha e confirmação da senha." };
  }

  if (senha.length < 6) {
    return { success: false, error: "A senha precisa ter pelo menos 6 caracteres." };
  }

  if (senha !== confirmarSenha) {
    return { success: false, error: "As senhas não conferem. Digite a mesma senha nos dois campos." };
  }

  try {
    const hashedPassword = await bcrypt.hash(senha, 10);
    const admin = await prisma.usuario.findFirst({
      where: { tipo: "admin" },
    });

    if (admin) {
      await prisma.usuario.update({
        where: { id: admin.id },
        data: {
          nome,
          email,
          senha: hashedPassword,
          tipo: "admin",
        },
      });
    } else {
      await prisma.usuario.create({
        data: {
          nome,
          email,
          senha: hashedPassword,
          tipo: "admin",
        },
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Erro ao configurar admin:", error);
    return { success: false, error: "Não foi possível salvar o acesso administrativo." };
  }
}

export async function logoutAdmin() {
  const cookieStore = await cookies();
  cookieStore.delete("admin_session");
}

export async function logoutLojista() {
  const cookieStore = await cookies();
  cookieStore.delete("lojista_session");
}
