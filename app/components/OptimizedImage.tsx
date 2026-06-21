"use client";

import Image, { ImageProps } from "next/image";
import { useState } from "react";

interface OptimizedImageProps extends Omit<ImageProps, "src" | "alt"> {
  src: string | null | undefined;
  alt: string;
  fallbackText?: string;
}

export default function OptimizedImage({
  src,
  alt,
  fallbackText = "Maison Mourato",
  fill,
  className,
  ...props
}: OptimizedImageProps) {
  const [loadError, setLoadError] = useState(false);
  const normalizedSrc = typeof src === "string" ? src.trim() : "";
  const hasValidSrc = Boolean(normalizedSrc) && normalizedSrc !== "null" && normalizedSrc !== "undefined" && !loadError;

  if (!hasValidSrc) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-neutral-900/30 text-zinc-500 italic font-serif text-xs select-none">
        {fallbackText}
      </div>
    );
  }

  const srcToUse = normalizedSrc;

  if (srcToUse.startsWith("data:image/")) {
    return (
      // Data URLs de uploads já estão comprimidas em WebP e não passam pelo otimizador do Next.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={srcToUse}
        alt={alt}
        className={className}
        onError={() => setLoadError(true)}
        style={fill ? { position: "absolute", inset: 0, width: "100%", height: "100%" } : undefined}
      />
    );
  }

  return (
    <Image
      src={srcToUse}
      alt={alt}
      fill={fill}
      className={className}
      unoptimized={!srcToUse.startsWith("/") || srcToUse.startsWith("//")}
      onError={() => setLoadError(true)}
      {...props}
    />
  );
}
