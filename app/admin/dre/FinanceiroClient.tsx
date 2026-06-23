"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  criarDespesa,
  excluirDespesa,
  fecharMes,
} from "./actions";

const categoriasIniciais = [
  "Uber",
  "Hotel",
  "Frete",
  "Alimentação",
  "Passagem",
  "Aluguel",
  "Energia",
  "Internet",
  "Marketing",
  "Outros",
];

function moeda(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function nomeMes(competencia: string) {
  const [ano, mes] = competencia.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(ano, mes - 1, 1));
}

type Resumo = {
  receitaAtacado: number;
  receitaSite: number;
  receitaTotal: number;
  cmv: number;
  estoque: number;
  contasReceber: number;
  totalDespesas: number;
  saldoBancario: number;
  resultadoOperacional: number;
  despesasPorCategoria: Record<string, number>;
  despesasPeriodo: Array<Record<string, any>>;
};

export default function FinanceiroClient({
  competencia,
  resumo,
  fechado,
  fechamentos,
}: {
  competencia: string;
  resumo: Resumo;
  fechado: boolean;
  fechamentos: Array<Record<string, any>>;
}) {
  const router = useRouter();
  const [modalAberto, setModalAberto] = useState(false);
  const [erro, setErro] = useState("");
  const [isPending, startTransition] = useTransition();

  const categorias = useMemo(
    () =>
      Array.from(
        new Set([
          ...categoriasIniciais,
          ...Object.keys(resumo.despesasPorCategoria),
        ])
      ).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [resumo.despesasPorCategoria]
  );

  function mudarMes(value: string) {
    router.push(`/admin/dre?mes=${value}`);
  }

  function handleNovaDespesa(formData: FormData) {
    setErro("");
    startTransition(async () => {
      const result = await criarDespesa(formData);
      if (!result.success) {
        setErro(result.error || "Não foi possível salvar a despesa.");
        return;
      }
      setModalAberto(false);
      router.refresh();
    });
  }

  function handleExcluir(id: number) {
    if (!window.confirm("Excluir esta despesa?")) return;
    startTransition(async () => {
      const result = await excluirDespesa(id);
      if (!result.success) {
        alert(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleFecharMes() {
    if (
      !window.confirm(
        `Fechar ${nomeMes(competencia)}? Os valores ficarão congelados no histórico.`
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await fecharMes(competencia);
      if (!result.success) {
        alert(result.error);
        return;
      }
      router.refresh();
    });
  }

  const ativos = [
    { label: "Banco", value: resumo.saldoBancario, tone: "text-emerald-700" },
    { label: "Estoque", value: resumo.estoque, tone: "text-blue-700" },
    {
      label: "Contas a Receber",
      value: resumo.contasReceber,
      tone: "text-amber-700",
    },
    { label: "Investimentos", value: 0, tone: "text-violet-700" },
  ];
  const passivos = [
    { label: "Contas a Pagar", value: 0 },
    { label: "Empréstimos", value: 0 },
    { label: "Obrigações", value: 0 },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-amber-600">
              Visão Financeira
            </p>
            <h1 className="mt-1 text-3xl font-black text-gray-950">Financeiro</h1>
            <p className="mt-1 text-sm text-gray-500">
              Leitura das operações reais e controle isolado de despesas.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="month"
              value={competencia}
              onChange={(event) => mudarMes(event.target.value)}
              className="min-h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-700 outline-none focus:border-amber-500"
            />
            <button
              type="button"
              onClick={() => {
                setErro("");
                setModalAberto(true);
              }}
              disabled={fechado}
              className="min-h-11 rounded-xl bg-gray-950 px-5 text-xs font-black uppercase tracking-widest text-white hover:bg-amber-500 hover:text-black disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
            >
              Nova Despesa
            </button>
            <button
              type="button"
              onClick={handleFecharMes}
              disabled={fechado || isPending}
              className="min-h-11 rounded-xl border border-amber-300 bg-amber-50 px-5 text-xs font-black uppercase tracking-widest text-amber-800 hover:bg-amber-100 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
            >
              {fechado ? "Mês Fechado" : "Fechar Mês"}
            </button>
          </div>
        </div>
      </section>

      {fechado && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">
          Este período está congelado. Os valores abaixo pertencem ao fechamento
          histórico.
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-black uppercase tracking-widest text-gray-800">
            Ativos
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {ativos.map((item) => (
              <div key={item.label} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  {item.label}
                </p>
                <p className={`mt-2 text-lg font-black ${item.tone}`}>
                  {moeda(item.value)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-black uppercase tracking-widest text-gray-800">
            Passivos
          </h2>
          <div className="mt-4 space-y-3">
            {passivos.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-4"
              >
                <span className="text-sm font-bold text-gray-600">{item.label}</span>
                <span className="font-black text-gray-900">{moeda(item.value)}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-gray-400">
            Estrutura preparada para empréstimos, obrigações, equipamentos,
            veículos e outros grupos futuros.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {[
          ["Receita Atacado", resumo.receitaAtacado, "text-blue-700"],
          ["Receita Site", resumo.receitaSite, "text-violet-700"],
          ["Receita Total", resumo.receitaTotal, "text-emerald-700"],
          ["Resultado do Mês", resumo.resultadoOperacional, resumo.resultadoOperacional >= 0 ? "text-emerald-700" : "text-red-700"],
        ].map(([label, value, tone]) => (
          <div key={String(label)} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
              {label}
            </p>
            <p className={`mt-2 text-xl font-black ${tone}`}>{moeda(Number(value))}</p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-black uppercase tracking-widest text-gray-800">
            Resultado do mês
          </h2>
          <div className="mt-5 space-y-3 text-sm">
            <Linha label="Receitas" value={resumo.receitaTotal} />
            <Linha label="(-) CMV" value={-resumo.cmv} negative />
            <Linha label="(-) Despesas" value={-resumo.totalDespesas} negative />
            <div className="mt-4 flex items-center justify-between border-t-2 border-gray-900 pt-4 text-base font-black">
              <span>Resultado Operacional</span>
              <span className={resumo.resultadoOperacional >= 0 ? "text-emerald-700" : "text-red-700"}>
                {moeda(resumo.resultadoOperacional)}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-black uppercase tracking-widest text-gray-800">
            Despesas por categoria
          </h2>
          <div className="mt-4 space-y-3">
            {Object.entries(resumo.despesasPorCategoria)
              .sort((a, b) => b[1] - a[1])
              .map(([categoria, valor]) => (
                <div key={categoria} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                  <span className="text-sm font-bold text-gray-600">{categoria}</span>
                  <span className="font-black text-red-700">{moeda(valor)}</span>
                </div>
              ))}
            {Object.keys(resumo.despesasPorCategoria).length === 0 && (
              <p className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">
                Nenhuma despesa lançada neste mês.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-gray-800">
            Despesas detalhadas
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50 text-left text-[10px] font-black uppercase tracking-wider text-gray-400">
              <tr>
                <th className="px-5 py-3">Data</th>
                <th className="px-5 py-3">Categoria</th>
                <th className="px-5 py-3">Observação</th>
                <th className="px-5 py-3 text-right">Valor</th>
                <th className="px-5 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {resumo.despesasPeriodo.map((despesa) => (
                <tr key={despesa.id}>
                  <td className="whitespace-nowrap px-5 py-4 text-gray-600">
                    {new Date(despesa.data).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-5 py-4 font-bold text-gray-800">{despesa.categoria}</td>
                  <td className="max-w-md px-5 py-4 text-gray-500">
                    {despesa.observacao || "—"}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-right font-black text-red-700">
                    {moeda(Number(despesa.valor))}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleExcluir(Number(despesa.id))}
                      disabled={fechado || isPending}
                      className="text-xs font-black uppercase tracking-wider text-red-600 hover:text-red-800 disabled:text-gray-300"
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
              {resumo.despesasPeriodo.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-gray-400">
                    Nenhum lançamento no período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-black uppercase tracking-widest text-gray-800">
          Histórico de fechamentos
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {fechamentos.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => mudarMes(item.competencia)}
              className="rounded-xl border border-gray-200 p-4 text-left hover:border-amber-400 hover:bg-amber-50"
            >
              <p className="text-xs font-black uppercase tracking-wider text-gray-500">
                {nomeMes(item.competencia)}
              </p>
              <p className="mt-2 text-lg font-black text-gray-900">
                {moeda(Number(item.resultadoOperacional))}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Fechado em {new Date(item.fechadoEm).toLocaleDateString("pt-BR")}
              </p>
            </button>
          ))}
          {fechamentos.length === 0 && (
            <p className="text-sm text-gray-400">Nenhum mês fechado ainda.</p>
          )}
        </div>
      </section>

      {modalAberto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <form
            action={handleNovaDespesa}
            className="w-full max-w-lg space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">
                  Lançamento manual
                </p>
                <h2 className="text-xl font-black text-gray-900">Nova Despesa</h2>
              </div>
              <button type="button" onClick={() => setModalAberto(false)} className="rounded-full bg-gray-100 px-3 py-2 text-gray-500 hover:bg-gray-200">
                ✕
              </button>
            </div>

            {erro && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {erro}
              </p>
            )}

            <Campo label="Data">
              <input name="data" type="date" required defaultValue={`${competencia}-01`} className="input-financeiro" />
            </Campo>
            <Campo label="Categoria">
              <>
                <input name="categoria" list="categorias-financeiras" required placeholder="Selecione ou digite uma nova categoria" className="input-financeiro" />
                <datalist id="categorias-financeiras">
                  {categorias.map((categoria) => (
                    <option key={categoria} value={categoria} />
                  ))}
                </datalist>
              </>
            </Campo>
            <Campo label="Valor">
              <input name="valor" type="number" min="0.01" step="0.01" required placeholder="0,00" className="input-financeiro" />
            </Campo>
            <Campo label="Observação">
              <textarea name="observacao" rows={3} placeholder="Informações opcionais" className="input-financeiro resize-none" />
            </Campo>

            <div className="rounded-xl bg-gray-50 px-4 py-3 text-xs text-gray-500">
              O lançamento aumenta a categoria da despesa e reduz automaticamente o saldo do Banco.
            </div>
            <button disabled={isPending} className="min-h-12 w-full rounded-xl bg-gray-950 text-xs font-black uppercase tracking-widest text-white hover:bg-amber-500 hover:text-black disabled:opacity-50">
              {isPending ? "Salvando..." : "Salvar Despesa"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function Linha({
  label,
  value,
  negative = false,
}: {
  label: string;
  value: number;
  negative?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
      <span className="font-semibold text-gray-600">{label}</span>
      <span className={negative ? "font-black text-red-700" : "font-black text-gray-900"}>
        {moeda(value)}
      </span>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">
        {label}
      </span>
      {children}
    </label>
  );
}
