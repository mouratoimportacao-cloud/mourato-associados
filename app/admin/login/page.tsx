"use client";

import { loginAdmin } from "../../../lib/auth";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await loginAdmin(formData);
      if (result.success) {
        router.push("/admin");
        router.refresh();
      } else {
        setError(result.error || "Ocorreu um erro ao fazer login.");
      }
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-luxury-black px-4 relative overflow-hidden">
      {/* Background radial gold glow */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div className="w-full h-full bg-[radial-gradient(circle_at_center,_var(--color-luxury-gold)/15%_0%,_transparent_60%)]"></div>
      </div>

      <div className="relative z-10 w-full max-w-md bg-[#222222]/90 backdrop-blur-md border border-white/10 p-8 md:p-10 rounded-2xl shadow-2xl space-y-8">
        <div className="text-center space-y-3">
          <span className="text-luxury-gold text-xs font-bold uppercase tracking-[0.4em] block">Painel Administrativo</span>
          <h1 className="text-3xl font-serif text-luxury-white tracking-tight">
            MOURATO <span className="text-luxury-gold font-light">&</span> ASSOC.
          </h1>
          <div className="w-12 h-px bg-luxury-gold mx-auto mt-2"></div>
        </div>

        {error && (
          <div className="p-4 bg-red-900/30 border border-red-500/30 rounded-xl text-red-200 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">E-mail</label>
            <input
              name="email"
              type="email"
              required
              disabled={isPending}
              placeholder="admin@mi.com"
              className="w-full bg-[#1A1A1A] border border-white/10 text-white rounded-lg shadow-sm focus:ring-1 focus:ring-luxury-gold focus:border-luxury-gold p-3 border transition-all placeholder:text-gray-600 text-sm focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Senha</label>
            <div className="flex gap-2">
              <input
                name="senha"
                type={showPassword ? "text" : "password"}
                required
                disabled={isPending}
                placeholder="Digite sua senha"
                className="w-full bg-[#1A1A1A] border border-white/10 text-white rounded-lg shadow-sm focus:ring-1 focus:ring-luxury-gold focus:border-luxury-gold p-3 border transition-all placeholder:text-gray-600 text-sm focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="px-4 rounded-lg border border-white/10 text-xs font-bold uppercase tracking-widest text-gray-300 hover:text-white hover:border-luxury-gold transition-colors"
              >
                {showPassword ? "Ocultar" : "Ver"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className={`w-full py-3 bg-luxury-gold hover:bg-yellow-600 text-luxury-black font-bold uppercase tracking-widest text-xs rounded-lg shadow-md transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50`}
          >
            {isPending ? "Autenticando..." : "Entrar no Painel"}
          </button>
        </form>

        <div className="text-center">
          <div className="flex flex-col gap-3">
            <a href="/admin/configurar" className="text-xs text-luxury-gold hover:text-white transition-colors uppercase tracking-widest">
              Configurar Login
            </a>
            <a href="/" className="text-xs text-gray-400 hover:text-white transition-colors uppercase tracking-widest">
              ← Voltar para o Site
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
