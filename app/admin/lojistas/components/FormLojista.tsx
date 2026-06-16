"use client";

import { useRef, useState, useTransition } from "react";
import { createLojista } from "../actions";

export default function FormLojista({ onSaved }: { onSaved?: () => void }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setMessage("");
    setError("");

    startTransition(async () => {
      const result = await createLojista(formData);

      if (result.success) {
        formRef.current?.reset();
        setMessage("Lojista cadastrado com acesso liberado.");
        onSaved?.();
      } else {
        setError(result.error || "Erro ao cadastrar lojista.");
      }
    });
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <h2 className="text-xl font-bold mb-5 text-gray-800 flex items-center gap-2">
        <span className="w-2 h-6 rounded-full bg-luxury-gold"></span>
        Novo Lojista
      </h2>

      {message && <div className="mb-4 p-3 bg-green-50 border border-green-100 rounded-lg text-green-700 text-sm">{message}</div>}
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-red-700 text-sm">{error}</div>}

      <form ref={formRef} action={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Nome / Loja</label>
          <input
            name="nome"
            required
            disabled={isPending}
            className="w-full rounded-lg border-gray-200 shadow-sm focus:ring-2 focus:ring-luxury-gold focus:border-luxury-gold p-2.5 border transition-all text-sm"
            placeholder="Nome do lojista ou loja"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">CPF / CNPJ</label>
            <input
              name="documento"
              required
              disabled={isPending}
              className="w-full rounded-lg border-gray-200 shadow-sm focus:ring-2 focus:ring-luxury-gold focus:border-luxury-gold p-2.5 border transition-all text-sm"
              placeholder="CPF ou CNPJ"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">WhatsApp</label>
            <input
              name="telefone"
              required
              disabled={isPending}
              className="w-full rounded-lg border-gray-200 shadow-sm focus:ring-2 focus:ring-luxury-gold focus:border-luxury-gold p-2.5 border transition-all text-sm"
              placeholder="(00) 00000-0000"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">E-mail de Login</label>
          <input
            name="email"
            type="email"
            required
            disabled={isPending}
            className="w-full rounded-lg border-gray-200 shadow-sm focus:ring-2 focus:ring-luxury-gold focus:border-luxury-gold p-2.5 border transition-all text-sm"
            placeholder="lojista@email.com"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Endereço</label>
          <input
            name="endereco"
            disabled={isPending}
            className="w-full rounded-lg border-gray-200 shadow-sm focus:ring-2 focus:ring-luxury-gold focus:border-luxury-gold p-2.5 border transition-all text-sm"
            placeholder="Rua, número e bairro"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1 md:col-span-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Cidade</label>
            <input
              name="cidade"
              disabled={isPending}
              className="w-full rounded-lg border-gray-200 shadow-sm focus:ring-2 focus:ring-luxury-gold focus:border-luxury-gold p-2.5 border transition-all text-sm"
              placeholder="Cidade"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">UF</label>
            <input
              name="estado"
              maxLength={2}
              disabled={isPending}
              className="w-full rounded-lg border-gray-200 shadow-sm focus:ring-2 focus:ring-luxury-gold focus:border-luxury-gold p-2.5 border transition-all text-sm uppercase"
              placeholder="SP"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">CEP</label>
            <input
              name="cep"
              disabled={isPending}
              className="w-full rounded-lg border-gray-200 shadow-sm focus:ring-2 focus:ring-luxury-gold focus:border-luxury-gold p-2.5 border transition-all text-sm"
              placeholder="00000-000"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Senha do Lojista</label>
            <input
              name="senha"
              type={showPassword ? "text" : "password"}
              minLength={6}
              required
              disabled={isPending}
              className="w-full rounded-lg border-gray-200 shadow-sm focus:ring-2 focus:ring-luxury-gold focus:border-luxury-gold p-2.5 border transition-all text-sm"
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Confirmar Senha</label>
            <input
              name="confirmarSenha"
              type={showPassword ? "text" : "password"}
              minLength={6}
              required
              disabled={isPending}
              className="w-full rounded-lg border-gray-200 shadow-sm focus:ring-2 focus:ring-luxury-gold focus:border-luxury-gold p-2.5 border transition-all text-sm"
              placeholder="Digite novamente"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gray-500">
          <input
            type="checkbox"
            checked={showPassword}
            onChange={(event) => setShowPassword(event.target.checked)}
            className="h-4 w-4 accent-luxury-gold"
          />
          Visualizar senha
        </label>

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-3 px-4 bg-luxury-black hover:bg-luxury-gold text-white rounded-lg shadow-sm text-sm font-bold uppercase tracking-widest transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
        >
          {isPending ? "Cadastrando..." : "Cadastrar Lojista"}
        </button>
      </form>
    </div>
  );
}
