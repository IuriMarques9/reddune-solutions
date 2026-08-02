import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { resolvePortalToken } from "@/lib/portal-auth";
import { getClienteById } from "@/lib/mongodb/clientes";
import { getPagamentosByProjeto } from "@/lib/mongodb/pagamentos";
import { getComentariosByProjeto } from "@/lib/mongodb/portal";
import { getSandboxesByProjeto } from "@/lib/mongodb/portal-sandbox";
import { toPortalProjeto, toPortalCliente, type PortalArquivoDTO } from "@/lib/portal-dto";
import { Reveal } from "@/components/motion/Reveal";
import { PortalTabs } from "@/components/portal/PortalTabs";
import { PreviewFrame } from "@/components/portal/PreviewFrame";
import { SandboxFrame } from "@/components/portal/SandboxFrame";
import { ComentarioForm } from "@/components/portal/ComentarioForm";
import { FichaClienteForm } from "@/components/portal/FichaClienteForm";
import { UploadForm } from "@/components/portal/UploadForm";
import { ArquivoPortalDeleteButton } from "@/components/portal/ArquivoPortalDeleteButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "O seu projeto · RedDune Solutions",
  robots: { index: false, follow: false },
};

type Params = Promise<{ token: string }>;

const eur = (n: number) => `${n.toLocaleString("pt-PT")} €`;
const tamanhoPt = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const dataPt = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" })
    : null;

const cardCls = "rounded-card border border-[rgba(90,14,14,0.10)] bg-sand-warm shadow-warm";
const labelCls = "font-mono text-[11.5px] font-medium uppercase tracking-[0.18em] text-ember";

