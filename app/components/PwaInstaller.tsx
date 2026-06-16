"use client";

import { useEffect, useState } from "react";

export default function PwaInstaller() {
  const [showBanner, setShowBanner] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIos, setIsIos] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 1. Verificar se já está rodando como PWA (standalone)
    const isInStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    
    setIsStandalone(isInStandaloneMode);

    if (isInStandaloneMode) return;

    // 2. Detectar se é iOS (Safari)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(iosDevice);

    // 3. Capturar o evento de instalação do Android/Chrome
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Mostrar o banner de instalação se não foi dispensado recentemente
      const dismissedTime = localStorage.getItem("pwa-prompt-dismissed");
      const oneDay = 24 * 60 * 60 * 1000;
      if (!dismissedTime || Date.now() - Number(dismissedTime) > oneDay) {
        setShowBanner(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Caso seja iOS, também mostramos o banner de sugestão de instalação (já que não há evento)
    if (iosDevice) {
      const dismissedTime = localStorage.getItem("pwa-prompt-dismissed");
      const oneDay = 24 * 60 * 60 * 1000;
      if (!dismissedTime || Date.now() - Number(dismissedTime) > oneDay) {
        // Atrasar um pouco para não assustar o usuário assim que abre a página
        const timer = setTimeout(() => {
          setShowBanner(true);
        }, 3000);
        return () => clearTimeout(timer);
      }
    }

    // Registrar funções globais para permitir gatilhos externos (ex: botões no header/footer)
    (window as any).triggerPwaInstall = () => {
      if (isInStandaloneMode) {
        alert("O aplicativo já está instalado e rodando!");
        return;
      }
      if (iosDevice) {
        setShowIosModal(true);
      } else if (eEventRef) {
        eEventRef.prompt();
      } else {
        setShowIosModal(true); // Fallback para instruções se o prompt não disparou
      }
    };

    let eEventRef = deferredPrompt;
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, [deferredPrompt]);

  // Atualizar a referência mutável do prompt para uso na função global
  useEffect(() => {
    if (deferredPrompt) {
      (window as any).deferredPromptRef = deferredPrompt;
    }
  }, [deferredPrompt]);

  // Função global de gatilho
  useEffect(() => {
    (window as any).triggerPwaInstall = () => {
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;

      if (isStandaloneMode) {
        alert("O aplicativo já está instalado e rodando!");
        return;
      }

      const userAgent = window.navigator.userAgent.toLowerCase();
      const iosDevice = /iphone|ipad|ipod/.test(userAgent);
      const promptEvent = (window as any).deferredPromptRef;

      if (iosDevice) {
        setShowIosModal(true);
      } else if (promptEvent) {
        promptEvent.prompt();
      } else {
        // Se não for iOS mas o prompt do Chrome não disparou (ou já foi instalado), mostra modal explicativo
        setShowIosModal(true);
      }
    };
  }, []);

  function handleInstallClick() {
    setShowBanner(false);
    if (isIos) {
      setShowIosModal(true);
    } else if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === "accepted") {
          console.log("Usuário aceitou a instalação do PWA");
        }
        setDeferredPrompt(null);
      });
    } else {
      setShowIosModal(true); // Fallback de instrução
    }
  }

  function handleDismiss() {
    setShowBanner(false);
    localStorage.setItem("pwa-prompt-dismissed", String(Date.now()));
  }

  if (isStandalone) return null;

  return (
    <>
      {/* Banner / Pop-up Automático no Rodapé */}
      {showBanner && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm bg-luxury-black text-white p-4 rounded-2xl shadow-2xl border border-luxury-gold/20 z-[9999] animate-in slide-in-from-bottom-5 duration-300 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex gap-3">
              <div className="h-10 w-10 flex-shrink-0 rounded-lg overflow-hidden border border-white/10 bg-white/5 p-1">
                <img src="/brand/logo-ma.png" alt="M&A logo" className="h-full w-full object-contain" />
              </div>
              <div>
                 <h4 className="text-xs font-bold text-luxury-gold uppercase tracking-wider">Criar Atalho</h4>
                <p className="text-xs text-gray-300 mt-1 font-medium">
                  Deseja criar um atalho para essa página?
                </p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-white text-xs font-bold p-1 rounded-full hover:bg-white/5 transition-colors"
            >
              ✕
            </button>
          </div>
          <div className="flex gap-2 justify-end text-[10px] font-bold uppercase tracking-wider">
            <button
              onClick={handleDismiss}
              className="px-3 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Não
            </button>
            <button
              onClick={handleInstallClick}
              className="bg-luxury-gold text-luxury-black px-4 py-2 rounded-lg hover:bg-white hover:text-luxury-black transition-colors"
            >
              Sim, criar
            </button>
          </div>
        </div>
      )}

      {/* Modal de Instruções (Especialmente para iOS) */}
      {showIosModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl text-luxury-black flex flex-col gap-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">📲</span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-luxury-black">Instalar no seu celular</h3>
              </div>
              <button
                onClick={() => setShowIosModal(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold p-1 rounded-full hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-gray-600 leading-relaxed">
              <p>
                Siga estes passos simples para adicionar o aplicativo na sua tela de início:
              </p>

              {isIos ? (
                <div className="space-y-3 bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                  <div className="flex gap-3 items-center">
                    <span className="text-base bg-white shadow-sm rounded-lg p-1.5 border border-gray-200">⎋</span>
                    <p>1. Toque no botão de **Compartilhar** na barra inferior do Safari.</p>
                  </div>
                  <div className="flex gap-3 items-center">
                    <span className="text-base bg-white shadow-sm rounded-lg p-1.5 border border-gray-200">➕</span>
                    <p>2. Role a lista e toque em **"Adicionar à Tela de Início"**.</p>
                  </div>
                  <div className="flex gap-3 items-center">
                    <span className="text-base bg-white shadow-sm rounded-lg p-1.5 border border-gray-200">✨</span>
                    <p>3. Toque em **"Adicionar"** no canto superior direito.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                  <div className="flex gap-3 items-center">
                    <span className="text-base bg-white shadow-sm rounded-lg p-1.5 border border-gray-200">⋮</span>
                    <p>1. Toque nos **três pontinhos** no canto superior direito do Chrome.</p>
                  </div>
                  <div className="flex gap-3 items-center">
                    <span className="text-base bg-white shadow-sm rounded-lg p-1.5 border border-gray-200">📲</span>
                    <p>2. Toque em **"Instalar aplicativo"** ou **"Adicionar à tela inicial"**.</p>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowIosModal(false)}
              className="w-full rounded-xl bg-luxury-black py-2.5 text-xs font-bold uppercase tracking-widest text-white hover:bg-luxury-gold transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
