import { Suspense } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { buscarRifaAtiva } from "./actions";
import { getSocialLinks } from "../../lib/site-config";
import RifaWizard from "./components/RifaWizard";

export const metadata = {
  title: "Sorteios & Rifas | Mourato & Associados",
  description: "Participe das nossas campanhas exclusivas seguindo nossas páginas e concorrendo a kits de perfumes de nicho.",
};

export const dynamic = "force-dynamic";

export default async function RifasPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const params = await searchParams;
  const rifaId = params.id ? Number(params.id) : undefined;

  const activeRes = await buscarRifaAtiva(rifaId);
  const socialLinks = await getSocialLinks();

  const rifa = activeRes.success ? activeRes.rifa : null;

  return (
    <div className="flex flex-col min-h-screen max-w-full overflow-x-hidden bg-luxury-black bg-radial-gradient">
      <Navbar />

      <main className="flex-grow pt-44 sm:pt-36 pb-20 px-4 sm:px-6 md:px-8">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Header Visual Premium */}
          <header className="text-center flex flex-col items-center justify-center">
            <span className="text-gold text-[9px] font-bold uppercase tracking-[0.3em] mb-2 block">
              Campanhas Exclusivas
            </span>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif mb-3 tracking-tight bg-gradient-to-r from-white via-[#F5E6C4] to-[#D4AF37] bg-clip-text text-transparent font-black">
              Sorteios e Prêmios
            </h1>
            <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-gold to-transparent mx-auto mb-4"></div>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
              Ganhe prêmios exclusivos participando de nossas campanhas de engajamento social.
            </p>
          </header>

          <Suspense fallback={<div className="py-20 text-center text-zinc-500 font-serif italic text-lg">Carregando detalhes da campanha...</div>}>
            {rifa ? (
              <RifaWizard rifa={rifa} socialLinks={socialLinks} />
            ) : (
              <div className="max-w-xl mx-auto bg-black/40 backdrop-blur-md rounded-3xl p-12 border border-gold/15 text-center space-y-4">
                <span className="text-4xl block">🎟️⏳</span>
                <h2 className="text-lg font-bold text-white uppercase tracking-wider">
                  Nenhum Sorteio Ativo
                </h2>
                <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                  No momento não temos nenhuma campanha de rifa ativa no site. Fique de olho em nossas redes sociais para saber quando será o próximo lançamento!
                </p>
                <div className="pt-4 flex justify-center gap-4">
                  <a
                    href={socialLinks.instagram || "https://instagram.com"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-zinc-900 border border-gold/20 text-gold px-4 py-2 rounded-xl text-xs font-bold hover:bg-gold hover:text-black transition-all"
                  >
                    Instagram
                  </a>
                  <a
                    href={socialLinks.facebook || "https://facebook.com"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-zinc-900 border border-gold/20 text-gold px-4 py-2 rounded-xl text-xs font-bold hover:bg-gold hover:text-black transition-all"
                  >
                    Facebook
                  </a>
                </div>
              </div>
            )}
          </Suspense>
          
        </div>
      </main>

      <Footer />
    </div>
  );
}
