"use client";

import { Instagram } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { contactInfo } from "@/config/contact";

export function Footer() {
  const t = useTranslations("Footer");
  const pathname = usePathname();
  const origin =
    pathname?.startsWith("/loja")
      ? "shop"
      : pathname?.startsWith("/servicos")
        ? "pricing"
        : "home";
  const contactHref = origin === "home" ? "/contacto" : `/contacto?from=${origin}`;

  return (
    <footer className="bg-secondary/50 text-secondary-foreground py-8">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between md:flex-row">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <Link href="/" aria-label="Reddune Solutions - Home">
              <Image src="/logo.png" alt="Reddune Solutions" width={150} height={150} />
            </Link>
          </div>


        <div className="flex items-center gap-4">
          <Link href={contactHref}>
            <p className="text-muted-foreground hover:text-primary transition-colors">{t("contactButton")}</p>
          </Link>

            <Link
              href={contactInfo.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <Instagram className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">Instagram</span>
            </Link>
          </div>
        </div>
        <div className="mt-8 border-t border-border pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Reddune Solutions. {t("rights")}</p>
        </div>
      </div>
    </footer>
  );
}
