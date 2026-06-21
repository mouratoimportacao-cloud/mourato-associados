import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

export function normalizeImportedImage(rawValue: unknown) {
  let value = rawValue === undefined || rawValue === null ? "" : String(rawValue).trim();
  value = value.replace(/^=IMAGE\(["'](.+)["']\)$/i, "$1").replace(/^["']|["']$/g, "");
  if (!value) return { src: "", warning: "Imagem ausente." };

  if (value.startsWith("data:image/")) return { src: value, warning: "" };

  const driveMatch = value.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
  if (driveMatch) {
    return {
      src: `https://drive.google.com/uc?export=view&id=${driveMatch[1]}`,
      warning: "",
    };
  }

  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      if (url.hostname.includes("dropbox.com")) {
        url.searchParams.delete("dl");
        url.searchParams.set("raw", "1");
      }
      return { src: url.toString(), warning: "" };
    } catch {
      return { src: "", warning: `Link de imagem inválido: "${value}".` };
    }
  }

  value = value.replace(/\\/g, "/").replace(/^file:\/+/i, "");
  const publicIndex = value.toLowerCase().lastIndexOf("/public/");
  if (publicIndex >= 0) value = value.slice(publicIndex + "/public".length);
  if (value.toLowerCase().startsWith("public/")) value = value.slice("public".length);
  if (!value.startsWith("/")) value = `/${value}`;

  const publicRoot = join(process.cwd(), "public");
  const directPath = join(publicRoot, value.replace(/^\/+/, ""));
  if (existsSync(directPath)) return { src: value, warning: "" };

  const filename = value.split("/").pop() || "";
  const stem = filename.replace(/\.[^.]+$/, "").toLowerCase();
  for (const directory of ["uploads", "marketing", "brand"]) {
    const absoluteDirectory = join(publicRoot, directory);
    if (!existsSync(absoluteDirectory)) continue;
    const match = readdirSync(absoluteDirectory).find((file) => {
      const lower = file.toLowerCase();
      return lower === filename.toLowerCase() || lower === `${stem}.webp`;
    });
    if (match) return { src: `/${directory}/${match}`, warning: "" };
  }

  return {
    src: "",
    warning: `Imagem "${filename || value}" não encontrada nas pastas públicas.`,
  };
}

export async function materializeImportedImage(src: string) {
  if (!/^https?:\/\//i.test(src)) return src || null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(src, {
      signal: controller.signal,
      headers: { "User-Agent": "Mourato-Associados-Image-Importer/1.0" },
    });
    if (!response.ok) return src;

    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength > 8 * 1024 * 1024) return src;

    const input = Buffer.from(await response.arrayBuffer());
    if (input.length > 8 * 1024 * 1024) return src;
    const webp = await sharp(input)
      .rotate()
      .resize({ width: 1600, height: 2000, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    return `data:image/webp;base64,${webp.toString("base64")}`;
  } catch {
    return src;
  } finally {
    clearTimeout(timeout);
  }
}
