"use server";

import bcrypt from "bcryptjs";
import dns from "node:dns";
import { promisify } from "node:util";
import { prisma } from "../../lib/prisma";

const resolveMx = promisify(dns.resolveMx);

// Validador matemático de CPF real (Dígitos verificadores)
function validarCPF(cpf: string): boolean {
  cpf = cpf.replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let resto = 11 - (soma % 11);
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.charAt(9))) return false;
  
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpf.charAt(i)) * (11 - i);
  }
  resto = 11 - (soma % 11);
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.charAt(10))) return false;
  
  return true;
}

// Validador matemático de CNPJ real (Dígitos verificadores)
function validarCNPJ(cnpj: string): boolean {
  cnpj = cnpj.replace(/\D/g, "");
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  
  let tamanho = cnpj.length - 2;
  let numeros = cnpj.substring(0, tamanho);
  let digitos = cnpj.substring(tamanho);
  
  let soma = 0;
  let pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(0))) return false;
  
  tamanho = tamanho + 1;
  numeros = cnpj.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(1))) return false;
  
  return true;
}

// Validador de domínio de e-mail real via registros MX do DNS
async function validarDominioEmail(email: string): Promise<boolean> {
  const parts = email.split("@");
  if (parts.length !== 2) return false;
  const domain = parts[1];
  
  try {
    const addresses = await resolveMx(domain);
    return addresses && addresses.length > 0;
  } catch (err) {
    console.warn(`DNS MX validation failed for domain ${domain}:`, err);
    // Lista de fallback resiliente para domínios altamente populares caso o DNS tenha timeout
    const dominiosConhecidos = [
      "gmail.com",
      "hotmail.com",
      "outlook.com",
      "yahoo.com",
      "yahoo.com.br",
      "bol.com.br",
      "uol.com.br",
      "icloud.com",
      "live.com"
    ];
    return dominiosConhecidos.includes(domain);
  }
}

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

  // 1. Validação de Documento (CPF / CNPJ Real)
  const docLimpo = documento.replace(/\D/g, "");
  if (docLimpo.length === 11) {
    if (!validarCPF(docLimpo)) {
      return { success: false, error: "O CPF informado é matematicamente inválido." };
    }
  } else if (docLimpo.length === 14) {
    if (!validarCNPJ(docLimpo)) {
      return { success: false, error: "O CNPJ informado é matematicamente inválido." };
    }
  } else {
    return { success: false, error: "Documento inválido. Forneça um CPF (11 dígitos) ou CNPJ (14 dígitos) real." };
  }

  // 2. Validação de E-mail real (Servidor MX ativo)
  const emailValido = await validarDominioEmail(email);
  if (!emailValido) {
    return { success: false, error: "O endereço de e-mail informado possui um domínio inválido ou sem servidor de correio ativo." };
  }

  // 3. Validação de CEP real via ViaCEP API
  const cepLimpo = cep.replace(/\D/g, "");
  if (cepLimpo.length !== 8) {
    return { success: false, error: "CEP inválido. Deve possuir exatamente 8 dígitos." };
  }

  try {
    const viaCepRes = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
    if (viaCepRes.ok) {
      const viaCepData = await viaCepRes.json();
      if (viaCepData.erro) {
        return { success: false, error: "O CEP informado não foi localizado ou não existe." };
      }
      
      // Valida se o estado (UF) fornecido coincide com o CEP pesquisado
      if (viaCepData.uf && viaCepData.uf.toUpperCase() !== estado) {
        return { success: false, error: `O CEP informado pertence ao estado ${viaCepData.uf}, mas você preencheu ${estado}.` };
      }
    }
  } catch (err) {
    console.warn("Validação externa de CEP offline. Continuando com validação local:", err);
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
