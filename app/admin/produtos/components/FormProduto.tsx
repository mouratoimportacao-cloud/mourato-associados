"use client";

import { createProduto, updateProduto } from "../actions";
import { ChangeEvent, useRef, useState, useTransition } from "react";

interface Produto {
  id: number;
  codigo?: number | null;
  nome: string;
  marca: string;
  categoria: string;
  volume: string;
  preco: number | null;
  precoAtacado: number | null;
  custoDolar: number | null;
  cotacaoDolar: number | null;
  estoque: number;
  estoqueLojista: number;
  vitrine?: boolean;
  promocaoAtiva?: boolean;
  descontoPercentual?: number | null;
  imagem: string | null;
  descricao: string | null;
  // Campos novos
  categoria_principal?: string | null;
  tags?: string[] | null;
  concentracao?: string | null;
  origem?: string | null;
  tipo_perfume?: string | null;
  genero?: string | null;
  familia_olfativa?: string[] | null;
  notas_topo?: string | null;
  notas_coracao?: string | null;
  notas_fundo?: string | null;
  fixacao_estimada?: string | null;
  projecao?: string | null;
  ocasiao_uso?: string[] | null;
  similaridade_inspiracao?: string | null;
  descricao_olfativa?: string | null;
}

function compressImageToWebP(file: File, maxWidth = 800, quality = 0.75): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context not available"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Canvas toBlob returned null"));
            }
          },
          "image/webp",
          quality
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Não foi possível preparar a imagem."));
    reader.readAsDataURL(blob);
  });
}

interface FormProdutoProps {
  editingProduto: Produto | null;
  onCancelEdit: () => void;
}

const tagOptions = [
  "Perfume Árabe", "Importado", "Feminino", "Masculino", "Unissex"
];

