"use client";

import { useState } from "react";
import { registrarParticipante } from "../actions";

interface Rifa {
  id: number;
  titulo: string;
  descricao: string | null;
  imagem: string | null;
  pixFixo: string | null;
  precoBilhete: number;
  status: string;
}

function calculateCRC16(str: string): string {
  let crc = 0xFFFF;
  const polynomial = 0x1021;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    for (let b = 0; b < 8; b++) {
      const bit = ((code >> (7 - b)) & 1) === 1;
      const c15 = ((crc >> 15) & 1) === 1;
      crc <<= 1;
      if (c15 !== bit) {
        crc ^= polynomial;
      }
    }
  }
  crc &= 0xFFFF;
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function generatePixCopiaCola(key: string, amount: number, merchantName = "Mourato e Associados", merchantCity = "Sao Paulo"): string {
  if (key.trim().startsWith("000201")) {
    return key.trim();
  }

  const cleanKey = key.trim();
  const tag01 = "010211"; // Point of Initiation Method: Static QR Code
  const gui = "0014br.gov.bcb.pix";
  const keyTag = "01" + String(cleanKey.length).padStart(2, "0") + cleanKey;
  const merchantAccountInfo = gui + keyTag;
  const tag26 = "26" + String(merchantAccountInfo.length).padStart(2, "0") + merchantAccountInfo;

  const tag52 = "52040000";
  const tag53 = "5303986";

  const safeAmount = isNaN(amount) ? 0 : amount;
  const formattedAmount = safeAmount.toFixed(2);
  const tag54 = "54" + String(formattedAmount.length).padStart(2, "0") + formattedAmount;

  const tag58 = "5802BR";

  const cleanName = merchantName.substring(0, 25).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const tag59 = "59" + String(cleanName.length).padStart(2, "0") + cleanName;

  const cleanCity = merchantCity.substring(0, 15).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const tag60 = "60" + String(cleanCity.length).padStart(2, "0") + cleanCity;

  const tag62 = "62070503***";

  const payload = "000201" + tag01 + tag26 + tag52 + tag53 + tag54 + tag58 + tag59 + tag60 + tag62 + "6304";
  const crc = calculateCRC16(payload);
  return payload + crc;
}

