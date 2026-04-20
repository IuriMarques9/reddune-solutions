"use client";

import Image from "next/image";
import React, { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useScrollPosition } from "@/hooks/use-scroll-position";
import LanguageSwitcher from "../templates/language-switcher";
import { useTranslations } from "next-intl";
import { HEADER_HEIGHTS, SCROLL_THRESHOLD } from "@/constants/layout";

export function Header() {
  const t = useTranslations("Navigation");
  const scrolled = useScrollPosition(SCROLL_THRESHOLD);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  const navLinks = [
    { href: "/", key: t("home") },
    { href: "/servicos", key: t("services") },
    { href: "/loja", key: t("shop") },
  ];

  return (
    <header
      className={cn(
        "fixed top-0 z-50 w-full transition-all duration-500",
        "backdrop-blur-md",
        "bg-white border-b-2 border-red-900 shadow-[0_4px_30px_rgba(255,255,255,0.05)]",
        scrolled && "bg-background/90 border-border/40 shadow-lg"
      )}
      style={{ height: scrolled ? HEADER_HEIGHTS.scrolled : HEADER_HEIGHTS.default }}
    >
      <div className="container mx-auto h-full max-w-7xl px-4 flex items-center justify-between">
        <Link href="/" className="shrink-0" aria-label="Reddune Solutions - Home">
          <Image
            src="/logo.png"
            alt="Reddune Solutions"
            width={110}
            height={35}
            className="object-contain"
            priority
          />
        </Link>

        {!isMobile && (
          <nav className="flex items-center gap-4" aria-label="Main navigation">
            <div className="flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium transition-colors hover:text-primary text-foreground/90"
                >
                  {link.key}
                </Link>
              ))}
            </div>
            <div className="h-7 border-l border-primary mx-1" aria-hidden="true" />
            <LanguageSwitcher />
          </nav>
        )}

        {isMobile && (
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <div className="h-7 border-l border-primary mx-1" aria-hidden="true" />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
            </Button>
          </div>
        )}
      </div>

      {isMobile && mobileMenuOpen && (
        <div
          id="mobile-menu"
          className={cn(
            "absolute top-full left-0 w-full border-b animate-in fade-in slide-in-from-top-2 duration-300",
            "bg-background/95 backdrop-blur-xl border-border shadow-2xl"
          )}
        >
          <nav className="flex flex-col p-6 gap-1" aria-label="Mobile navigation">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center h-12 px-4 rounded-lg text-base font-medium hover:bg-accent transition-colors"
              >
                {link.key}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
