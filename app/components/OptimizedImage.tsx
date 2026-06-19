"use client";

import Image, { ImageProps } from "next/image";

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
  if (!src) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-neutral-900/30 text-zinc-500 italic font-serif text-xs select-none">
        {fallbackText}
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      className={className}
      unoptimized={!src.startsWith("/") || src.startsWith("//")}
      {...props}
    />
  );
}