export default function RifaWizard({
  rifa,
  socialLinks,
}: {
  rifa: Rifa;
  socialLinks: {
    instagram: string;
    facebook: string;
  };
}) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Form Fields
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [usernameInsta, setUsernameInsta] = useState("");
  const [usernameFace, setUsernameFace] = useState("");

  // Social Clicks Tracker
  const [clickedInsta, setClickedInsta] = useState(false);
  const [clickedFace, setClickedFace] = useState(false);

  // Result state
  const [generatedTicket, setGeneratedTicket] = useState<{
    numeroBilhete: number;
    statusPagto: string;
  } | null>(null);

  // Validations
  const nomeValido = nome.trim().split(/\s+/).length >= 2 && nome.trim().length >= 5;
  const telefoneValido = telefone.replace(/\D/g, "").length === 11;
  const instaValido = /^@[a-zA-Z0-9._]{2,30}$/.test(usernameInsta.trim());
  const isFormValid = nomeValido && telefoneValido && instaValido;
  const isSocialsClicked = clickedInsta && clickedFace;

  const handleNextStep = () => {
    if (!nomeValido) {
      setErrorMsg("Informe seu nome completo (nome e sobrenome).");
    } else if (!telefoneValido) {
      setErrorMsg("Telefone inválido. Use o formato (XX) XXXXX-XXXX.");
    } else if (!instaValido) {
      setErrorMsg("Instagram inválido. Use o formato @seu_perfil (sem espaços).");
    } else {
      setErrorMsg("");
      setStep(2);
    }
  };

  const formatTelefone = (value: string) => {
    // Apenas números
    const clean = value.replace(/\D/g, "");
    if (clean.length <= 11) {
      // Máscara (XX) XXXXX-XXXX
      return clean
        .replace(/^(\d{2})(\d)/g, "($1) $2")
        .replace(/(\d)(\d{4})$/, "$1-$2");
    }
    return value;
  };

  const handleRegister = async () => {
    setLoading(true);
    setErrorMsg("");

    const formData = new FormData();
    formData.append("rifaId", String(rifa.id));
    formData.append("nome", nome);
    formData.append("telefone", telefone);
    formData.append("usernameInsta", usernameInsta);
    formData.append("usernameFace", usernameFace);

    const res = await registrarParticipante(formData);
    setLoading(false);

    if (res.success && res.bilhete) {
      setGeneratedTicket(res.bilhete);
      setStep(3);
    } else {
      setErrorMsg(res.error || "Erro ao registrar participação.");
    }
  };

  // Geração de Pix Copia e Cola com base na chave/código cadastrado na rifa
  const pixCopiaCola = generatePixCopiaCola(
    rifa.pixFixo || "d9534abb-31ed-4d1b-8c56-7d080848586e",
    Number(rifa.precoBilhete)
  );

  return (
    <div className="max-w-xl mx-auto bg-black/40 backdrop-blur-md rounded-3xl p-6 md:p-8 border border-gold/15 text-white space-y-6">
      {/* MENSAGEM DE ERRO */}
      {errorMsg && (
        <div className="p-4 bg-red-900/60 text-red-200 rounded-2xl border border-red-500/30 text-sm">
          ⚠️ {errorMsg}
        </div>
      )}

      {/* DETALHES DA RIFA */}
      <div className="text-center pb-6 border-b border-gold/10">
        <span className="text-gold text-[9px] font-bold uppercase tracking-[0.3em] mb-2 block">
          Campanha Promocional
        </span>
        <h2 className="text-2xl font-serif font-black tracking-tight text-white mb-2">
          {rifa.titulo}
        </h2>
        {rifa.imagem && (
          <div className="my-4 max-w-[200px] mx-auto rounded-2xl overflow-hidden border border-gold/15 shadow-lg">
            <img src={rifa.imagem} alt={rifa.titulo} className="w-full h-auto object-cover" />
          </div>
        )}
        <p className="text-xs text-zinc-400 max-w-md mx-auto">
          {rifa.descricao || "Participe e concorra a um kit exclusivo de perfumes."}
        </p>
        <div className="mt-4 inline-block bg-gold/10 px-4 py-2 rounded-full border border-gold/20">
          <span className="text-xs text-gold font-bold uppercase tracking-wider">
            Valor da Cota:{" "}
            {Number(rifa.precoBilhete) > 0
              ? `R$ ${Number(rifa.precoBilhete).toFixed(2)}`
              : "GRÁTIS"}
          </span>
        </div>
      </div>

      {/* INDICADOR DE ETAPA */}
      <div className="flex justify-center items-center gap-4 text-xs font-bold uppercase tracking-wider text-zinc-500">
        <span className={step === 1 ? "text-gold" : generatedTicket ? "text-green-400" : "text-white"}>
          1. Cadastro
        </span>
        <span>➔</span>
        <span className={step === 2 ? "text-gold" : generatedTicket ? "text-green-400" : ""}>
          2. Social
        </span>
        <span>➔</span>
        <span className={step === 3 ? "text-gold font-black" : ""}>
          3. Pagamento
        </span>
      </div>

      {/* ETAPA 1: DADOS */}
      {step === 1 && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wide">
            Preencha seus dados para começar
          </h3>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              Nome Completo *
            </label>
            <input
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Digite seu nome completo"
              className="w-full bg-zinc-950/80 border border-gold/15 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gold placeholder-zinc-600 text-white"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                WhatsApp *
              </label>
              <input
                type="tel"
                required
                value={telefone}
                onChange={(e) => setTelefone(formatTelefone(e.target.value))}
                placeholder="(00) 00000-0000"
                className="w-full bg-zinc-950/80 border border-gold/15 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gold placeholder-zinc-600 text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Instagram *
              </label>
              <input
                type="text"
                required
                value={usernameInsta}
                onChange={(e) => {
                  let val = e.target.value.replace(/\s/g, "");
                  if (val && !val.startsWith("@")) val = "@" + val;
                  setUsernameInsta(val);
                }}
                placeholder="@seu_perfil"
                className="w-full bg-zinc-950/80 border border-gold/15 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gold placeholder-zinc-600 text-white"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              Facebook (Opcional)
            </label>
            <input
              type="text"
              value={usernameFace}
              onChange={(e) => setUsernameFace(e.target.value)}
              placeholder="Nome ou link do perfil"
              className="w-full bg-zinc-950/80 border border-gold/15 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gold placeholder-zinc-600 text-white"
            />
          </div>

          <button
            onClick={handleNextStep}
            disabled={!isFormValid}
            className="w-full bg-gradient-to-r from-gold/80 to-gold text-black font-black text-xs uppercase tracking-widest py-4 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none mt-2"
          >
            Avançar para Etapa Social
          </button>
        </div>
      )}

      {/* ETAPA 2: SOCIAL */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="space-y-2 text-center">
            <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wide">
              Siga nossas Redes Sociais
            </h3>
            <p className="text-xs text-zinc-400">
              Para validar sua participação, clique nos botões abaixo para seguir nossas páginas oficiais. O formulário continuará aberto aqui!
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a
              href={socialLinks.instagram || "https://instagram.com"}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setClickedInsta(true)}
              className={`flex items-center justify-center gap-3 px-5 py-4 rounded-xl font-bold text-xs uppercase tracking-widest border transition-all ${
                clickedInsta
                  ? "bg-green-950/40 border-green-500/50 text-green-300"
                  : "bg-gradient-to-r from-pink-600 to-purple-600 border-transparent text-white hover:scale-[1.02] active:scale-[0.98]"
              }`}
            >
              <span>{clickedInsta ? "✅ Seguido" : "📸 Siga no Instagram"}</span>
            </a>

            <a
              href={socialLinks.facebook || "https://facebook.com"}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setClickedFace(true)}
              className={`flex items-center justify-center gap-3 px-5 py-4 rounded-xl font-bold text-xs uppercase tracking-widest border transition-all ${
                clickedFace
                  ? "bg-green-950/40 border-green-500/50 text-green-300"
                  : "bg-blue-600 border-transparent text-white hover:scale-[1.02] active:scale-[0.98]"
              }`}
            >
              <span>{clickedFace ? "✅ Seguido" : "👥 Siga no Facebook"}</span>
            </a>
          </div>

          <div className="pt-4 border-t border-gold/10 space-y-3">
            <button
              onClick={handleRegister}
              disabled={!isSocialsClicked || loading}
              className="w-full bg-gradient-to-r from-gold to-[#D4AF37] text-black font-black text-xs uppercase tracking-widest py-4 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
            >
              {loading ? "Gerando Bilhete..." : "Finalizar Cadastro e Gerar Bilhete"}
            </button>
            <button
              onClick={() => setStep(1)}
              className="w-full text-zinc-400 hover:text-white font-bold text-[10px] uppercase tracking-widest text-center py-2"
            >
              ← Voltar e ajustar dados
            </button>
          </div>
        </div>
      )}

      {/* ETAPA 3: BILHETE E PAGAMENTO */}
      {step === 3 && generatedTicket && (
        <div className="relative space-y-6 text-center">
          <a
            href="/produtos"
            className="absolute -top-2 -right-2 w-8 h-8 flex items-center justify-center rounded-full bg-zinc-900 border border-gold/20 text-zinc-400 hover:text-gold hover:border-gold/50 transition-all text-sm"
            aria-label="Fechar"
          >
            ✕
          </a>
          <div className="space-y-2">
            <span className="text-4xl">🎟️✨</span>
            <h3 className="text-xl font-serif font-black tracking-tight text-white">
              Bilhete Reservado com Sucesso!
            </h3>
            <p className="text-xs text-zinc-400">
              Guarde o número do seu bilhete. O sorteio será realizado após a confirmação dos pagamentos.
            </p>
          </div>

          {/* NÚMERO DO BILHETE */}
          <div className="bg-gold/5 border border-gold/30 rounded-2xl py-6 max-w-xs mx-auto space-y-1">
            <p className="text-[10px] font-bold text-gold uppercase tracking-wider">
              Seu Número da Sorte
            </p>
            <p className="text-4xl font-mono font-black text-white tracking-widest">
              #{String(generatedTicket.numeroBilhete).padStart(4, "0")}
            </p>
          </div>

          {/* FLUXO PIX (SE COBRADO) */}
          {Number(rifa.precoBilhete) > 0 ? (
            <div className="space-y-4 pt-4 border-t border-gold/10 text-left">
              <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wide text-center">
                Efetue o pagamento de R$ {Number(rifa.precoBilhete).toFixed(2)} via Pix
              </h4>
              
              {/* QR Code Placeholder (Centralizado) */}
              <div className="flex justify-center py-2">
                <div className="bg-white p-3 rounded-2xl shadow-lg border border-gold/10">
                  {generatedTicket && (generatedTicket as any).qrCodeBase64 ? (
                    <img
                      src={`data:image/png;base64,${(generatedTicket as any).qrCodeBase64}`}
                      alt="QR Code Pix"
                      className="w-40 h-40 object-contain"
                    />
                  ) : (
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                        (generatedTicket as any).qrCode || pixCopiaCola
                      )}`}
                      alt="QR Code Pix"
                      className="w-40 h-40 object-contain"
                    />
                  )}
                </div>
              </div>

              {/* Copia e cola */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Pix Copia e Cola
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={(generatedTicket as any).qrCode || pixCopiaCola}
                    className="w-full bg-zinc-950/80 border border-gold/15 rounded-xl px-3 py-2.5 text-[10px] focus:outline-none text-zinc-300 font-mono overflow-hidden text-ellipsis whitespace-nowrap"
                  />
                  <button
                    onClick={() => {
                      const textToCopy = (generatedTicket as any).qrCode || pixCopiaCola;
                      navigator.clipboard.writeText(textToCopy);
                      alert("Pix Copia e Cola copiado para a área de transferência!");
                    }}
                    className="bg-gold text-black font-bold text-xs px-4 rounded-xl hover:scale-[1.02] transition-transform cursor-pointer flex-shrink-0"
                  >
                    Copiar
                  </button>
                </div>
              </div>


            </div>
          ) : (
            <div className="bg-green-950/20 border border-green-500/30 rounded-2xl p-6 space-y-3">
              <span className="text-3xl block">✅</span>
              <p className="text-sm text-green-300 font-bold">
                Participação Gratuita Confirmada!
              </p>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Sua cota foi validada instantaneamente. Agora é só torcer! Boa sorte!
              </p>
            </div>
          )}

          <div className="pt-4">
            <a
              href="/produtos"
              className="inline-block bg-zinc-950 text-gold border border-gold/20 hover:bg-gold/10 font-bold text-xs uppercase tracking-widest px-6 py-3 rounded-xl cursor-pointer transition-colors"
            >
              Finalizar
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
