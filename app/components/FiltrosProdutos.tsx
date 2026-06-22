"use client";

interface FiltrosProdutosProps {
  total: number;
  quantidade: number;
  onChange: (qty: number) => void;
}

export default function FiltrosProdutos({ total, quantidade, onChange }: FiltrosProdutosProps) {
  const opcoes = [total, 8, 16];

  return (
    <div className="flex items-center gap-2.5">
      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Exibir:</span>
      {opcoes.map((qty) => (
        <button
          key={qty}
          type="button"
          onClick={() => onChange(qty)}
          className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide transition-all cursor-pointer ${
            quantidade === qty || (qty === total && quantidade >= total)
              ? "bg-gold text-black shadow-sm"
              : "bg-white text-zinc-600 border border-zinc-300 hover:border-gold hover:text-gold"
          }`}
        >
          {qty >= total ? "Todos" : qty}
        </button>
      ))}
    </div>
  );
}
