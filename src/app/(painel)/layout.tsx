import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { Poppins, Inter } from "next/font/google";
import { auth } from "@/lib/auth";
import { totalACobrar } from "@/lib/iva";
import { PainelShell } from "@/components/painel/PainelShell";
import { Toaster } from "@/components/ui/toaster";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { RdLoaderFirstPaint } from "@/components/ui/rd-loader-first-paint";
import { ensureIndexes } from "@/lib/mongodb/init-indexes";
import { getProjetosResumo } from "@/lib/mongodb/projetos";
import { getAllLembretes } from "@/lib/mongodb/lembretes";
import { getAllPagamentos } from "@/lib/mongodb/pagamentos";
import { isProjetoAtivo, LEMBRETES_VISIVEIS_STATUSES } from "@/types/projeto";
import "./painel.css";

// Painel usa Poppins (display) + Inter (body) — igual ao mockup Oasis v5.
// Override scoped: o site público mantém Bricolage + DM Sans.
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata = {
  title: "Painel — Reddune Solutions",
  robots: { index: false, follow: false },
};

// Contagens p/ badges da sidebar. Cache curto (20s) — antes corria 3 scans de
// colecção INTEIRA (projetos+lembretes+pagamentos) em CADA navegação no painel.
// Badges podem ficar até 20s desatualizados, aceitável para contadores.
// Apenas LÊ dados (read-only) — não altera nada.
const getSidebarCounts = unstable_cache(
  async (): Promise<Record<string, number>> => {
    const [projetos, lembretes, pagamentos] = await Promise.all([
      getProjetosResumo(),
      getAllLembretes(),
      getAllPagamentos(),
    ]);
    const pagoPorProjeto = new Map<string, number>();
    for (const p of pagamentos) {
      pagoPorProjeto.set(p.projetoId, (pagoPorProjeto.get(p.projetoId) ?? 0) + p.valor);
    }
    // Contra o total a cobrar (já com IVA quando o projecto o leva) — os
    // pagamentos são brutos, tem de se comparar bruto com bruto.
    const dividasCount = projetos.filter((p) => {
      const total = totalACobrar(p);
      return p.status === "terminado" && total != null && (pagoPorProjeto.get(p.id) ?? 0) < total;
    }).length;

    // Lembretes pendentes dos projetos VISÍVEIS em /painel/lembretes — mesmo conjunto
    // que a página lista, para o badge bater certo com o título "N abertas".
    const projetoStatus = new Map(projetos.map((p) => [p.id, p.status]));
    const visiveis = new Set<string>(LEMBRETES_VISIVEIS_STATUSES);
    const lembretesPendentes = lembretes.filter(
      (t) => !t.feita && visiveis.has(projetoStatus.get(t.projetoId) ?? "")
    ).length;
    // "Activo" = fonte única isProjetoAtivo (igual ao título de /painel/projetos).
    const projetosActivos = projetos.filter((p) => isProjetoAtivo(p.status)).length;

    return {
      "/painel/lembretes": lembretesPendentes,
      "/painel/projetos": projetosActivos,
      "/painel/dividas": dividasCount,
    };
  },
  ["painel-sidebar-counts"],
  { revalidate: 20, tags: ["painel-counts"] }
);

export default async function PainelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/entrar?from=/painel");
  }

  // Idempotente — cria indexes na primeira request, no-op nas seguintes.
  await ensureIndexes();

  // Contagens p/ badges da sidebar (cacheadas 20s — ver getSidebarCounts).
  const counts = await getSidebarCounts();

  // Estrutura do protótipo: .pnl > .app > .side + .content > .main.
  // O scroll acontece no .content (painel.css) — o body não faz double-scroll
  // porque o .app nunca cresce além de 100vh (conteúdo scrolla internamente).
  return (
    <div
      className={`pnl painel-shell ${poppins.variable} ${inter.variable}`}
      style={{
        ["--font-display" as string]: "var(--font-poppins)",
        ["--font-body" as string]: "var(--font-inter)",
      }}
    >
      <RdLoaderFirstPaint />
      <ConfirmProvider>
        <PainelShell
          user={{ name: session.user.name, email: session.user.email }}
          counts={counts}
        >
          {children}
        </PainelShell>
      </ConfirmProvider>
      <Toaster />
    </div>
  );
}
