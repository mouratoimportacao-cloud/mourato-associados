import { prisma } from "../lib/prisma";

const updates = [
  { id: 7, imagem: "/marketing/palais-royal-boulevard.webp" },
  { id: 9, imagem: "/marketing/mahib-100ml.webp" },
  { id: 10, imagem: "/marketing/glamour-extrait-de-parfum.webp" },
  { id: 11, imagem: "/marketing/majestic-extrait-de-parfum.webp" },
  { id: 17, imagem: "/marketing/very-good-girl-glam-parfum.webp" },
  { id: 18, imagem: "/marketing/la-petite-rose-jolie.webp" },
  { id: 19, imagem: "/marketing/al-noble-safeer-eau-de-parfum.webp" },
  { id: 20, imagem: "/marketing/bare-vanilla-noir-fragrance-mist.webp" },
  { id: 21, imagem: "/marketing/coconut-passion-noir-fragrance-mist.webp" },
  { id: 22, imagem: "/marketing/london-paradox.webp" },
  { id: 23, imagem: "/marketing/bare-vanilla-shimmer-fragrance-mist.webp" },
  { id: 24, imagem: "/marketing/la-vida-es-bella.webp" },
  { id: 25, imagem: "/marketing/pink-sexy-scandal-sexy.webp" },
  { id: 26, imagem: "/marketing/yara.webp" },
  { id: 27, imagem: "/marketing/karseell-maca-power-collagen-repair-hair-mask.webp" },
  { id: 28, imagem: "/marketing/kit-victoria-s-secret-amber-romance-bare-vanilla.webp" },
  { id: 30, imagem: "/marketing/al-noble-ameer-eau-de-parfum.webp" },
];

async function main() {
  for (const { id, imagem } of updates) {
    await prisma.produto.update({
      where: { id },
      data: { imagem },
    });
    console.log(`✅ Produto #${id} -> ${imagem}`);
  }
  console.log("\n🎉 Todas as 17 imagens base64 foram convertidas para URL!");
}

main().catch(console.error);
