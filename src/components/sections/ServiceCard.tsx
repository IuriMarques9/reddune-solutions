import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * ServiceCard — card de serviço partilhado pela landing (Services.tsx) e pelo
 * hub /servicos (ServicesHubBody). Um só componente para as duas páginas não
 * divergirem outra vez.
 *
 * Dois destinos por card (regra do CLAUDE.md — nunca envolver o card num <a>):
 *   • o TÍTULO é stretched link (after:inset-0) para `/servicos/<slug>` — o
 *     card todo clica para o serviço;
 *   • o CTA "Ver exemplo" (`portfolioHref`) fica por cima com z-10.
 *
 * O hover de levantar (-translate-y-2 + sombra) vive em globals.css como
 * `.svc-card:hover:not(:has(.svc-cta:hover))`: com o rato no CTA o card NÃO
 * levanta nem roda a seta — o CTA é outro destino e o card em hover lia-se
 * como se o clique fosse para o serviço.
 */
type Props = {
  href: string;
  portfolioHref: string;
  imageSrc: string;
  imageAlt: string;
  title: React.ReactNode;
  description: React.ReactNode;
  exampleLabel: string;
  /** Slot esquerdo do rodapé (o "desde X€" do hub). Sem ele, CTA+seta vão à direita. */
  footerLeft?: React.ReactNode;
};

export function ServiceCard({
  href,
  portfolioHref,
  imageSrc,
  imageAlt,
  title,
  description,
  exampleLabel,
  footerLeft,
}: Props) {
  return (
    <div
      className={cn(
        "svc-card group relative flex h-full min-h-[480px] flex-col overflow-hidden",
        "rounded-card bg-sand-warm",
        "px-8 pt-9 pb-8 text-ink",
        "shadow-warm transition-all duration-500 ease-oasis",
      )}
    >
      {/* Visual */}
      <div className="relative mb-7 overflow-hidden rounded-[20px] aspect-[4/3]">
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      </div>

      <h3
        className={cn(
          "font-display font-bold text-[28px] leading-[1.05] tracking-[-0.02em] mb-3.5",
          "[&_em]:font-serif [&_em]:italic [&_em]:font-medium [&_em]:text-ember",
        )}
      >
        <Link
          href={href}
          className="text-inherit no-underline after:absolute after:inset-0 after:content-['']"
        >
          {title}
        </Link>
      </h3>
      <p className="flex-1 text-[15px] leading-[1.55] text-ink-soft">
        {description}
      </p>

      <div
        className={cn(
          "mt-6 flex items-center gap-3 pt-5",
          "border-t border-dashed border-dune-deep/15",
          footerLeft ? "justify-between" : "justify-end",
        )}
      >
        {footerLeft}
        <span className="inline-flex items-center gap-3">
          <Link
            href={portfolioHref}
            className={cn(
              "svc-cta relative z-10 inline-flex h-[38px] items-center justify-center",
              "rounded-full bg-ink text-cream",
              "px-[18px] text-[13px] font-semibold no-underline",
              "transition-colors duration-300 ease-oasis",
              "hover:bg-ember",
            )}
          >
            {exampleLabel}
          </Link>
          <span
            aria-hidden
            className={cn(
              "svc-arrow inline-flex h-[38px] w-[38px] items-center justify-center",
              "rounded-full bg-ink text-cream",
              "transition-all duration-300 ease-oasis",
            )}
          >
            <ArrowRight className="size-[17px]" strokeWidth={2.25} />
          </span>
        </span>
      </div>
    </div>
  );
}
