import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageHero } from "@/components/sections/PageHero";
import { Reveal } from "@/components/motion/Reveal";
import { cn } from "@/lib/utils";
import { waLink } from "@/lib/whatsapp";
import {
  SERVICOS_SLUGS,
  getServicoContent,
  isServicoSlug,
  type ServicoSlug,
  type ServiceContent,
} from "@/lib/servicos-content";
import { getServicosBySlug, getServicosExtras } from "@/lib/mongodb/servicos";
import { formatPreco, servicoTitulo, servicoDescricao, type PriceLabels, type Locale as ServicoLocale, type Servico } from "@/types/servico";
import { interpolaPrecoTokens } from "@/lib/preco-tokens";
import { getTranslations } from "next-intl/server";
import {
  serviceLd,
  faqPageLd,
  jsonLdScript,
} from "@/lib/structured-data";
import { buildMetadata } from "@/lib/seo";
import type { Crumb } from "@/components/sections/Breadcrumb";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return SERVICOS_SLUGS.map((slug) => ({ slug }));
}

// Slugs são um conjunto fixo: qualquer outro valor deve dar 404 real ao nível
// do router. Sem isto, o streaming (loading.tsx) envia o status 200 antes do
// notFound() correr → soft-404 no Google.
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!isServicoSlug(slug)) return {};

  const locale = await getLocale();
  const content = await getServicoContent(locale, slug);

  // Meta separada do copy do hero: keyword de serviço + localização.
  return buildMetadata({
    title: content.seo.metaTitle,
    description: content.seo.metaDescription,
    path: `/servicos/${slug}`,
    locale,
  });
}

// Tiny HTML interpreter for the limited set of tags we use in content JSON:
// <em>, <b>. Anything else is rendered as text.
function renderRich(html: string): React.ReactNode {
  const regex = /<(\/?)(em|b)>/g;
  const segments: Array<{ tag?: "em" | "b"; text: string }> = [];
  let cursor = 0;
  let currentTag: "em" | "b" | undefined = undefined;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) {
    const isClose = match[1] === "/";
    const tag = match[2] as "em" | "b";
    const before = html.slice(cursor, match.index);
    if (before) {
      segments.push({ tag: currentTag, text: before });
    }
    if (!isClose) {
      currentTag = tag;
    } else if (currentTag === tag) {
      currentTag = undefined;
    }
    cursor = regex.lastIndex;
  }
  const tail = html.slice(cursor);
  if (tail) segments.push({ tag: currentTag, text: tail });

  return segments.map((seg, i) => {
    if (seg.tag === "em") return <em key={i}>{seg.text}</em>;
    if (seg.tag === "b") return <b key={i}>{seg.text}</b>;
    return <span key={i}>{seg.text}</span>;
  });
}

// Visuals (radial blob) for each item card — port of the .svc .visual SVGs.
function ItemVisual({ index }: { index: number }) {
  const gradId = `svc-item-grad-${index}`;
  return (
    <svg
      viewBox="0 0 300 225"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
    >
      <defs>
        <radialGradient id={gradId}>
          <stop offset="0" stopColor="#ff8a5c" />
          <stop offset="1" stopColor="#5a0e0e" />
        </radialGradient>
      </defs>
      <circle
        className="icon-blob"
        cx={80 + ((index * 50) % 250)}
        cy={100 + ((index % 2) * 30)}
        r={50 + (index % 4) * 5}
        fill={`url(#${gradId})`}
        opacity="0.8"
      />
    </svg>
  );
}

function WhatsappLink({
  message,
  children,
  className,
}: {
  message: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a
      href={waLink(message)}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {children}
    </a>
  );
}