export default function FormProduto({ editingProduto, onCancelEdit }: FormProdutoProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [fileError, setFileError] = useState("");
  const [isPending, startTransition] = useTransition();
  const maxImageSize = 8 * 1024 * 1024;

  const getArrayValue = (val: any): string[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    if (typeof val === "string") {
      return val.split(",").map(v => v.trim()).filter(Boolean);
    }
    return [];
  };

  const currentTags = getArrayValue(editingProduto?.tags);

  async function clientAction(formData: FormData) {
    if (fileError) {
      alert(fileError);
      return;
    }

    startTransition(async () => {
      const imageFile = formData.get("imagemFile") as File | null;
      if (imageFile && imageFile.size > 0) {
        try {
          const compressedBlob = await compressImageToWebP(imageFile);
          const imageDataUrl = await blobToDataUrl(compressedBlob);
          formData.set("imagemDataUrl", imageDataUrl);
          formData.delete("imagemFile");
        } catch (err) {
          console.error("Erro ao preparar imagem:", err);
          alert("A imagem não pôde ser preparada. Escolha outro arquivo e tente novamente.");
          return;
        }
      }

      let result;
      if (editingProduto) {
        result = await updateProduto(editingProduto.id, formData);
      } else {
        result = await createProduto(formData);
      }

      if (result.success) {
        alert(editingProduto ? "Produto atualizado com sucesso." : "Produto cadastrado com sucesso.");
        formRef.current?.reset();
        onCancelEdit();
      } else {
        alert(result.error);
      }
    });
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];

    if (file && file.size > maxImageSize) {
      event.currentTarget.value = "";
      setFileError("A imagem precisa ter no maximo 8 MB.");
      return;
    }

    setFileError("");
  }

  return (
    <div className="bg-neutral-950 p-6 rounded-2xl shadow-2xl border border-zinc-900">
      <h2 className="text-xl font-serif font-black mb-5 text-white flex items-center gap-2">
        <span className={`w-2 h-6 rounded-full ${editingProduto ? 'bg-amber-500' : 'bg-gold'}`}></span>
        {editingProduto ? "Editar Produto" : "Novo Produto"}
      </h2>
      <form 
        ref={formRef} 
        action={clientAction} 
        encType="multipart/form-data"
        onSubmit={(event) => {
          const message = editingProduto
            ? "Deseja salvar as alterações deste produto?"
            : "Deseja cadastrar este produto no catálogo e no estoque?";
          if (!window.confirm(message)) {
            event.preventDefault();
          }
        }}
        key={editingProduto ? editingProduto.id : 'new'}
        className="space-y-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* NOME */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Nome do Produto</label>
            <input
              name="nome"
              required
              disabled={isPending}
              defaultValue={editingProduto?.nome || ""}
              className="w-full rounded-lg border-zinc-800 shadow-sm focus:ring-2 focus:ring-gold focus:border-gold p-2.5 border transition-all text-sm bg-neutral-900 text-white"
              placeholder="Ex: 212 VIP Rose"
            />
          </div>

          {/* MARCA */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Marca</label>
            <input
              name="marca"
              required
              disabled={isPending}
              defaultValue={editingProduto?.marca || ""}
              className="w-full rounded-lg border-zinc-800 shadow-sm focus:ring-2 focus:ring-gold focus:border-gold p-2.5 border transition-all text-sm bg-neutral-900 text-white"
              placeholder="Ex: Carolina Herrera"
            />
          </div>

          {/* CATEGORIA PRINCIPAL */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Categoria Principal</label>
            <select
              name="categoria_principal"
              required
              disabled={isPending}
              defaultValue={editingProduto?.categoria_principal || editingProduto?.categoria || "Perfume"}
              className="w-full rounded-lg border-zinc-800 shadow-sm focus:ring-2 focus:ring-gold focus:border-gold p-2.5 border bg-neutral-900 transition-all text-sm text-white"
            >
              <option value="Perfume">Perfume</option>
              <option value="Cosmético">Cosmético</option>
              <option value="Acessório">Acessório</option>
              <option value="Kit">Kit</option>
            </select>
          </div>

          {/* VOLUME */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Volume</label>
            <input
              name="volume"
              required
              disabled={isPending}
              defaultValue={editingProduto?.volume || ""}
              className="w-full rounded-lg border-zinc-800 shadow-sm focus:ring-2 focus:ring-gold focus:border-gold p-2.5 border transition-all text-sm bg-neutral-900 text-white"
              placeholder="Ex: 100ml"
            />
          </div>

          {/* TAGS (MultiSelect Checkboxes) */}
          <div className="col-span-1 md:col-span-2 space-y-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Tags (Múltipla Seleção)</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 bg-neutral-900/40 p-4 rounded-xl border border-zinc-900">
              {tagOptions.map((tag) => (
                <label key={tag} className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    name="tags"
                    value={tag}
                    disabled={isPending}
                    defaultChecked={currentTags.includes(tag)}
                    className="h-4 w-4 rounded border-zinc-800 text-gold focus:ring-gold bg-zinc-950"
                  />
                  {tag}
                </label>
              ))}
            </div>
          </div>

          {/* SEÇÃO NOVA: INFORMAÇÕES OLFATIVAS */}
          <div className="col-span-1 md:col-span-2 border-t border-zinc-800/80 pt-6 mt-2">
            <h3 className="text-sm font-serif font-black uppercase text-gold tracking-widest mb-5 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-gold rounded-full"></span>
              Informações Olfativas
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* CONCENTRAÇÃO */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Concentração</label>
                <select
                  name="concentracao"
                  disabled={isPending}
                  defaultValue={editingProduto?.concentracao || ""}
                  className="w-full rounded-lg border-zinc-800 p-2.5 border bg-neutral-900 text-sm text-white focus:ring-2 focus:ring-gold"
                >
                  <option value="">Sem especificação</option>
                  <option value="Body Splash">Body Splash</option>
                  <option value="Eau de Cologne">Eau de Cologne</option>
                  <option value="Eau de Toilette (EDT)">Eau de Toilette (EDT)</option>
                  <option value="Eau de Parfum (EDP)">Eau de Parfum (EDP)</option>
                  <option value="Parfum">Parfum</option>
                  <option value="Extrait de Parfum">Extrait de Parfum</option>
                </select>
              </div>

              {/* PIRÂMIDE OLFATIVA */}
              <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 bg-neutral-900/10 p-4 rounded-xl border border-zinc-900/50">
                <div className="space-y-1 col-span-1">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Notas de Topo</label>
                  <input
                    name="notas_topo"
                    disabled={isPending}
                    defaultValue={editingProduto?.notas_topo || ""}
                    className="w-full rounded-lg border-zinc-800 p-2.5 border bg-neutral-900 text-xs text-white"
                    placeholder="Bergamota, Limão Siciliano..."
                  />
                </div>
                <div className="space-y-1 col-span-1">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Notas de Coração</label>
                  <input
                    name="notas_coracao"
                    disabled={isPending}
                    defaultValue={editingProduto?.notas_coracao || ""}
                    className="w-full rounded-lg border-zinc-800 p-2.5 border bg-neutral-900 text-xs text-white"
                    placeholder="Lavanda, Jasmim, Canela..."
                  />
                </div>
                <div className="space-y-1 col-span-1">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Notas de Fundo</label>
                  <input
                    name="notas_fundo"
                    disabled={isPending}
                    defaultValue={editingProduto?.notas_fundo || ""}
                    className="w-full rounded-lg border-zinc-800 p-2.5 border bg-neutral-900 text-xs text-white"
                    placeholder="Âmbar, Musk, Baunilha..."
                  />
                </div>
              </div>

              {/* SIMILARIDADE / INSPIRAÇÃO */}
              <div className="space-y-1 col-span-1 md:col-span-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Inspirado em / Similaridade</label>
                <input
                  name="similaridade_inspiracao"
                  disabled={isPending}
                  defaultValue={editingProduto?.similaridade_inspiracao || ""}
                  className="w-full rounded-lg border-zinc-800 p-2.5 border bg-neutral-900 text-sm text-white"
                  placeholder="Ex: Sauvage, 212 VIP, One Million..."
                />
              </div>

              {/* DESCRIÇÃO OLFATIVA */}
              <div className="space-y-1 col-span-1 md:col-span-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Descrição Olfativa Curta</label>
                <textarea
                  name="descricao_olfativa"
                  rows={2}
                  disabled={isPending}
                  defaultValue={editingProduto?.descricao_olfativa || ""}
                  className="w-full rounded-lg border-zinc-800 p-2.5 border bg-neutral-900 text-sm text-white resize-none"
                  placeholder="Fragrância sofisticada com abertura cítrica vibrante e corpo amadeirado..."
                />
              </div>
            </div>
          </div>

          {/* PREÇO SUGERIDO */}
          <div className="space-y-1 border-t border-zinc-800 pt-6 col-span-1">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Preço Sugerido ao Cliente (R$)</label>
            <input
              name="preco"
              type="number"
              step="0.01"
              required
              disabled={isPending}
              defaultValue={editingProduto?.preco || ""}
              className="w-full rounded-lg border-zinc-800 shadow-sm focus:ring-2 focus:ring-gold focus:border-gold p-2.5 border transition-all text-sm bg-neutral-900 text-white"
              placeholder="0.00"
            />
          </div>

          {/* PREÇO LOJISTA / ATACADO */}
          <div className="space-y-1 border-t border-zinc-800 pt-6 col-span-1">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Preço Lojista / Atacado (R$)</label>
            <input
              name="precoAtacado"
              type="number"
              step="0.01"
              required
              disabled={isPending}
              defaultValue={editingProduto?.precoAtacado || ""}
              className="w-full rounded-lg border-zinc-800 shadow-sm focus:ring-2 focus:ring-gold focus:border-gold p-2.5 border transition-all text-sm bg-neutral-900 text-white"
              placeholder="0.00"
            />
          </div>

          {/* ESTOQUE GERAL */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Estoque Geral</label>
            <input
              name="estoque"
              type="number"
              required
              disabled={isPending}
              defaultValue={editingProduto?.estoque ?? ""}
              className="w-full rounded-lg border-zinc-800 shadow-sm focus:ring-2 focus:ring-gold focus:border-gold p-2.5 border transition-all text-sm bg-neutral-900 text-white"
              placeholder="0"
            />
          </div>

          {/* ESTOQUE LOJISTA */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Qtd. para Lojista</label>
            <input
              name="estoqueLojista"
              type="number"
              required
              disabled={isPending}
              defaultValue={editingProduto?.estoqueLojista ?? ""}
              className="w-full rounded-lg border-zinc-800 shadow-sm focus:ring-2 focus:ring-gold focus:border-gold p-2.5 border transition-all text-sm bg-neutral-900 text-white"
              placeholder="0"
            />
          </div>

          {/* COMPRA EM DÓLAR */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Compra em Dólar (US$)</label>
            <input
              name="custoDolar"
              type="number"
              step="0.01"
              disabled={isPending}
              defaultValue={editingProduto?.custoDolar || ""}
              className="w-full rounded-lg border-zinc-800 shadow-sm focus:ring-2 focus:ring-gold focus:border-gold p-2.5 border transition-all text-sm bg-neutral-900 text-white"
              placeholder="0.00"
            />
          </div>

          {/* COTAÇÃO DÓLAR */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Cotação Dólar (R$)</label>
            <input
              name="cotacaoDolar"
              type="number"
              step="0.01"
              disabled={isPending}
              defaultValue={editingProduto?.cotacaoDolar || ""}
              className="w-full rounded-lg border-zinc-800 shadow-sm focus:ring-2 focus:ring-gold focus:border-gold p-2.5 border transition-all text-sm bg-neutral-900 text-white"
              placeholder="Ex: 5.25"
            />
          </div>
        </div>

        {/* VITRINE E PROMOÇÃO */}
        <div className="rounded-xl border border-amber-500/20 bg-amber-950/15 p-4 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-amber-500">Vitrine e Promoção</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Produto cadastrado fica desativado no site. Ative na lista quando quiser publicar.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <label className="flex items-center gap-3 rounded-lg bg-neutral-900 border border-zinc-800 px-4 py-3 text-sm font-semibold text-zinc-300">
              <input
                name="vitrine"
                type="checkbox"
                disabled={isPending}
                defaultChecked={editingProduto ? Boolean(editingProduto.vitrine) : true}
                className="h-4 w-4 accent-gold"
              />
              Destacar na vitrine
            </label>

            <label className="flex items-center gap-3 rounded-lg bg-neutral-900 border border-zinc-800 px-4 py-3 text-sm font-semibold text-zinc-300">
              <input
                name="promocaoAtiva"
                type="checkbox"
                disabled={isPending}
                defaultChecked={Boolean(editingProduto?.promocaoAtiva)}
                className="h-4 w-4 accent-gold"
              />
              Ativar promoção
            </label>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Desconto (%)</label>
              <input
                name="descontoPercentual"
                type="number"
                min="0"
                max="90"
                step="0.01"
                disabled={isPending}
                defaultValue={editingProduto?.descontoPercentual || ""}
                className="w-full rounded-lg border-zinc-800 shadow-sm focus:ring-2 focus:ring-gold focus:border-gold p-2.5 border transition-all text-sm bg-neutral-900 text-white"
                placeholder="Ex: 10"
              />
            </div>
          </div>
        </div>

        {/* IMAGEM FILE */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Imagem do Produto</label>
          <input
            name="imagemFile"
            type="file"
            accept="image/*"
            disabled={isPending}
            onChange={handleImageChange}
            className="w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700 cursor-pointer"
          />
          {fileError && <p className="text-xs font-medium text-red-500">{fileError}</p>}
          {editingProduto?.imagem && !fileError && (
            <p className="text-xs text-zinc-500">Se nao escolher outra imagem, a imagem atual sera mantida.</p>
          )}
        </div>

        {/* DESCRIÇÃO COMPLETA */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Descrição Detalhada / Comercial</label>
          <textarea
            name="descricao"
            rows={3}
            disabled={isPending}
            defaultValue={editingProduto?.descricao || ""}
            className="w-full rounded-lg border-zinc-800 shadow-sm focus:ring-2 focus:ring-gold focus:border-gold p-2.5 border transition-all resize-none text-sm bg-neutral-900 text-white"
            placeholder="Descreva os benefícios e características para o catálogo..."
          />
        </div>

        {/* BOTÕES DE AÇÃO */}
        <div className="flex gap-3 pt-2">
          {editingProduto && (
            <button
              type="button"
              onClick={onCancelEdit}
              disabled={isPending}
              className="flex-1 py-3 px-4 border border-zinc-800 rounded-lg shadow-sm text-sm font-bold text-zinc-300 bg-neutral-900 hover:bg-zinc-800 transition-all active:scale-[0.98] cursor-pointer"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={isPending}
            className={`flex-1 flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-black transition-all cursor-pointer uppercase tracking-widest ${
              isPending 
                ? "bg-zinc-700 text-zinc-500 cursor-not-allowed" 
                : editingProduto 
                  ? "bg-amber-500 hover:bg-amber-600 active:scale-[0.98]" 
                  : "bg-gold hover:bg-white active:scale-[0.98]"
            }`}
          >
            {isPending 
              ? editingProduto ? "Salvando..." : "Cadastrando..." 
              : editingProduto ? "Salvar Alterações" : "Confirmar Cadastro"
            }
          </button>
        </div>
      </form>
    </div>
  );
}
