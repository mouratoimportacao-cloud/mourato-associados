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
            <tr key={lojista.id} className="hover:bg-gray-50 transition-colors align-middle">
              <td className="px-2 py-1.5 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-7 w-7 rounded-full bg-luxury-black text-luxury-white flex items-center justify-center text-xs font-bold uppercase flex-shrink-0">
                    {lojista.nome.substring(0, 1)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-gray-900 truncate" title={lojista.nome}>{lojista.nome}</div>
                    <div className="text-[10px] text-gray-500 font-medium">{lojista.documento || "Sem documento"}</div>
                    {linkRevenda && (
                      <details className="text-[10px] text-gray-500 mt-0.5 cursor-pointer select-none">
                        <summary className="font-bold text-indigo-600 hover:underline">Ver QR Code</summary>
                        <div className="mt-1 flex flex-col gap-1">
                          <a href={linkRevenda} target="_blank" className="text-[10px] font-bold text-indigo-600 underline">
                            Link de revenda
                          </a>
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=92x92&data=${encodeURIComponent(linkRevenda)}`}
                            alt="QR Code de revenda"
                            className="h-14 w-14 rounded border border-gray-100 bg-white p-1"
                          />
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-2 py-1.5 text-xs text-gray-700 truncate" title={lojista.email}>{lojista.email}</td>
              <td className="px-3 py-1.5 whitespace-nowrap text-xs text-gray-700">
                <div>{lojista.telefone || "Sem telefone"}</div>
                <div className="text-[10px] text-gray-400">
                  {[lojista.cidade, lojista.estado].filter(Boolean).join(" / ") || "Sem cidade"}
                </div>
              </td>
              <td className="px-3 py-1.5">
                <span className={`px-2 py-0.5 text-[9px] font-bold rounded border uppercase tracking-wider block w-fit ${
                  aguardandoAprovacao
                    ? "bg-amber-50 text-amber-700 border-amber-100"
                    : "bg-green-50 text-green-700 border-green-100"
                }`}>
                  {aguardandoAprovacao ? "Pendente" : "Aprovado"}
                </span>
                <div className="text-[10px] text-gray-400 mt-1">
                  {new Date(lojista.createdAt).toLocaleDateString("pt-BR")}
                </div>
              </td>
              <td className="px-3 py-1.5 text-right">
                <div className="flex flex-col items-end gap-1">
                  <Link
                    href={`/admin/lojistas/${lojista.id}`}
                    className="text-gray-700 hover:text-black hover:bg-gray-100 px-2 py-0.5 rounded transition-all font-bold text-xs"
                  >
                    Consultar
                  </Link>
                  {aguardandoAprovacao && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleApprove(lojista.id)}
                      className="text-green-600 hover:text-green-800 hover:bg-green-50 px-2 py-0.5 rounded transition-all disabled:opacity-50 cursor-pointer font-bold text-xs"
                    >
                      Validar
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleRecovery(lojista.id, lojista.email)}
                    className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2 py-0.5 rounded transition-all disabled:opacity-50 cursor-pointer font-bold text-xs"
                  >
                    Rec. Senha
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleDelete(lojista.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-0.5 rounded transition-all disabled:opacity-50 cursor-pointer font-bold text-xs"
                  >
                    Excluir
                  </button>
                </div>
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
        <table className="w-full table-fixed divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
            <tr>
              <th style={{ width: "var(--admin-col-loj-nome)" }} className="px-2 py-1.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Lojista</th>
              <th style={{ width: "var(--admin-col-loj-mail)" }} className="px-2 py-1.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">E-mail</th>
              <th style={{ width: "var(--admin-col-loj-tel)" }} className="px-2 py-1.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Contato</th>
              <th style={{ width: "var(--admin-col-loj-status)" }} className="px-2 py-1.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status / Data</th>
              <th style={{ width: "var(--admin-col-loj-actions)" }} className="px-2 py-1.5 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">Ações</th>
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
        <table className="w-full table-fixed divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
            <tr>
              <th style={{ width: "var(--admin-col-loj-nome)" }} className="px-2 py-1.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Lojista</th>
              <th style={{ width: "var(--admin-col-loj-mail)" }} className="px-2 py-1.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">E-mail</th>
              <th style={{ width: "var(--admin-col-loj-tel)" }} className="px-2 py-1.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Contato</th>
              <th style={{ width: "var(--admin-col-loj-status)" }} className="px-2 py-1.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status / Data</th>
              <th style={{ width: "var(--admin-col-loj-actions)" }} className="px-2 py-1.5 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          {renderRows(aprovados, "Nenhum lojista aprovado até agora.")}
        </table>
      </div>
    </div>
    </div>
  );
}
