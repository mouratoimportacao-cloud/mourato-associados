"use client";

import { useState, useTransition } from "react";
import { confirmarVendaLojista } from "../actions";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";

interface Props {
  pedidoId: number;
  produtoNome: string;
  custoUnitario: number;
  precoTabela: number;
}

export default function ConfirmarVendaForm({
  pedidoId,
  produtoNome,
  custoUnitario,
  precoTabela,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setSucesso(false);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await confirmarVendaLojista(formData);
      if (result.success) {
        setSucesso(true);
        setTimeout(() => {
          window.location.reload();
        }, 800);
      } else {
        setErro(result.error || "Erro ao confirmar venda.");
      }
    });
  }

  if (sucesso) {
    return (
      <div className="flex items-center gap-2 justify-end">
        <span className="rounded-full bg-green-100 px-3 py-1.5 text-xs font-black text-green-700 uppercase tracking-widest">
          ✅ Venda confirmada!
        </span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 items-end">
      <input type="hidden" name="pedidoId" value={pedidoId} />

      {/* Forma de pagamento */}
      <select
        name="pagamento"
        disabled={isPending}
        className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold bg-white w-full sm:w-auto"
      >
        <option value="Dinheiro">💵 Dinheiro</option>
        <option value="Pix">📱 Pix</option>
        <option value="Débito">💳 Débito</option>
        <option value="Crédito à vista">💳 Crédito à vista</option>
        <option value="Crédito parcelado">💳 Crédito parcelado</option>
      </select>

      {/* Desconto */}
      <div className="flex flex-col gap-0.5 w-full sm:w-auto">
        <input
          name="descontoPercentual"
          type="number"
          min="0"
          max="90"
          step="1"
          placeholder="Desconto %"
          disabled={isPending}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold"
        />
        {custoUnitario > 0 && precoTabela > 0 && (
          <span className="text-[10px] text-gray-400 text-right">
            piso (custo): R${" "}
            {custoUnitario.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </span>
        )}
      </div>

      {/* Erro em destaque */}
      {erro && (
        <div className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 text-center">
          ⚠️ {erro}
        </div>
      )}

      {/* Botão confirmar */}
      <ConfirmSubmitButton
        disabled={isPending}
        message={`Confirmar venda de ${produtoNome}? Isso vai baixar seu estoque pessoal.`}
        className="rounded-lg bg-green-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white hover:bg-green-700 transition-colors whitespace-nowrap disabled:opacity-50"
      >
        {isPending ? "Confirmando…" : "✅ Confirmar Venda"}
      </ConfirmSubmitButton>
    </form>
  );
}
