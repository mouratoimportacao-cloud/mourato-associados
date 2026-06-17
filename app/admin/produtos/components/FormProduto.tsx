"use client";

import { createProduto, updateProduto } from "../actions";
import { ChangeEvent, useEffect, useRef, useState, useTransition } from "react";

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

interface FormProdutoProps {
  editingProduto: Produto | null;
  onCancelEdit: () => void;
}

export default function FormProduto({ editingProduto, onCancelEdit }: FormProdutoProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [fileError, setFileError] = useState("");
  const [isPending, startTransition] = useTransition();
  const maxImageSize = 8 * 1024 * 1024;



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
          const newFile = new File([compressedBlob], "image.webp", { type: "image/webp" });
          formData.set("imagemFile", newFile);
        } catch (err) {
          console.error("Erro ao comprimir imagem, usando original:", err);
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
        onSubmit={(event) => {
          const message = editingProduto
            ? "Deseja salvar as alterações deste produto?"
            : "Deseja cadastrar este produto no catálogo e no estoque?";
          if (!window.confirm(message)) {
            event.preventDefault();
          }
        }}
        key={editingProduto ? editingProduto.id : 'new'}
        className="space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Categoria</label>
            <select
              name="categoria"
              required
              disabled={isPending}
              defaultValue={editingProduto?.categoria || "Perfume"}
              className="w-full rounded-lg border-zinc-800 shadow-sm focus:ring-2 focus:ring-gold focus:border-gold p-2.5 border bg-neutral-900 transition-all text-sm text-white"
            >
              <option value="Perfume">Perfume</option>
              <option value="Perfume Feminino">Perfume Feminino</option>
              <option value="Perfume Masculino">Perfume Masculino</option>
              <option value="Perfume Árabe">Perfume Árabe</option>
              <option value="Oud">Oud</option>
              <option value="Cosmético">Cosmético</option>
              <option value="Skincare">Skincare</option>
              <option value="Outros">Outros</option>
            </select>
          </div>
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
          <div className="space-y-1">
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
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Preço Fixo do Lojista / Atacado (R$)</label>
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

        <div className="rounded-xl border border-amber-500/20 bg-amber-950/15 p-4 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-amber-500">Vitrine e Promoção</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Produto cadastrado aparece no catálogo e para lojistas. Use vitrine e promoção apenas para destacar a venda.
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

        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Descrição Detalhada</label>
          <textarea
            name="descricao"
            rows={3}
            disabled={isPending}
            defaultValue={editingProduto?.descricao || ""}
            className="w-full rounded-lg border-zinc-800 shadow-sm focus:ring-2 focus:ring-gold focus:border-gold p-2.5 border transition-all resize-none text-sm bg-neutral-900 text-white"
            placeholder="Descreva as notas, benefícios e características..."
          />
        </div>

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
