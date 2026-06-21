export function slugify(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize("NFD") // Decomposes diacritics
    .replace(/[\u0300-\u036f]/g, "") // Removes diacritics (accents)
    .replace(/\s+/g, "-") // Replaces spaces with -
    .replace(/[^\w\-]+/g, "") // Removes non-word chars (except dashes)
    .replace(/\-\-+/g, "-") // Replaces multiple - with single -
    .replace(/^-+/, "") // Trims leading -
    .replace(/-+$/, ""); // Trims trailing -
}
