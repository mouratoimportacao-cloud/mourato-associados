"use client";

import { useEffect, useState } from "react";

interface Props {
  className?: string;
  iconClassName?: string;
}

export default function PwaInstallButton({ className = "", iconClassName = "h-full w-full object-cover p-2 text-luxury-black hover:text-luxury-gold" }: Props) {
  const [isStandalone, setIsStandalone] = useState(true); // Inicializa como true para não mostrar na hidratação inicial

  useEffect(() => {
    // Verificar se já está rodando como standalone
    const isInStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    
    setIsStandalone(isInStandaloneMode);
  }, []);

  function handleInstallTrigger() {
    if (typeof (window as any).triggerPwaInstall === "function") {
      (window as any).triggerPwaInstall();
    } else {
      alert("A instalação automática não está disponível neste navegador. Adicione o site à tela de início manualmente.");
    }
  }

  if (isStandalone) return null;

  return (
    <button
      onClick={handleInstallTrigger}
      aria-label="Instalar Aplicativo"
      title="Instalar Aplicativo na Tela de Início"
      className={`inline-flex items-center justify-center rounded-full overflow-hidden border border-white/70 shadow-sm transition-transform hover:scale-110 cursor-pointer bg-white ${className}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={iconClassName}
      >
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
        <line x1="12" y1="18" x2="12.01" y2="18" />
        <path d="M12 6v6" />
        <path d="m9 9 3 3 3-3" />
      </svg>
    </button>
  );
}
