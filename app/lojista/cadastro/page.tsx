"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { cadastrarLojista } from "../actions";

export default function CadastroLojistaPage() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleCadastro(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setError("");
    setMessage("");

    const formData = new FormData(form);
    startTransition(async () => {
      const result = await cadastrarLojista(formData);

      if (result.success) {
        form.reset();
        setMessage("Cadastro enviado. Aguarde aprovação do administrador para acessar a área lojista.");
      } else {
        setError(result.error || "Não foi possível enviar o cadastro.");
      }
    });
  }

  return (
    <div className="min-h-screen bg-luxury-black px-4 py-10 relative overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div className="w-full h-full bg-[radial-gradient(circle_at_center,_var(--color-luxury-gold)/15%_0%,_transparent_60%)]"></div>
      </div>

      <main className="relative z-10 max-w-3xl mx-auto">
        <div className="text-center space-y-3 mb-8">
          <span className="text-luxury-gold text-xs font-bold uppercase tracking-[0.4em] block">Cadastro Lojista</span>
          <h1 className="text-3xl md:text-5xl font-serif text-luxury-white tracking-tight">
            M&A Fragrâncias
          </h1>
          <p className="text-sm text-gray-400 max-w-2xl mx-auto">
            Preencha seus dados para solicitar acesso ao catálogo de atacado. O administrador irá validar seu cadastro.
          </p>
        </div>

        <section className="bg-neutral-950 border border-zinc-900 p-8 md:p-10 rounded-2xl shadow-2xl">
          {message && <div className="mb-4 p-3 bg-green-950/30 border border-green-500/20 rounded-lg text-green-400 text-sm">{message}</div>}
          {error && <div className="mb-4 p-3 bg-red-950/30 border border-red-500/20 rounded-lg text-red-300 text-sm">{error}</div>}

          <form onSubmit={handleCadastro} className="space-y-4">
            <input name="nome" required disabled={isPending} className="w-full rounded-lg border-zinc-800 shadow-sm focus:ring-2 focus:ring-luxury-gold focus:border-luxury-gold p-3 border text-sm" placeholder="Nome / Loja" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input name="documento" required disabled={isPending} className="w-full rounded-lg border-zinc-800 shadow-sm focus:ring-2 focus:ring-luxury-gold focus:border-luxury-gold p-3 border text-sm" placeholder="CPF ou CNPJ" />
              <input name="telefone" required disabled={isPending} className="w-full rounded-lg border-zinc-800 shadow-sm focus:ring-2 focus:ring-luxury-gold focus:border-luxury-gold p-3 border text-sm" placeholder="WhatsApp" />
            </div>
            <input name="email" type="email" required disabled={isPending} className="w-full rounded-lg border-zinc-800 shadow-sm focus:ring-2 focus:ring-luxury-gold focus:border-luxury-gold p-3 border text-sm" placeholder="E-mail para login" />
            <input name="endereco" required disabled={isPending} className="w-full rounded-lg border-zinc-800 shadow-sm focus:ring-2 focus:ring-luxury-gold focus:border-luxury-gold p-3 border text-sm" placeholder="Endereço" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input name="cidade" required disabled={isPending} className="w-full rounded-lg border-zinc-800 shadow-sm focus:ring-2 focus:ring-luxury-gold focus:border-luxury-gold p-3 border text-sm" placeholder="Cidade" />
              <input name="estado" maxLength={2} required disabled={isPending} className="w-full rounded-lg border-zinc-800 shadow-sm focus:ring-2 focus:ring-luxury-gold focus:border-luxury-gold p-3 border text-sm uppercase" placeholder="UF" />
              <input name="cep" required disabled={isPending} className="w-full rounded-lg border-zinc-800 shadow-sm focus:ring-2 focus:ring-luxury-gold focus:border-luxury-gold p-3 border text-sm" placeholder="CEP" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                name="senha"
                type={showPassword ? "text" : "password"}
                minLength={6}
                required
                disabled={isPending}
                className="w-full rounded-lg border-zinc-800 shadow-sm focus:ring-2 focus:ring-luxury-gold focus:border-luxury-gold p-3 border text-sm"
                placeholder="Senha desejada"
              />
              <input
                name="confirmarSenha"
                type={showPassword ? "text" : "password"}
                minLength={6}
                required
                disabled={isPending}
                className="w-full rounded-lg border-zinc-800 shadow-sm focus:ring-2 focus:ring-luxury-gold focus:border-luxury-gold p-3 border text-sm"
                placeholder="Confirmar senha"
              />
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(event) => setShowPassword(event.target.checked)}
                className="h-4 w-4 accent-luxury-gold"
              />
              Visualizar senha
            </label>
            <button type="submit" disabled={isPending} className="w-full py-3 bg-gold hover:bg-white text-black font-bold rounded-lg shadow-md text-sm font-bold uppercase tracking-widest transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50">
              {isPending ? "Enviando..." : "Enviar Cadastro"}
            </button>
          </form>
        </section>

        <div className="flex flex-col sm:flex-row justify-center gap-4 text-center mt-8">
          <Link href="/lojista" className="text-xs text-gray-400 hover:text-white transition-colors uppercase tracking-widest">
            Já tenho acesso
          </Link>
          <Link href="/" className="text-xs text-gray-400 hover:text-white transition-colors uppercase tracking-widest">
            Voltar para o site
          </Link>
        </div>
      </main>
    </div>
  );
}
