"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { aprovarLojista, deleteLojista, gerarLinkRecuperacaoLojista } from "../actions";

interface Lojista {
  id: number;
  nome: string;
  email: string;
  documento: string | null;
  telefone: string | null;
  cidade: string | null;
  estado: string | null;
  status: string | null;
  codigoRevenda?: string | null;
  tipo: string;
  createdAt: Date;
}

export default function ListaLojistas({ lojistas }: { lojistas: Lojista[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const pendentes = lojistas.filter((lojista) => lojista.status !== "aprovado");
  const aprovados = lojistas.filter((lojista) => lojista.status === "aprovado");

  function handleDelete(id: number) {
  if (!confirm("Remover este lojista do cadastro?")) return;

  startTransition(async () => {
    const result = await deleteLojista(id);
    if (!result.success) {
      alert(result.error);
    } else {
      // Refresh the page to reflect deletion
      router.refresh();
    }
  });
}

  function handleApprove(id: number) {
    if (!confirm("Validar este cadastro e liberar acesso do lojista ao painel?")) return;

    startTransition(async () => {
      const result = await aprovarLojista(id);
      if (!result.success) {
        alert(result.error);
      } else {
        alert("Cadastro validado. O lojista já pode acessar o painel.");
      }
    });
  }

  function handleRecovery(id: number, email: string) {
    if (!confirm("Gerar link de recuperação de senha para este lojista?")) return;

    startTransition(async () => {
      const result = await gerarLinkRecuperacaoLojista(id);

      if (!result.success) {
        alert(result.error);
        return;
      }

      const texto = result.emailed
        ? result.message
        : `${result.message}\n\nLink:\n${result.link}`;

      alert(texto);

      if (!result.emailed && result.link) {
        window.location.href = `mailto:${email}?subject=Recuperação de senha - Mourato & Associados&body=${encodeURIComponent(
          `Olá. Use este link para redefinir sua senha de lojista:\n\n${result.link}\n\nDepois da troca, o administrador precisará aprovar seu acesso novamente.`
        )}`;
      }
    });
  }

  function renderRows(lista: Lojista[], emptyMessage: string) {
    return (
      <tbody className="bg-white divide-y divide-gray-100">
        {lista.map((lojista) => {
          const aguardandoAprovacao = lojista.status !== "aprovado";
          const linkRevenda = lojista.codigoRevenda ? `https://mouratoassociados.com.br/r/${lojista.codigoRevenda}` : "";

          return (
            <tr key={lojista.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-luxury-black text-luxury-white flex items-center justify-center text-sm font-bold uppercase">
                    {lojista.nome.substring(0, 1)}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900">{lojista.nome}</div>
                    <div className="text-xs text-gray-500">{lojista.documento || "Sem CPF/CNPJ"}</div>
                    {linkRevenda && (
                      <div className="mt-1 flex flex-col gap-1">
                        <a href={linkRevenda} target="_blank" className="text-xs font-bold text-indigo-600 hover:text-indigo-800">
                          Link/QR de revenda
                        </a>
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=92x92&data=${encodeURIComponent(linkRevenda)}`}
                          alt="QR Code de revenda"
                          className="h-16 w-16 rounded border border-gray-100 bg-white p-1"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{lojista.email}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                <div>{lojista.telefone || "Sem telefone"}</div>
                <div className="text-xs text-gray-500">
                  {[lojista.cidade, lojista.estado].filter(Boolean).join(" / ") || "Sem cidade"}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2.5 py-1 text-xs font-bold rounded-full border uppercase tracking-widest ${
                  aguardandoAprovacao
                    ? "bg-amber-50 text-amber-700 border-amber-100"
                    : "bg-green-50 text-green-700 border-green-100"
                }`}>
                  {aguardandoAprovacao ? "aguardando aprovação" : "aprovado"}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(lojista.createdAt).toLocaleDateString("pt-BR")}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right">
                <Link
                  href={`/admin/lojistas/${lojista.id}`}
                  className="text-gray-700 hover:text-black hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-all text-sm font-medium mr-2"
                >
                  Consultar
                </Link>
                {aguardandoAprovacao && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleApprove(lojista.id)}
                    className="text-green-600 hover:text-green-800 hover:bg-green-50 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 cursor-pointer text-sm font-medium mr-2"
                  >
                    Validar Cadastro
                  </button>
                )}
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleRecovery(lojista.id, lojista.email)}
                  className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 cursor-pointer text-sm font-medium mr-2"
                >
                  Recuperar Senha
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleDelete(lojista.id)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 cursor-pointer text-sm font-medium"
                >
                  Excluir
                </button>
              </td>
            </tr>
          );
        })}
        {lista.length === 0 && (
          <tr>
            <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500 italic">
              {emptyMessage}
            </td>
          </tr>
        )}
      </tbody>
    );
  }

  return (
    <div className="space-y-6">
    <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-amber-50">
        <h3 className="font-bold text-gray-800">Caixa de entrada - aguardando aprovação</h3>
        <p className="text-xs text-gray-500 mt-1">Quando o admin aprova, o cadastro sai daqui e continua abaixo em lojistas aprovados.</p>
      </div>
      <div className="admin-table-scroll max-h-[70vh] overflow-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Lojista</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">E-mail</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Contato</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Cadastro</th>
              <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-widest">Ações</th>
            </tr>
          </thead>
          {renderRows(pendentes, "Nenhum cadastro aguardando aprovação.")}
        </table>
      </div>
    </div>
    <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-green-50">
        <h3 className="font-bold text-gray-800">Lojistas aprovados</h3>
        <p className="text-xs text-gray-500 mt-1">Cadastros ativos que podem acessar o painel lojista.</p>
      </div>
      <div className="admin-table-scroll max-h-[70vh] overflow-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Lojista</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">E-mail</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Contato</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Cadastro</th>
              <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-widest">Ações</th>
            </tr>
          </thead>
          {renderRows(aprovados, "Nenhum lojista aprovado até agora.")}
        </table>
      </div>
    </div>
    </div>
  );
}
