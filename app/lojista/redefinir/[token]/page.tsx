import bcrypt from "bcryptjs";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "../../../../lib/prisma";

export const metadata = {
  title: "Redefinir senha | Mourato & Associados",
};

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function RedefinirSenhaLojistaPage({ params }: PageProps) {
  const { token } = await params;

  const lojista = await prisma.usuario.findFirst({
    where: { resetToken: token },
  });

  const tokenValido =
    lojista?.tipo === "lojista" &&
    lojista.resetExpiresAt &&
    new Date(String(lojista.resetExpiresAt)).getTime() > Date.now();

  async function redefinirSenha(formData: FormData) {
    "use server";

    const senha = String(formData.get("senha") || "");
    const confirmarSenha = String(formData.get("confirmarSenha") || "");

    if (!tokenValido || !lojista) {
      redirect("/lojista?erro=link-expirado");
    }

    if (senha.length < 6 || senha !== confirmarSenha) {
      redirect(`/lojista/redefinir/${token}?erro=senha`);
    }

    const hashedPassword = await bcrypt.hash(senha, 10);

    await prisma.usuario.update({
      where: { id: lojista.id },
      data: {
        senha: hashedPassword,
        status: "aguardando aprovação",
        resetToken: null,
        resetExpiresAt: null,
        resetRequestedAt: null,
      },
    });

    redirect("/lojista?senha=alterada");
  }

  if (!tokenValido) {
    return (
      <main className="min-h-screen bg-luxury-black px-4 py-16 text-white flex items-center justify-center">
        <section className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#222222] p-8 text-center space-y-5">
          <h1 className="text-3xl font-serif">Link expirado</h1>
          <p className="text-sm text-gray-400">
            Peça ao administrador para gerar um novo link de recuperação.
          </p>
          <Link href="/lojista" className="inline-flex rounded-lg bg-luxury-gold px-5 py-3 text-xs font-bold uppercase tracking-widest text-luxury-black">
            Voltar ao login
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-luxury-black px-4 py-16 text-white flex items-center justify-center">
      <section className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#222222] p-8 space-y-6">
        <div className="text-center space-y-3">
          <span className="text-luxury-gold text-xs font-bold uppercase tracking-[0.4em] block">Área Lojista</span>
          <h1 className="text-3xl font-serif">Criar nova senha</h1>
          <p className="text-sm text-gray-400">
            Após salvar, o acesso voltará para aprovação do administrador.
          </p>
        </div>

        <form action={redefinirSenha} className="space-y-4">
          <input
            name="senha"
            type="password"
            minLength={6}
            required
            className="w-full rounded-lg border border-white/10 bg-[#1A1A1A] p-3 text-sm text-white focus:border-luxury-gold focus:outline-none"
            placeholder="Nova senha"
          />
          <input
            name="confirmarSenha"
            type="password"
            minLength={6}
            required
            className="w-full rounded-lg border border-white/10 bg-[#1A1A1A] p-3 text-sm text-white focus:border-luxury-gold focus:outline-none"
            placeholder="Confirmar nova senha"
          />
          <button type="submit" className="w-full rounded-lg bg-luxury-gold py-3 text-xs font-bold uppercase tracking-widest text-luxury-black">
            Salvar nova senha
          </button>
        </form>
      </section>
    </main>
  );
}
