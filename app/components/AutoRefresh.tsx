"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

interface AutoRefreshProps {
  /** Intervalo em milissegundos (padrão: 30s) */
  interval?: number;
}

/**
 * Componente invisível que faz router.refresh() automaticamente.
 * Usado no painel do lojista para detectar novos pedidos QR Code sem precisar recarregar a página.
 */
export default function AutoRefresh({ interval = 30000 }: AutoRefreshProps) {
  const router = useRouter();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      router.refresh();
    }, interval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [router, interval]);

  return null;
}
