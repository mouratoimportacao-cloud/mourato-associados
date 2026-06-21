"use client";

interface QuantidadeVisualizacaoProps {
  total: number;
  quantidade: number;
  onChange: (qty: number) => void;
}

export default function FiltrosProdutos({ total, quantidade, onChange }: QuantidadeVisualizacaoProps) {
  const opcoes = [8, 16, total];

  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
        Exibir:
      </span>
      <div className="flex gap-1.5">
        {opcoes.map((qty) => (
          <button
            key={qty}
            type="button"
            onClick={() => onChange(qty)}
            className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
              quantidade === qty
                ? "bg-gold text-black"
                : "bg-[#1A1A1A] text-zinc-400 border border-zinc-700 hover:border-gold hover:text-gold"
            }`}
          >
            {qty === total ? "Todos" : qty}
          </button>
        ))}
      </div>
    </div>
  );
}
