"use client";

import { useState } from "react";
import { criarRifa, aprovarPagamentoBilhete, cancelarBilhete, realizarSorteio } from "../actions";

interface Rifa {
  id: number;
  titulo: string;
  descricao: string | null;
  imagem: string | null;
  pixFixo: string | null;
  precoBilhete: number;
  status: string;
  dataSorteio: string | null;
  numeroGanhador: number | null;
  createdAt: string;
}

interface Bilhete {
  id: number;
  rifaId: number;
  nome: string;
  telefone: string;
  usernameInsta: string;
  usernameFace: string | null;
  numeroBilhete: number;
  statusPagto: string;
  pixTxid: string | null;
  createdAt: string;
}

function compressImageToWebP(file: File, maxWidth = 800, quality = 0.75): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context not available"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Canvas toBlob returned null"));
            }
          },
          "image/webp",
          quality
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

export default function GerenciadorRifas({
  rifas: initialRifas,
  bilhetes: initialBilhetes,
}: {
  rifas: any[];
  bilhetes: any[];
}) {
  const [rifas, setRifas] = useState<Rifa[]>(initialRifas);
  const [bilhetes, setBilhetes] = useState<Bilhete[]>(initialBilhetes);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [precoBilhete, setPrecoBilhete] = useState("10.00");
  const [imagemFile, setImagemFile] = useState<File | null>(null);
  const [pixFixo, setPixFixo] = useState("");

  // Filter State
  const [selectedRifaId, setSelectedRifaId] = useState<number | null>(
    initialRifas.length > 0 ? initialRifas[0].id : null
  );
  const [statusFilter, setStatusFilter] = useState<string>("TODOS");

  // Sorteio Animation State
  const [sorteandoId, setSorteandoId] = useState<number | null>(null);
  const [nomeSorteado, setNomeSorteado] = useState("");
  const [numeroSorteado, setNumeroSorteado] = useState<number | null>(null);
  const [winnerModal, setWinnerModal] = useState<{
    nome: string;
    telefone: string;
    usernameInsta: string;
    numeroBilhete: number;
  } | null>(null);

  const selectedRifa = rifas.find((r) => r.id === selectedRifaId);
  const filteredBilhetes = bilhetes.filter((b) => {
    if (b.rifaId !== selectedRifaId) return false;
    if (statusFilter === "TODOS") return true;
    return b.statusPagto === statusFilter;
  });

  const handleCreateRifa = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    const formData = new FormData();
    formData.append("titulo", titulo);
    formData.append("descricao", descricao);
    formData.append("precoBilhete", precoBilhete);
    formData.append("pixFixo", pixFixo);

    if (imagemFile) {
      try {
        const compressedBlob = await compressImageToWebP(imagemFile);
        const compressedFile = new File([compressedBlob], "image.webp", { type: "image/webp" });
        formData.append("imagemFile", compressedFile);
      } catch (err) {
        console.error("Erro ao preparar imagem:", err);
        setErrorMsg("A imagem não pôde ser comprimida. Escolha outro arquivo.");
        setLoading(false);
        return;
      }
    }

    const res = await criarRifa(formData);
    setLoading(false);

    if (res.success) {
      setSuccessMsg("Rifa criada com sucesso!");
      setShowCreateModal(false);
      setTitulo("");
      setDescricao("");
      setPrecoBilhete("10.00");
      setImagemFile(null);
      setPixFixo("");
      window.location.reload();
    } else {
      setErrorMsg(res.error || "Erro ao criar rifa.");
    }
  };

  const handleApprove = async (id: number) => {
    if (!confirm("Confirmar o recebimento do Pix para este bilhete?")) return;
    setLoading(true);
    const res = await aprovarPagamentoBilhete(id);
    setLoading(false);
    if (res.success) {
      setBilhetes(
        bilhetes.map((b) => (b.id === id ? { ...b, statusPagto: "PAGO" } : b))
      );
      setSuccessMsg("Pagamento do bilhete aprovado com sucesso!");
    } else {
      setErrorMsg(res.error || "Erro ao aprovar bilhete.");
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm("Tem certeza que deseja cancelar este bilhete?")) return;
    setLoading(true);
    const res = await cancelarBilhete(id);
    setLoading(false);
    if (res.success) {
      setBilhetes(
        bilhetes.map((b) => (b.id === id ? { ...b, statusPagto: "CANCELADO" } : b))
      );
      setSuccessMsg("Bilhete cancelado com sucesso!");
    } else {
      setErrorMsg(res.error || "Erro ao cancelar bilhete.");
    }
  };

  const handleDraw = async (rifaId: number) => {
    const bilhetesPagos = bilhetes.filter(
      (b) => b.rifaId === rifaId && b.statusPagto === "PAGO"
    );

    if (bilhetesPagos.length === 0) {
      alert("Não há bilhetes pagos para realizar o sorteio.");
      return;
    }

    if (
      !confirm(
        `Tem certeza que deseja realizar o sorteio da rifa "${selectedRifa?.titulo}"? Esta ação não pode ser desfeita.`
      )
    )
      return;

    setSorteandoId(rifaId);
    setErrorMsg("");

    // Animação de sorteio (roda por 3 segundos mostrando nomes dos participantes pagos)
    let counter = 0;
    const interval = setInterval(() => {
      const randomTicket =
        bilhetesPagos[Math.floor(Math.random() * bilhetesPagos.length)];
      setNomeSorteado(randomTicket.nome);
      setNumeroSorteado(randomTicket.numeroBilhete);
      counter++;
      if (counter > 25) {
        clearInterval(interval);
        finalizeDraw(rifaId);
      }
    }, 120);
  };

  const finalizeDraw = async (rifaId: number) => {
    const res = await realizarSorteio(rifaId);
    setSorteandoId(null);

    if (res.success && res.ganhador) {
      setWinnerModal(res.ganhador);
      // Atualiza o status local da rifa
      setRifas(
        rifas.map((r) =>
          r.id === rifaId
            ? { ...r, status: "FINALIZADO", numeroGanhador: res.ganhador!.numeroBilhete }
            : r
        )
      );
    } else {
      setErrorMsg(res.error || "Erro ao sortear.");
    }
  };

  return (
    <div className="space-y-6">
      {/* MENSAGENS */}
      {successMsg && (
        <div className="p-4 bg-green-50 text-green-700 rounded-xl border border-green-200">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200">
          {errorMsg}
        </div>
      )}

      {/* CABEÇALHO */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Campanhas de Rifas</h2>
          <p className="text-sm text-gray-500">
            Crie rifas promocionais, valide bilhetes pagos e realize o sorteio final.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-luxury-gold text-white hover:opacity-90 transition-opacity font-bold text-xs uppercase tracking-widest px-5 py-3 rounded-xl cursor-pointer"
        >
          ➕ Criar Nova Rifa
        </button>
      </div>

      {/* ANIMAÇÃO DE SORTEIO */}
      {sorteandoId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-luxury-black text-white p-8 rounded-3xl border border-luxury-gold max-w-md w-full text-center space-y-6 animate-pulse">
            <span className="text-5xl animate-bounce block">🎟️</span>
            <h3 className="text-2xl font-serif font-black tracking-tight text-luxury-gold">
              Sorteando Ganhador...
            </h3>
            <div className="py-6 border-y border-white/10 space-y-2">
              <p className="text-3xl font-black tracking-widest text-white">
                #{String(numeroSorteado ?? 0).padStart(4, "0")}
              </p>
              <p className="text-lg text-gray-400 font-bold uppercase">
                {nomeSorteado || "..."}
              </p>
            </div>
            <p className="text-xs text-gray-500">Selecionando bilhete pago...</p>
          </div>
        </div>
      )}

      {/* MODAL DE GANHADOR */}
      {winnerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-white text-gray-800 p-8 rounded-3xl border border-luxury-gold max-w-md w-full text-center space-y-6 shadow-2xl relative">
            <span className="text-6xl block">🎉🏆🎉</span>
            <h3 className="text-2xl font-serif font-black tracking-tight text-luxury-gold">
              Temos um Ganhador!
            </h3>
            <div className="py-6 bg-amber-50 rounded-2xl border border-luxury-gold/30 space-y-2">
              <p className="text-sm font-semibold uppercase tracking-widest text-amber-800">
                Bilhete Premiado
              </p>
              <p className="text-4xl font-black tracking-widest text-gray-900">
                #{String(winnerModal.numeroBilhete).padStart(4, "0")}
              </p>
              <p className="text-xl font-bold text-gray-800 uppercase mt-2">
                {winnerModal.nome}
              </p>
            </div>
            <div className="text-left space-y-2 text-sm bg-gray-50 p-4 rounded-xl border border-gray-100">
              <p>
                <strong>📱 WhatsApp:</strong>{" "}
                <a
                  href={`https://wa.me/${winnerModal.telefone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-luxury-gold font-bold hover:underline"
                >
                  {winnerModal.telefone}
                </a>
              </p>
              <p>
                <strong>📸 Instagram:</strong>{" "}
                <a
                  href={`https://instagram.com/${winnerModal.usernameInsta.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-luxury-gold font-bold hover:underline"
                >
                  {winnerModal.usernameInsta}
                </a>
              </p>
            </div>
            <button
              onClick={() => {
                setWinnerModal(null);
                window.location.reload();
              }}
              className="w-full bg-luxury-black text-white hover:opacity-90 transition-opacity font-bold text-xs uppercase tracking-widest py-3.5 rounded-xl cursor-pointer"
            >
              Fechar e Atualizar
            </button>
          </div>
        </div>
      )}

      {/* LAYOUT PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* LISTA DE RIFAS */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-2">
            Campanhas
          </h3>
          {rifas.length === 0 ? (
            <p className="text-xs text-gray-400 italic">Nenhuma rifa criada.</p>
          ) : (
            rifas.map((rifa) => {
              const isSelected = rifa.id === selectedRifaId;
              return (
                <button
                  key={rifa.id}
                  onClick={() => {
                    setSelectedRifaId(rifa.id);
                    setStatusFilter("TODOS");
                  }}
                  className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "border-luxury-gold bg-amber-50/50"
                      : "border-gray-100 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-gray-800 text-sm">
                      {rifa.titulo}
                    </h4>
                    <span
                      className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${
                        rifa.status === "ATIVO"
                          ? "bg-green-50 text-green-600 border border-green-200"
                          : "bg-gray-100 text-gray-500 border border-gray-200"
                      }`}
                    >
                      {rifa.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-2">
                    Preço: R$ {Number(rifa.precoBilhete).toFixed(2)}
                  </p>
                  {rifa.numeroGanhador !== null && (
                    <p className="text-[10px] text-amber-800 font-bold mt-1">
                      🏆 Ganhador: #{String(rifa.numeroGanhador).padStart(4, "0")}
                    </p>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* DETALHES E PARTICIPANTES DA RIFA SELECIONADA */}
        <div className="lg:col-span-3 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
          {selectedRifa ? (
            <>
              {/* Detalhes superiores */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-gray-100">
                <div className="flex gap-4 items-start">
                  {selectedRifa.imagem && (
                    <img
                      src={selectedRifa.imagem}
                      alt={selectedRifa.titulo}
                      className="w-16 h-16 rounded-xl object-cover border border-gray-100 flex-shrink-0"
                    />
                  )}
                  <div>
                    <span className="text-[10px] font-bold text-luxury-gold uppercase tracking-widest">
                      Campanha Selecionada
                    </span>
                    <h3 className="text-xl font-bold text-gray-800 mt-0.5">
                      {selectedRifa.titulo}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {selectedRifa.descricao || "Sem descrição."}
                    </p>
                  </div>
                </div>
                {selectedRifa.status === "ATIVO" && (
                  <button
                    onClick={() => handleDraw(selectedRifa.id)}
                    className="bg-emerald-600 text-white hover:bg-emerald-700 transition-colors font-bold text-xs uppercase tracking-widest px-5 py-3 rounded-xl cursor-pointer shadow-sm"
                  >
                    🏆 Realizar Sorteio
                  </button>
                )}
              </div>

              {/* Estatísticas Rápidas da Rifa */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                    Total Bilhetes
                  </p>
                  <p className="text-lg font-black text-gray-800">
                    {bilhetes.filter((b) => b.rifaId === selectedRifa.id).length}
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                  <p className="text-[9px] font-bold text-green-600 uppercase tracking-wider">
                    Pagos
                  </p>
                  <p className="text-lg font-black text-green-700">
                    {
                      bilhetes.filter(
                        (b) => b.rifaId === selectedRifa.id && b.statusPagto === "PAGO"
                      ).length
                    }
                  </p>
                </div>
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                  <p className="text-[9px] font-bold text-amber-600 uppercase tracking-wider">
                    Aguardando Pix
                  </p>
                  <p className="text-lg font-black text-amber-700">
                    {
                      bilhetes.filter(
                        (b) =>
                          b.rifaId === selectedRifa.id &&
                          b.statusPagto === "AGUARDANDO_PAGAMENTO"
                      ).length
                    }
                  </p>
                </div>
                <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                  <p className="text-[9px] font-bold text-red-600 uppercase tracking-wider">
                    Cancelados
                  </p>
                  <p className="text-lg font-black text-red-700">
                    {
                      bilhetes.filter(
                        (b) =>
                          b.rifaId === selectedRifa.id && b.statusPagto === "CANCELADO"
                      ).length
                    }
                  </p>
                </div>
              </div>

              {/* Link e QR Code de Divulgação */}
              <div className="bg-amber-50/30 p-4 rounded-2xl border border-luxury-gold/20 flex flex-col md:flex-row items-center gap-6">
                <div className="bg-white p-2 rounded-xl shadow-sm border border-luxury-gold/10">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                      `${typeof window !== "undefined" ? window.location.origin : ""}/rifas?id=${selectedRifa.id}`
                    )}`}
                    alt="QR Code da Promoção"
                    className="w-28 h-28 object-contain"
                  />
                </div>
                <div className="space-y-2 flex-grow text-center md:text-left">
                  <h4 className="text-sm font-bold text-gray-800">QR Code e Link de Divulgação</h4>
                  <p className="text-xs text-gray-500">
                    Use este QR Code para divulgar a rifa nas redes sociais ou imprimir. Ele direciona o participante diretamente para a página de inscrição desta rifa específica.
                  </p>
                  <div className="flex gap-2 max-w-md mx-auto md:mx-0">
                    <input
                      type="text"
                      readOnly
                      value={`${typeof window !== "undefined" ? window.location.origin : ""}/rifas?id=${selectedRifa.id}`}
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-600 focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        const url = `${window.location.origin}/rifas?id=${selectedRifa.id}`;
                        navigator.clipboard.writeText(url);
                        alert("Link de divulgação copiado!");
                      }}
                      className="bg-luxury-black text-white hover:opacity-90 transition-opacity px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Copiar Link
                    </button>
                  </div>
                </div>
              </div>

              {/* Filtro e Lista de Participantes */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-gray-700">Participantes</h4>
                  <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg text-[10px] font-bold">
                    {["TODOS", "PAGO", "AGUARDANDO_PAGAMENTO", "CANCELADO"].map((status) => (
                      <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                          statusFilter === status
                            ? "bg-white text-gray-800 shadow-sm"
                            : "text-gray-500 hover:text-gray-800"
                        }`}
                      >
                        {status === "AGUARDANDO_PAGAMENTO" ? "AGUARDANDO" : status}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto border border-gray-100 rounded-xl">
                  <table className="min-w-full divide-y divide-gray-100 text-left">
                    <thead className="bg-gray-50 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      <tr>
                        <th className="px-6 py-4">Bilhete</th>
                        <th className="px-6 py-4">Nome / WhatsApp</th>
                        <th className="px-6 py-4">Redes Sociais</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                      {filteredBilhetes.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-8 text-gray-400 italic">
                            Nenhum participante encontrado neste filtro.
                          </td>
                        </tr>
                      ) : (
                        filteredBilhetes.map((bilhete) => (
                          <tr key={bilhete.id} className="hover:bg-gray-50/50">
                            <td className="px-6 py-4 font-mono font-bold text-gray-900">
                              #{String(bilhete.numeroBilhete).padStart(4, "0")}
                            </td>
                            <td className="px-6 py-4 space-y-0.5">
                              <p className="font-bold text-gray-800">{bilhete.nome}</p>
                              <a
                                href={`https://wa.me/${bilhete.telefone.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-luxury-gold font-semibold hover:underline"
                              >
                                {bilhete.telefone}
                              </a>
                            </td>
                            <td className="px-6 py-4 space-y-0.5">
                              <p className="text-[11px]">
                                📸 <strong>Insta:</strong>{" "}
                                <a
                                  href={`https://instagram.com/${bilhete.usernameInsta.replace("@", "")}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-luxury-gold hover:underline font-semibold"
                                >
                                  {bilhete.usernameInsta}
                                </a>
                              </p>
                              {bilhete.usernameFace && (
                                <p className="text-[11px] text-gray-500">
                                  👥 <strong>Face:</strong> {bilhete.usernameFace}
                                </p>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                                  bilhete.statusPagto === "PAGO"
                                    ? "bg-green-50 text-green-600 border border-green-200"
                                    : bilhete.statusPagto === "CANCELADO"
                                    ? "bg-red-50 text-red-600 border border-red-200"
                                    : "bg-amber-50 text-amber-600 border border-amber-200"
                                }`}
                              >
                                {bilhete.statusPagto === "AGUARDANDO_PAGAMENTO"
                                  ? "AGUARDANDO"
                                  : bilhete.statusPagto}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right space-x-2">
                              {bilhete.statusPagto === "AGUARDANDO_PAGAMENTO" && (
                                <>
                                  <button
                                    onClick={() => handleApprove(bilhete.id)}
                                    className="bg-green-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-green-700 transition-colors cursor-pointer"
                                  >
                                    Confirmar Pix
                                  </button>
                                  <button
                                    onClick={() => handleCancel(bilhete.id)}
                                    className="border border-red-200 text-red-600 px-3 py-1.5 rounded-lg font-bold hover:bg-red-50 transition-colors cursor-pointer"
                                  >
                                    Cancelar
                                  </button>
                                </>
                              )}
                              {bilhete.statusPagto === "PAGO" && (
                                <span className="text-[10px] text-gray-400 italic">
                                  Confirmado
                                </span>
                              )}
                              {bilhete.statusPagto === "CANCELADO" && (
                                <span className="text-[10px] text-red-400 italic">
                                  Cancelado
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="py-20 text-center text-gray-400 italic">
              Selecione ou crie uma rifa para gerenciar.
            </div>
          )}
        </div>
      </div>

      {/* CREATE RIFA MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-3xl border border-gray-100 max-w-md w-full space-y-6 shadow-2xl relative">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800">Criar Nova Rifa</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-800 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateRifa} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase">
                  Título do Kit
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Kit Perfume Premium VIP"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-luxury-gold text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase">
                  Descrição do Kit
                </label>
                <textarea
                  rows={3}
                  placeholder="Explique o que vem no kit..."
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-luxury-gold text-sm resize-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase">
                  Imagem do Prêmio (Opcional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImagemFile(e.target.files?.[0] || null)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-luxury-gold text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase">
                  Código Pix Copia e Cola / Chave Pix
                </label>
                <textarea
                  rows={2}
                  placeholder="Insira a chave Pix ou o código Copia e Cola completo"
                  value={pixFixo}
                  onChange={(e) => setPixFixo(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-luxury-gold text-sm resize-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase">
                  Preço por Bilhete (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0"
                  value={precoBilhete}
                  onChange={(e) => setPrecoBilhete(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-luxury-gold text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-luxury-gold text-white font-bold text-xs uppercase tracking-widest py-3.5 rounded-xl hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 mt-2"
              >
                {loading ? "Gravando..." : "Criar Rifa"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