export default async function PortalPage({ params }: { params: Params }) {
  const { token } = await params;
  const projeto = await resolvePortalToken(token);
  if (!projeto) notFound();

  const [cliente, pagamentos, comentarios, sandboxes] = await Promise.all([
    projeto.clienteId ? getClienteById(projeto.clienteId) : Promise.resolve(null),
    getPagamentosByProjeto(projeto.id),
    getComentariosByProjeto(projeto.id),
    getSandboxesByProjeto(projeto.id),
  ]);
  const dto = toPortalProjeto(projeto, pagamentos);
  // Entregáveis = o que NÓS pusemos lá. O que o cliente enviou tem secção
  // própria (senão o cliente via as próprias fotos listadas como entrega nossa).
  const todosEntregaveis = dto.arquivos.filter((a) => a.origem !== "cliente");
  // Orçamentos marcados no painel saem da lista normal: cartão destacado no
  // topo da secção, com o total ao lado — feedback de cliente que não os
  // encontrava no meio dos restantes ficheiros (2026-08).
  const orcamentos = todosEntregaveis.filter((a) => a.orcamento);
  const entregaveis = todosEntregaveis.filter((a) => !a.orcamento);
  const meusFicheiros = dto.arquivos.filter((a) => a.origem === "cliente");
  const arquivoSrc = (id: string) => `/api/portal/arquivo/${id}?t=${encodeURIComponent(token)}`;
  // Sandbox: capability própria no URL (não o token). entry codificado por segmento.
  const sandboxSrc = (s: { id: string; entry: string }) =>
    `/api/portal/sandbox/${s.id}/${s.entry.split("/").map(encodeURIComponent).join("/")}`;

  return (
    <main className="flex min-h-screen flex-col px-5 pt-11">
      <div className="mx-auto flex w-full max-w-[720px] flex-1 flex-col gap-7">
        {/* Marca */}
        <header className="flex items-center justify-between gap-4">
          <Link href="/" title="Ir para o site RedDune Solutions" className="inline-flex">
            <Image
              src="/logo.png"
              alt="RedDune Solutions"
              width={160}
              height={44}
              className="h-[34px] w-auto object-contain"
            />
          </Link>
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-ink-mute">
            Portal do cliente
          </p>
        </header>

        {/* Cartão principal: Projeto / Os seus dados */}
        <Reveal as="section" className={`${cardCls} p-7`}>
          <PortalTabs
            projeto={
              <>
                <p className="mb-2.5 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-ember">
                  O seu projeto
                </p>
                <h1
                  className="font-display text-[clamp(28px,5.4vw,38px)] font-bold leading-[1.06] tracking-[-0.035em] text-ink [text-wrap:balance]"
                  style={{ fontVariationSettings: '"opsz" 88' }}
                >
                  <TituloComEnfase titulo={dto.titulo} />
                </h1>
                <div className="mt-3.5 flex flex-wrap gap-2">
                  <span className="rounded-full bg-[rgba(214,66,42,0.10)] px-3.5 py-[5px] text-[13px] font-semibold text-ember">
                    {dto.statusLabel}
                  </span>
                  {dto.tipoLabels.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-[rgba(90,14,14,0.07)] px-3.5 py-[5px] text-[13px] font-medium text-ink-soft"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                {(dto.prazo || dto.hardware?.marca) && (
                  <dl className="mt-5 grid gap-3 border-t border-dashed border-[rgba(90,14,14,0.16)] pt-4 min-[600px]:grid-cols-2">
                    {dto.prazo && <Info label="Prazo previsto" value={dataPt(dto.prazo)!} />}
                    {dto.hardware?.marca && (
                      <Info
                        label="Equipamento"
                        value={[dto.hardware.marca, dto.hardware.modelo].filter(Boolean).join(" ")}
                      />
                    )}
                  </dl>
                )}
              </>
            }
            dados={
              cliente ? (
                <>
                  <p className="mb-4 text-sm text-ink-soft">
                    Confirme ou complete os seus dados — ajudam-nos a faturar e a contactá-lo.
                  </p>
                  <FichaClienteForm token={token} cliente={toPortalCliente(cliente)} />
                </>
              ) : undefined
            }
          />
        </Reveal>

        {/* Documentos e pré-visualizações (era "Entregáveis" — jargão nosso,
            cliente comum não sabia o que era) */}
        {(orcamentos.length > 0 ||
          entregaveis.length > 0 ||
          dto.links.length > 0 ||
          sandboxes.length > 0) && (
          <section className="flex flex-col gap-4">
            <Reveal>
              <h2 className={labelCls}>Documentos e pré-visualizações</h2>
              <p className="mt-1.5 text-sm text-ink-soft">
                O que preparámos para si — pode ver tudo aqui e deixar um comentário em cada item.
              </p>
            </Reveal>
            {orcamentos.map((a, i) => (
              <div key={a.id} id={i === 0 ? "orcamento" : undefined} className="scroll-mt-7">
                <Reveal
                  as="article"
                  className="flex flex-col gap-3.5 rounded-card border-2 border-[rgba(214,66,42,0.38)] bg-sand-warm p-6 shadow-warm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-3">
                      <span className="rounded-full bg-ember px-3.5 py-[5px] font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white">
                        Orçamento
                      </span>
                      <p className="font-display text-[17px] font-semibold tracking-[-0.01em] text-ink [overflow-wrap:anywhere]">
                        {a.nome}
                      </p>
                    </div>
                    {dto.valores && (
                      <p className="shrink-0 text-right">
                        <span className="mr-2 font-mono text-[10.5px] font-medium uppercase tracking-[0.16em] text-ink-mute">
                          Total
                        </span>
                        <span className="font-display text-[19px] font-bold tracking-[-0.02em] text-ember">
                          {eur(dto.valores.orcado)}
                        </span>
                      </p>
                    )}
                  </div>
                  <ConteudoArquivo arquivo={a} src={arquivoSrc(a.id)} />
                  <ComentarioForm token={token} arquivoId={a.id} compact />
                </Reveal>
              </div>
            ))}
            {sandboxes.map((s) => (
              <Reveal as="article" key={s.id} className={`${cardCls} flex flex-col gap-3.5 p-6`}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-display text-[17px] font-semibold tracking-[-0.01em] text-ink [overflow-wrap:anywhere]">
                    {s.nome}
                  </p>
                  <p className="shrink-0 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-mute">
                    Projeto web
                  </p>
                </div>
                <SandboxFrame src={sandboxSrc(s)} title={s.nome} />
                <ComentarioForm token={token} sandboxId={s.id} compact />
              </Reveal>
            ))}
            {dto.links.map((k) => (
              <Reveal as="article" key={k.id} className={`${cardCls} flex flex-col gap-3.5 p-6`}>
                <p className="font-display text-[17px] font-semibold tracking-[-0.01em] text-ink [overflow-wrap:anywhere]">
                  {k.label}
                </p>
                <PreviewFrame src={k.url} title={k.label} />
                <ComentarioForm token={token} linkId={k.id} compact />
              </Reveal>
            ))}
            {entregaveis.map((a) => (
              <Reveal as="article" key={a.id} className={`${cardCls} flex flex-col gap-3.5 p-6`}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-display text-[17px] font-semibold tracking-[-0.01em] text-ink [overflow-wrap:anywhere]">
                    {a.nome}
                  </p>
                  <p className="shrink-0 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-mute">
                    {Math.max(1, Math.round(a.tamanho / 1024))} KB
                  </p>
                </div>
                <ConteudoArquivo arquivo={a} src={arquivoSrc(a.id)} />
                <ComentarioForm token={token} arquivoId={a.id} compact />
              </Reveal>
            ))}
          </section>
        )}

        {/* Os seus ficheiros — o que o cliente nos envia */}
        <Reveal as="section" className={`${cardCls} p-7`}>
          <h2 className={`${labelCls} mb-1.5`}>Os seus ficheiros</h2>
          <p className="mb-4 text-sm text-ink-soft">
            Envie fotos do equipamento, documentos ou material para o projeto — chega-nos de
            imediato.
          </p>
          <UploadForm token={token} />
          {meusFicheiros.length > 0 && (
            <ul className="mt-[18px] flex flex-col gap-2.5 border-t border-dashed border-[rgba(90,14,14,0.16)] pt-4 text-sm">
              {meusFicheiros.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-[rgba(90,14,14,0.10)] bg-[rgba(255,250,240,0.70)] px-3 py-2.5">
                  <a
                    href={arquivoSrc(a.id)}
                    className="font-medium text-ink transition-colors hover:text-ember hover:underline [overflow-wrap:anywhere]"
                  >
                    {a.nome}
                  </a>
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-mute">
                      {tamanhoPt(a.tamanho)}
                    </span>
                    <ArquivoPortalDeleteButton token={token} arquivo={{ id: a.id, nome: a.nome }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Reveal>

        {/* Observações gerais */}
        <Reveal as="section" className={`${cardCls} p-7`}>
          <h2 className={`${labelCls} mb-1.5`}>Observações gerais</h2>
          <p className="mb-4 text-sm text-ink-soft">
            Dúvidas ou pedidos sobre o projeto? Escreva-nos aqui — a mensagem chega-nos de imediato.
          </p>
          <ComentarioForm token={token} />
          {comentarios.length > 0 && (
            <ul className="mt-1 flex flex-col gap-3.5 border-t border-dashed border-[rgba(90,14,14,0.16)] pt-[18px] text-sm">
              {comentarios.map((c) => (
                <li key={c.id}>
                  <p className="text-ink-mute">
                    <span className="font-semibold text-ink">{c.autorNome ?? "Cliente"}</span>
                    {" · "}
                    {dataPt(c.criadoEm)}
                  </p>
                  <p className="whitespace-pre-wrap text-ink-soft">{c.texto}</p>
                </li>
              ))}
            </ul>
          )}
        </Reveal>

        {/* Valores — slab escuro no fim */}
        {dto.valores && (
          <Reveal
            as="section"
            className="rounded-card bg-ink p-7 text-cream shadow-brand"
          >
            <h2 className="font-mono text-[11.5px] font-medium uppercase tracking-[0.18em] text-apricot">
              Valores
            </h2>
            <div className="mt-[18px] grid grid-cols-3 gap-3">
              <Kpi label="Total" value={eur(dto.valores.orcado)} />
              <Kpi label="Pago" value={eur(dto.valores.pago)} />
              <Kpi label="Em falta" value={eur(dto.valores.emFalta)} accent />
            </div>
            {dto.valores.categorias.length > 0 && (
              <ul className="mt-5 flex flex-col gap-1.5 border-t border-dashed border-[rgba(247,238,219,0.20)] pt-4 text-sm">
                {dto.valores.categorias.map((c) => (
                  <li key={c.label} className="flex justify-between">
                    <span className="text-[rgba(247,238,219,0.70)]">{c.label}</span>
                    <span className="font-semibold text-cream">{eur(c.total)}</span>
                  </li>
                ))}
              </ul>
            )}
            {orcamentos.length > 0 && (
              <a
                href="#orcamento"
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-apricot transition-colors hover:text-cream hover:underline"
              >
                Ver o documento do orçamento ↑
              </a>
            )}
          </Reveal>
        )}
      </div>

      <Reveal as="footer" className="px-3 py-[26px]">
        <div className="flex items-center justify-center font-mono text-[11px] uppercase tracking-[0.15em] text-ink-mute">
          <span>© 2026 RedDune Solutions</span>
        </div>
      </Reveal>
    </main>
  );
}

/**
 * Um único <em> no h1 (Newsreader itálico + gradiente ember→apricot): a parte
 * após o último " — " do título, ou a última palavra quando não há separador.
 */
function TituloComEnfase({ titulo }: { titulo: string }) {
  const sep = titulo.lastIndexOf(" — ");
  const corte = sep > 0 ? sep + 3 : titulo.lastIndexOf(" ") + 1;
  const antes = titulo.slice(0, corte);
  const enfase = titulo.slice(corte);
  return (
    <>
      {antes}
      <em className="bg-[linear-gradient(120deg,var(--ember)_30%,var(--apricot)_80%)] bg-clip-text font-serif font-medium italic tracking-[-0.01em] text-transparent">
        {enfase}
      </em>
    </>
  );
}

/** Conteúdo de um ficheiro (preview ou download) — partilhado entre o cartão
 * destacado do orçamento e os restantes documentos. */
function ConteudoArquivo({ arquivo, src }: { arquivo: PortalArquivoDTO; src: string }) {
  if (arquivo.tipo.startsWith("image/")) {
    // <img> deliberado: origem é o proxy autenticado, next/image não optimiza
    return (
      <img
        src={src}
        alt={arquivo.nome}
        className="max-h-[70vh] w-auto rounded-[20px] border border-[rgba(90,14,14,0.12)]"
      />
    );
  }
  if (arquivo.tipo === "text/html") return <PreviewFrame src={src} title={arquivo.nome} html />;
  if (arquivo.tipo === "application/pdf") return <PreviewFrame src={src} title={arquivo.nome} />;
  return (
    <a
      href={src}
      className="text-sm font-semibold text-ember transition-colors hover:text-dune hover:underline"
    >
      Descarregar ↓
    </a>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[10.5px] font-medium uppercase tracking-[0.16em] text-ink-mute">
        {label}
      </dt>
      <dd className="mt-0.5 text-[15px] font-medium text-ink">{value}</dd>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[rgba(247,238,219,0.55)]">
        {label}
      </p>
      <p
        className={`mt-1 font-display text-[clamp(22px,4.4vw,30px)] font-bold tracking-[-0.02em] ${
          accent
            ? "bg-[linear-gradient(120deg,var(--ember)_20%,var(--flame)_85%)] bg-clip-text text-transparent"
            : "text-cream"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