function ServicoCTA({ content }: { content: ServiceContent }) {
  return (
    <section
      id="contacto"
      className="px-8 my-20 mb-[60px] mx-auto w-full max-w-content"
    >
      <Reveal>
        <div
          className={cn(
            "relative overflow-hidden rounded-[40px]",
            "px-[60px] py-[100px]",
            "text-center text-cream",
          )}
          style={{
            background:
              "linear-gradient(160deg, #d6422a 0%, #a8201a 50%, #5a0e0e 100%)",
          }}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-[200px] left-1/2 -translate-x-1/2 h-[800px] w-[800px] rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(255,107,63,0.5), transparent 60%)",
              animation: "ctapulse 4s ease-in-out infinite",
            }}
          />
          <svg
            aria-hidden="true"
            viewBox="0 0 1920 200"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-x-0 bottom-0 z-0 w-full opacity-35"
          >
            <path
              d="M 0 100 C 320 60, 640 140, 960 100 C 1280 60, 1600 140, 1920 100 L 1920 200 L 0 200 Z"
              fill="#fff7e8"
            />
          </svg>
          <div className="relative z-[1] mx-auto max-w-[900px]">
            <h2
              className={cn(
                "font-display font-bold mb-7",
                "text-[clamp(40px,6vw,96px)] leading-[0.98] tracking-[-0.035em]",
                "[&_em]:font-serif [&_em]:italic [&_em]:font-medium [&_em]:text-apricot",
              )}
            >
              {renderRich(content.cta.title)}
            </h2>
            <p
              className={cn(
                "mx-auto max-w-[600px] mb-10",
                "text-[17px] md:text-[19px] leading-[1.55] text-cream-deep",
              )}
            >
              {content.cta.lead}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-[14px]">
              <WhatsappLink
                message={content.cta.primaryMessage}
                className={cn(
                  "group inline-flex items-center gap-3",
                  "rounded-btn bg-cream px-8 py-5",
                  "text-[15px] font-semibold text-ink",
                  "transition-all duration-300",
                  "hover:bg-apricot hover:scale-[1.04]",
                )}
              >
                {content.cta.primary}
                <span
                  aria-hidden
                  className="inline-block transition-transform duration-300 group-hover:rotate-[-45deg]"
                >
                  <ArrowRight className="size-[18px]" strokeWidth={2.25} />
                </span>
              </WhatsappLink>
              <Link
                href="/servicos"
                className={cn(
                  "inline-flex items-center",
                  "rounded-btn border border-cream/40 bg-transparent",
                  "px-[30px] py-5",
                  "text-[15px] font-medium text-cream",
                  "transition-all duration-300",
                  "hover:bg-cream/10 hover:border-cream",
                )}
              >
                {content.cta.secondary}
              </Link>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function ServicoStatsRow({ stats }: { stats: ServiceContent["stats"] }) {
  if (stats.length === 0) return null;

  return (
    <section className="relative mx-auto w-full max-w-content px-8 py-[80px]">
      <Reveal>
        <div
          className={cn(
            "relative grid gap-8 overflow-hidden",
            "grid-cols-2",
            // 4 colunas só a partir de lg: a md (768px) cada célula fica com
            // ~130px e o valor não cabe.
            stats.length === 3 ? "md:grid-cols-3" : "lg:grid-cols-4",
            "rounded-card bg-ink text-cream",
            "px-10 py-[60px]",
          )}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -right-36 z-0 h-[500px] w-[500px] rounded-full opacity-40"
            style={{
              background:
                "radial-gradient(circle, var(--ember), transparent 60%)",
              animation: "glow 5s ease-in-out infinite",
            }}
          />
          {stats.map((stat) => (
            <div key={stat.label} className="relative z-[1] min-w-0">
              {/* Valor + unidade: a unidade vive num span irmão (não filho) —
                  o gradiente usa WebkitTextFillColor:transparent, que os filhos
                  herdariam e tornaria a unidade invisível. */}
              <div className="flex flex-wrap items-baseline gap-x-[2px]">
                <span
                  className={cn(
                    "font-display font-bold tracking-[-0.03em]",
                    "text-[clamp(40px,5vw,68px)] leading-[0.95]",
                    "bg-clip-text text-transparent",
                  )}
                  style={{
                    backgroundImage:
                      "linear-gradient(135deg, var(--cream) 0%, var(--apricot) 70%, var(--ember) 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {stat.value}
                </span>
                {stat.valueSuffix && (
                  <span
                    className={cn(
                      "font-display font-bold tracking-[-0.02em] text-apricot",
                      "text-[clamp(20px,2.6vw,36px)] leading-[0.95]",
                    )}
                  >
                    {stat.valueSuffix}
                  </span>
                )}
              </div>
              <div className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-apricot">
                {stat.label}
              </div>
              {stat.sub && (
                <div className="mt-2 text-sm font-medium text-cream-deep">
                  {stat.sub}
                </div>
              )}
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

export default async function ServicoSlugPage({ params }: PageProps) {
  const { slug } = await params;
  if (!isServicoSlug(slug)) {
    notFound();
  }
  const typedSlug: ServicoSlug = slug;

  const locale = await getLocale();
  const content = await getServicoContent(locale, typedSlug);

  // Preço mínimo real (admin-edited) para o Offer do JSON-LD.
  let priceFrom: number | undefined;

  // Fontes dos tokens {{preco:...}}, por ordem de prioridade:
  //   1. Todas as linhas do slug, incl. inactivas — só as activas entram na
  //      tabela, mas TODAS alimentam o texto corrido.
  //   2. O grupo "Extras" (slug "extras"): taxas gerais — urgência, deslocação —
  //      partilhadas por todas as categorias e sem tabela pública nenhuma.
  // A ordem importa: uma linha da própria categoria ganha sempre a um extra com
  // o mesmo nome, para uma categoria poder ter a sua taxa própria.
  let fontesToken: Servico[] = [];

  // Override items.list with DB-backed serviços (admin-edited prices).
  try {
    const [servicosDoSlug, extras] = await Promise.all([
      getServicosBySlug(typedSlug, false),
      getServicosExtras(),
    ]);
    fontesToken = [...servicosDoSlug, ...extras];
    const dbServicos = servicosDoSlug.filter((s) => s.ativo);
    const precos = dbServicos.flatMap((s) => [
      ...(typeof s.precoBase === "number" ? [s.precoBase] : []),
      ...(s.variantes ?? [])
        .map((v) => v.preco)
        .filter((p): p is number => typeof p === "number"),
    ]);
    if (precos.length > 0) priceFrom = Math.min(...precos);
    if (dbServicos.length > 0) {
      const tPrice = await getTranslations("ServicosPage.price");
      const priceLabels: PriceLabels = {
        from: tPrice("from"),
        to: tPrice("to"),
        onRequest: tPrice("onRequest"),
      };
      const loc: ServicoLocale = locale === "en" ? "en" : "pt";
      content.items.list = dbServicos.map((s) => ({
        title: servicoTitulo(s, loc),
        description: servicoDescricao(s, loc),
        price: formatPreco(s, priceLabels, loc),
        imageUrl: s.imageUrl ?? null,
      }));

      // Stats com € derivam da DB: liga o label da stat ("Landing", "Diagnóstico",
      // "Formatação"…) ao serviço cujo título o contenha e usa o mínimo real.
      // Sem isto, mudar um preço no painel actualizava a tabela mas deixava o
      // número grande da stat com o valor antigo NA MESMA página. Sufixos com
      // "/" ("€/km") não são preços de tabela; sem correspondência fica o valor
      // do ficheiro.
      const normStat = (s: string) =>
        s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
      const fmtStat = (n: number) =>
        n >= 1000 ? `${(n / 1000).toString().replace(".", ",")}k` : String(n);
      content.stats = content.stats.map((stat) => {
        if (!stat.valueSuffix?.includes("€") || stat.valueSuffix.includes("/")) return stat;
        const alvo = normStat(stat.label);
        const match = dbServicos.find((s) => normStat(servicoTitulo(s, loc)).includes(alvo));
        if (!match) return stat;
        const minimos = [
          ...(typeof match.precoBase === "number" ? [match.precoBase] : []),
          ...(match.variantes ?? [])
            .map((v) => v.preco)
            .filter((p): p is number => typeof p === "number"),
        ];
        if (minimos.length === 0) return stat;
        return { ...stat, value: fmtStat(Math.min(...minimos)) };
      });
    }
  } catch (e) {
    console.error("DB servicos fetch falhou, fallback ao JSON:", e);
  }

  // Tokens {{preco:label|fallback}} de note/FAQs/stats.sub resolvem contra a
  // DB — mudar o preço no painel muda também o texto corrido e o FAQPage
  // JSON-LD (construído a seguir, já sobre o texto interpolado). Com a DB em
  // baixo, fontesToken=[] e todos os tokens caem no fallback do ficheiro.
  const locTokens: ServicoLocale = locale === "en" ? "en" : "pt";
  const interp = (t: string) => interpolaPrecoTokens(t, fontesToken, locTokens);
  content.items.note = interp(content.items.note);
  content.stats = content.stats.map((s) => (s.sub ? { ...s, sub: interp(s.sub) } : s));
  content.faqs.list = content.faqs.list.map(({ q, a }) => ({ q: interp(q), a: interp(a) }));

  const serviceSchema = serviceLd({
    slug: typedSlug,
    // Nome limpo do serviço (sem headline de marketing) — ver content.seo.
    name: content.seo.serviceName,
    description: content.lead,
    priceFrom,
  });

  const faqSchema =
    content.faqs.list.length > 0
      ? faqPageLd(
          content.faqs.list.map(({ q, a }) => ({ question: q, answer: a })),
        )
      : null;

  const tServ = await getTranslations("ServicosPage");
  const tBc = await getTranslations("Breadcrumb");
  const tNav = await getTranslations("Navigation");
  const outrosSlugs = SERVICOS_SLUGS.filter((s) => s !== typedSlug);
  const crumbs: Crumb[] = [
    { label: tBc("home"), href: "/" },
    { label: tNav("services"), href: "/servicos" },
    // Visível: label curto (cabe na pill em mobile). JSON-LD: nome completo (SEO).
    // href na página actual serve o JSON-LD (posição canónica); o visual não faz
    // link no último item.
    {
      label: tServ(`slugLabel.${typedSlug}`),
      ldName: content.seo.serviceName,
      href: `/servicos/${typedSlug}`,
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(serviceSchema) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(faqSchema) }}
        />
      )}
      <main id="main" className="flex-grow">
        <PageHero
          breadcrumb={crumbs}
          title={renderRich(content.title)}
          description={content.lead}
        />

        {/* Overview block */}
        <section className="relative mx-auto w-full max-w-content px-8 pt-16 md:pt-20 pb-8">
          <Reveal>
            <span
              className={cn(
                "inline-flex items-center gap-[10px]",
                "rounded-btn border border-ember/20 bg-ember/[0.08]",
                "px-[14px] py-[6px] mb-7",
                "font-mono text-[11px] uppercase tracking-[0.2em] text-ember",
              )}
            >
              <span aria-hidden="true" className="block h-1.5 w-1.5 rounded-sm bg-ember" />
              {content.overview.eyebrow}
            </span>
          </Reveal>
          <Reveal>
            <h2
              className={cn(
                "font-display font-bold text-ink max-w-[1000px] mb-6",
                "text-[clamp(32px,4.8vw,68px)] leading-[1.05] tracking-[-0.03em]",
                "[&_em]:font-serif [&_em]:italic [&_em]:font-medium [&_em]:text-ember",
              )}
            >
              {renderRich(content.overview.title)}
            </h2>
          </Reveal>
          <Reveal>
            <p className="max-w-[760px] text-[17px] md:text-[19px] leading-[1.6] text-ink-soft">
              {content.overview.lead}
            </p>
          </Reveal>
        </section>

        {/* Items block */}
        <section className="relative mx-auto w-full max-w-content px-8 py-16">
          <Reveal>
            <span
              className={cn(
                "inline-flex items-center gap-[10px]",
                "rounded-btn border border-ember/20 bg-ember/[0.08]",
                "px-[14px] py-[6px] mb-7",
                "font-mono text-[11px] uppercase tracking-[0.2em] text-ember",
              )}
            >
              <span aria-hidden="true" className="block h-1.5 w-1.5 rounded-sm bg-ember" />
              {content.items.eyebrow}
            </span>
          </Reveal>
          <Reveal>
            <h2
              className={cn(
                "font-display font-bold text-ink max-w-[1000px] mb-6",
                "text-[clamp(32px,4.8vw,68px)] leading-[1.05] tracking-[-0.03em]",
                "[&_em]:font-serif [&_em]:italic [&_em]:font-medium [&_em]:text-ember",
              )}
            >
              {renderRich(content.items.title)}
            </h2>
          </Reveal>
          <Reveal>
            <p className="max-w-[760px] mb-[50px] text-[17px] leading-[1.55] text-ink-soft">
              {content.items.lead}
            </p>
          </Reveal>

          <div className="grid gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {content.items.list.map((item, index) => (
              <Reveal key={item.title}>
                <article
                  className={cn(
                    "flex h-full min-h-[420px] flex-col overflow-hidden",
                    "rounded-card bg-sand-warm",
                    "px-8 pt-9 pb-8",
                    "shadow-warm",
                  )}
                >
                  <div
                    className={cn(
                      "relative mb-6 overflow-hidden rounded-[20px] aspect-[4/3]",
                    )}
                    style={{
                      background:
                        "linear-gradient(135deg, var(--cream-deep), var(--peach))",
                    }}
                  >
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    ) : (
                      <ItemVisual index={index} />
                    )}
                  </div>

                  <h3
                    className={cn(
                      "font-display font-bold text-[22px] leading-[1.1] tracking-[-0.02em] mb-3",
                      "text-ink",
                    )}
                  >
                    {item.title}
                  </h3>
                  <p className="flex-1 text-[14px] leading-[1.55] text-ink-soft">
                    {item.description}
                  </p>

                  <div className="mt-5 pt-5 border-t border-dashed border-dune-deep/15">
                    <span
                      className={cn(
                        "block font-mono text-[12px] leading-[1.8] uppercase tracking-[0.12em] text-ink-soft",
                        // <b> = o número. Ver contrato em types/servico.ts.
                        // nowrap: um intervalo nunca parte a meio ("200€ a" / "300€").
                        "[&_b]:font-display [&_b]:font-bold [&_b]:not-italic [&_b]:text-ember [&_b]:text-[15px]",
                        "[&_b]:whitespace-nowrap",
                      )}
                    >
                      {renderRich(item.price)}
                    </span>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>

          {/* Note row */}
          <Reveal>
            <div
              className={cn(
                "mt-10 grid items-center gap-6",
                "grid-cols-1 md:grid-cols-[1fr_auto]",
                "rounded-card bg-ink text-cream",
                "px-8 py-7",
              )}
            >
              <div>
                <p
                  className={cn(
                    "text-[15px] md:text-[16px] leading-[1.6]",
                    "[&_em]:font-serif [&_em]:italic [&_em]:font-medium [&_em]:text-apricot",
                    "[&_b]:text-apricot [&_b]:font-semibold",
                  )}
                >
                  {renderRich(content.items.note)}
                </p>
                {/* Nota IVA — informação discreta dentro do card */}
                <p className="mt-3 font-mono text-[11px] tracking-[0.08em] text-cream-deep">
                  {tServ("price.vatNote")}
                </p>
              </div>
              <WhatsappLink
                message={content.items.noteCtaMessage}
                className={cn(
                  "inline-flex items-center justify-center whitespace-nowrap gap-2",
                  "rounded-btn bg-cream text-ink",
                  "px-[22px] py-[14px] text-[14px] font-semibold",
                  "transition-colors duration-300 hover:bg-apricot",
                )}
              >
                {content.items.noteCta}
                <ArrowRight
                  className="size-[15px] shrink-0"
                  strokeWidth={2.25}
                  aria-hidden
                />
              </WhatsappLink>
            </div>
          </Reveal>
        </section>

        {/* Stats row */}
        <ServicoStatsRow stats={content.stats} />

        {/* FAQ block */}
        <section className="relative mx-auto w-full max-w-content px-8 py-16">
          <Reveal>
            <span
              className={cn(
                "inline-flex items-center gap-[10px]",
                "rounded-btn border border-ember/20 bg-ember/[0.08]",
                "px-[14px] py-[6px] mb-7",
                "font-mono text-[11px] uppercase tracking-[0.2em] text-ember",
              )}
            >
              <span aria-hidden="true" className="block h-1.5 w-1.5 rounded-sm bg-ember" />
              {content.faqs.eyebrow}
            </span>
          </Reveal>
          <Reveal>
            <h2
              className={cn(
                "font-display font-bold text-ink max-w-[1000px] mb-12",
                "text-[clamp(32px,4.8vw,68px)] leading-[1.05] tracking-[-0.03em]",
                "[&_em]:font-serif [&_em]:italic [&_em]:font-medium [&_em]:text-ember",
              )}
            >
              {renderRich(content.faqs.title)}
            </h2>
          </Reveal>

          <div className="max-w-[900px] mx-auto flex flex-col gap-4">
            {content.faqs.list.map((faq) => (
              <Reveal key={faq.q}>
                <details
                  className={cn(
                    "group rounded-[18px] border border-dune-deep/10",
                    "bg-sand-warm/60 backdrop-blur",
                    "px-7 py-6 transition-colors",
                    "open:bg-ink open:text-cream open:border-ink",
                  )}
                >
                  <summary
                    className={cn(
                      "flex cursor-pointer items-center justify-between gap-4",
                      "list-none font-display text-[18px] md:text-[19px] font-semibold",
                      "[&::-webkit-details-marker]:hidden",
                    )}
                  >
                    {faq.q}
                    <span
                      aria-hidden="true"
                      className={cn(
                        "text-[28px] leading-none text-ember",
                        "transition-transform duration-300",
                        "group-open:rotate-45 group-open:text-apricot",
                      )}
                    >
                      +
                    </span>
                  </summary>
                  <p
                    className={cn(
                      "mt-4 text-[15px] leading-[1.65]",
                      "text-ink-soft group-open:text-cream-deep",
                    )}
                  >
                    {faq.a}
                  </p>
                </details>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Cross-links: serviços irmãos + portfólio da categoria (antes eram
            becos de linking — nenhuma página de serviço linkava as outras) */}
        <section className="relative mx-auto w-full max-w-content px-8 pb-20">
          <Reveal>
            <h2
              className={cn(
                "font-display font-bold text-ink mb-8",
                "text-[clamp(26px,3.5vw,44px)] tracking-[-0.02em]",
              )}
            >
              {tServ("related.title")}
            </h2>
          </Reveal>
          <div className="grid gap-5 grid-cols-1 md:grid-cols-3">
            {outrosSlugs.map((s) => (
              <Reveal key={s}>
                <Link
                  href={`/servicos/${s}`}
                  className={cn(
                    "group flex h-full flex-col rounded-card bg-sand-warm",
                    "px-7 py-7 no-underline text-ink shadow-warm",
                    "transition-all duration-500 ease-oasis",
                    "hover:-translate-y-1 hover:shadow-warm-lg",
                  )}
                >
                  <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ember mb-3">
                    {tServ(`slugLabel.${s}`)}
                  </span>
                  <p className="flex-1 text-[14px] leading-[1.55] text-ink-soft">
                    {tServ(`hub.cards.${s}.description`)}
                  </p>
                  <ArrowRight
                    className="mt-4 size-[16px] text-ember transition-transform duration-300 group-hover:translate-x-1"
                    strokeWidth={2.25}
                    aria-hidden
                  />
                </Link>
              </Reveal>
            ))}
            <Reveal>
              <Link
                href={`/portfolio?categoria=${typedSlug}`}
                className={cn(
                  "group flex h-full flex-col justify-between rounded-card bg-ink text-cream",
                  "px-7 py-7 no-underline shadow-warm",
                  "transition-all duration-500 ease-oasis",
                  "hover:-translate-y-1 hover:shadow-warm-lg",
                )}
              >
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-apricot mb-3">
                  {tServ("related.portfolioEyebrow")}
                </span>
                <p className="flex-1 text-[14px] leading-[1.55] text-cream-deep">
                  {tServ("related.portfolioCta")}
                </p>
                <ArrowRight
                  className="mt-4 size-[16px] text-apricot transition-transform duration-300 group-hover:translate-x-1"
                  strokeWidth={2.25}
                  aria-hidden
                />
              </Link>
            </Reveal>
          </div>
        </section>

        <ServicoCTA content={content} />
      </main>
      <Footer />
    </div>
  );
}
