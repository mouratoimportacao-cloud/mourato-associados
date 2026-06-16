"use client";

import { useEffect, useState, useTransition } from "react";
import { configurarAdmin } from "../../../lib/auth";
import { getSocialLinks, salvarLinksSociais, type SocialLinks } from "../../../lib/site-config";

export default function ConfigurarAdminPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [linksMessage, setLinksMessage] = useState<string | null>(null);
  const [linksError, setLinksError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [socialLinks, setSocialLinks] = useState<SocialLinks | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const links = await getSocialLinks();
      setSocialLinks(links);
    });
  }, []);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setMessage(null);
    setError(null);

    const formData = new FormData(form);
    startTransition(async () => {
      const result = await configurarAdmin(formData);

      if (result.success) {
        form.reset();
        setMessage("Acesso administrativo salvo. Use estes dados para entrar no painel.");
      } else {
        setError(result.error || "Não foi possível salvar o acesso.");
      }
    });
  }

  function handleLinksSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setLinksMessage(null);
    setLinksError(null);

    const formData = new FormData(form);
    startTransition(async () => {
      const result = await salvarLinksSociais(formData);

      if (result.success) {
        setSocialLinks({
          siteUrl: String(formData.get("siteUrl") || ""),
          instagram: String(formData.get("instagram") || ""),
          facebook: String(formData.get("facebook") || ""),
          whatsapp: String(formData.get("whatsapp") || ""),
          x: String(formData.get("x") || ""),
          tiktok: String(formData.get("tiktok") || ""),
        });
        setLinksMessage("Links sociais salvos.");
      } else {
        setLinksError("Não foi possível salvar os links.");
      }
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-luxury-black px-4 relative overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div className="w-full h-full bg-[radial-gradient(circle_at_center,_var(--color-luxury-gold)/15%_0%,_transparent_60%)]"></div>
      </div>

      <div className="relative z-10 w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-[#222222]/90 backdrop-blur-md border border-white/10 p-8 md:p-10 rounded-2xl shadow-2xl space-y-8">
        <div className="text-center space-y-3">
          <span className="text-luxury-gold text-xs font-bold uppercase tracking-[0.4em] block">Configurações</span>
          <h1 className="text-3xl font-serif text-luxury-white tracking-tight">
            Acesso do Admin
          </h1>
          <div className="w-12 h-px bg-luxury-gold mx-auto mt-2"></div>
        </div>

        {message && (
          <div className="p-4 bg-green-900/30 border border-green-500/30 rounded-xl text-green-200 text-sm text-center">
            {message}
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-900/30 border border-red-500/30 rounded-xl text-red-200 text-sm text-center">
            {error}
          </div>
        )}

        <p className="text-xs text-gray-400 text-center">
          Use somente quando quiser trocar o login ou a senha do administrador.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Nome</label>
            <input
              name="nome"
              required
              disabled={isPending}
              className="w-full bg-[#1A1A1A] border border-white/10 text-white rounded-lg shadow-sm focus:ring-1 focus:ring-luxury-gold focus:border-luxury-gold p-3 transition-all placeholder:text-gray-600 text-sm focus:outline-none"
              placeholder="Administrador"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">E-mail de Login</label>
            <input
              name="email"
              type="email"
              required
              disabled={isPending}
              className="w-full bg-[#1A1A1A] border border-white/10 text-white rounded-lg shadow-sm focus:ring-1 focus:ring-luxury-gold focus:border-luxury-gold p-3 transition-all placeholder:text-gray-600 text-sm focus:outline-none"
              placeholder="seu@email.com"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Senha</label>
            <div className="flex gap-2">
              <input
                name="senha"
                type={showPassword ? "text" : "password"}
                minLength={6}
                required
                disabled={isPending}
                className="w-full bg-[#1A1A1A] border border-white/10 text-white rounded-lg shadow-sm focus:ring-1 focus:ring-luxury-gold focus:border-luxury-gold p-3 transition-all placeholder:text-gray-600 text-sm focus:outline-none"
                placeholder="Mínimo 6 caracteres"
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

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Confirmar Senha</label>
            <input
              name="confirmarSenha"
              type={showPassword ? "text" : "password"}
              minLength={6}
              required
              disabled={isPending}
              className="w-full bg-[#1A1A1A] border border-white/10 text-white rounded-lg shadow-sm focus:ring-1 focus:ring-luxury-gold focus:border-luxury-gold p-3 transition-all placeholder:text-gray-600 text-sm focus:outline-none"
              placeholder="Digite a senha novamente"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3 bg-luxury-gold hover:bg-yellow-600 text-luxury-black font-bold uppercase tracking-widest text-xs rounded-lg shadow-md transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
          >
            {isPending ? "Salvando..." : "Salvar Acesso"}
          </button>
        </form>
      </div>

      <div className="bg-[#222222]/90 backdrop-blur-md border border-white/10 p-8 md:p-10 rounded-2xl shadow-2xl space-y-8">
        <div className="text-center space-y-3">
          <span className="text-luxury-gold text-xs font-bold uppercase tracking-[0.4em] block">Links do Site</span>
          <h2 className="text-3xl font-serif text-luxury-white tracking-tight">
            Redes Sociais
          </h2>
          <div className="w-12 h-px bg-luxury-gold mx-auto mt-2"></div>
          <p className="text-xs text-gray-400">
            Apoio discreto para incluir manualmente os links que aparecem no topo e no rodapé.
          </p>
          <p className="text-xs text-amber-200/90">
            Quando um link estiver vazio, o ícone aparece no site, mas não abre nenhuma página.
          </p>
        </div>

        {linksMessage && (
          <div className="p-4 bg-green-900/30 border border-green-500/30 rounded-xl text-green-200 text-sm text-center">
            {linksMessage}
          </div>
        )}

        {linksError && (
          <div className="p-4 bg-red-900/30 border border-red-500/30 rounded-xl text-red-200 text-sm text-center">
            {linksError}
          </div>
        )}

        <form onSubmit={handleLinksSubmit} className="space-y-5">
          <div className="rounded-xl border border-luxury-gold/30 bg-luxury-gold/10 p-4 space-y-1">
            <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider block">Link do QR Code do Site</label>
            <input
              name="siteUrl"
              type="url"
              disabled={isPending}
              value={socialLinks?.siteUrl || ""}
              onChange={(event) => setSocialLinks((current) => ({ ...(current || { instagram: "", facebook: "", whatsapp: "", x: "", tiktok: "", siteUrl: "" }), siteUrl: event.target.value }))}
              className="w-full bg-[#1A1A1A] border border-white/10 text-white rounded-lg shadow-sm focus:ring-1 focus:ring-luxury-gold focus:border-luxury-gold p-3 transition-all placeholder:text-gray-600 text-sm focus:outline-none"
              placeholder="https://mouratoassociados.com.br/produtos"
            />
            <p className="text-xs text-gray-400">
              Este link gera o QR Code mostrado ao lado dos símbolos e pode ser usado em posters fixos.
            </p>
          </div>

          {[
            ["instagram", "Instagram", "https://www.instagram.com/perfumeltda/"],
            ["facebook", "Facebook", "https://www.facebook.com/sua-pagina"],
            ["whatsapp", "WhatsApp", "https://wa.me/55DDDNUMERO"],
            ["x", "X", "https://x.com/sua-conta"],
            ["tiktok", "TikTok", "https://www.tiktok.com/@sua-conta"],
          ].map(([name, label, placeholder]) => (
            <div key={name} className="space-y-1">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">{label}</label>
              <input
                name={name}
                type="url"
                disabled={isPending}
                value={socialLinks?.[name as keyof SocialLinks] || ""}
                onChange={(event) => setSocialLinks((current) => ({ ...(current || { instagram: "", facebook: "", whatsapp: "", x: "", tiktok: "", siteUrl: "" }), [name]: event.target.value }))}
                className="w-full bg-[#1A1A1A] border border-white/10 text-white rounded-lg shadow-sm focus:ring-1 focus:ring-luxury-gold focus:border-luxury-gold p-3 transition-all placeholder:text-gray-600 text-sm focus:outline-none"
                placeholder={placeholder}
              />
            </div>
          ))}

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3 bg-white hover:bg-luxury-gold text-luxury-black font-bold uppercase tracking-widest text-xs rounded-lg shadow-md transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
          >
            {isPending ? "Salvando..." : "Salvar Links"}
          </button>
        </form>
      </div>
      </div>
    </div>
  );
}
