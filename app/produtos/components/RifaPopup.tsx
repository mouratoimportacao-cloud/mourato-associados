"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Rifa = {
  id: number;
  titulo: string;
  descricao: string | null;
  precoBilhete: number;
  imagem?: string | null;
};

export default function RifaPopup() {
  const router = useRouter();
  const [rifa, setRifa] = useState<Rifa | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    fetch("/api/rifa-ativa")
      .then((r) => r.json())
      .then((data) => {
        if (data && data.id) {
          setRifa(data);
          setTimeout(() => setShow(true), 500);
        }
      })
      .catch(() => {});
  }, []);

  const handleClose = () => setShow(false);

  if (!show || !rifa) return null;

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center px-4"
      onClick={handleClose}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative z-10 max-w-sm w-full bg-gradient-to-b from-zinc-900 to-black border border-gold/25 rounded-3xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "fadeInUp 0.4s ease-out" }}
      >
        {/* Fechar */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 z-10 text-zinc-500 hover:text-white transition-colors text-lg leading-none"
          aria-label="Fechar"
        >
          ✕
        </button>

        {/* Imagem do prêmio */}
        {rifa.imagem ? (
          <div className="relative h-44 overflow-hidden">
            <img
              src={rifa.imagem}
              alt={rifa.titulo}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            <div className="absolute bottom-3 left-4">
              <span className="bg-gold text-black text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
                🎟️ Rifa Exclusiva
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-28 bg-gradient-to-br from-gold/10 to-zinc-900">
            <span className="text-5xl">🎁</span>
          </div>
        )}

        {/* Conteúdo */}
        <div className="p-6 space-y-4 text-center">
          <div className="space-y-1">
            <p className="text-gold text-[9px] font-black uppercase tracking-[0.3em]">
              Sorteio em Andamento
            </p>
            <h2 className="text-xl font-serif font-black text-white leading-tight">
              {rifa.titulo}
            </h2>
          </div>

          {rifa.descricao && (
            <p className="text-zinc-400 text-xs leading-relaxed line-clamp-2">
              {rifa.descricao}
            </p>
          )}

          {/* Preço */}
          <div className="bg-gold/5 border border-gold/15 rounded-2xl py-3">
            <p className="text-[9px] text-zinc-500 uppercase tracking-wider">Valor do bilhete</p>
            <p className="text-2xl font-mono font-black text-gold">
              {Number(rifa.precoBilhete) <= 0
                ? "Grátis"
                : `R$ ${Number(rifa.precoBilhete).toFixed(2)}`}
            </p>
          </div>

          {/* Botões */}
          <div className="space-y-2 pt-1">
            <button
              onClick={() => {
                handleClose();
                router.push(`/rifas?id=${rifa.id}`);
              }}
              className="w-full bg-gradient-to-r from-gold to-[#D4AF37] text-black font-black text-xs uppercase tracking-widest py-3.5 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              🎟️ Quero Participar!
            </button>
            <button
              onClick={handleClose}
              className="w-full text-zinc-500 hover:text-zinc-300 text-[10px] uppercase tracking-widest transition-colors py-1 cursor-pointer"
            >
              Agora não
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
