"use client";

import Image from "next/image";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from "@/hooks/use-mobile";
import LanguageSwitcher from "../templates/language-switcher";
import { useTranslations } from "next-intl";



export function Header() {
    const t = useTranslations("Navigation");
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const isMobile = useIsMobile();

	const navLinks = [
		{ href: "#home", key: t("home") },
		{ href: "#services", key: t("services") },
		{ href: "#portfolio", key: t("portfolio") },
		{ href: "#about", key: t("about") },
		{ href: "#contact", key: t("contact") },
	];

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <header
            className={cn(
                "fixed top-0 z-50 w-full transition-all duration-500",
                // Blur forte (md ou lg) para separar o texto do Hero
                "backdrop-blur-md", 
                // No topo: fundo branco muito leve para dar corpo ao blur e sombra branca
                "bg-white/20 border-b-2 border-red-900 shadow-[0_4px_30px_rgba(255,255,255,0.05)]",
                // Ao scrollar: fundo mais sólido e sombra escura padrão
                scrolled && "bg-background/90 border-border/40 shadow-lg"
            )}
            style={{ height: scrolled ? "64px" : "80px" }}
        >
            <div className="container mx-auto h-full max-w-7xl px-4 flex items-center justify-between">
                <Link href="/" className="shrink-0">
                    <Image src="/logo.png" alt="Logo" width={110} height={35} className="object-contain" />
                </Link>

                {!isMobile && (
                    <nav className="flex items-center gap-8">
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
                        <div className={cn("h-6 border-l", scrolled ? "border-border" : "border-white/20")} />
                        <LanguageSwitcher />
                    </nav>
                )}

                {isMobile && (
                    <div className="flex items-center gap-2">
                        <LanguageSwitcher />
                        <div className="h-5 border-l border-white/20 mx-1" />
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        >
                            {mobileMenuOpen ? <X /> : <Menu />}
                        </Button>
                    </div>
                )}
            </div>

            {/* Mobile Menu com Blur reforçado */}
            {isMobile && mobileMenuOpen && (
                <div className={cn(
                    "absolute top-full left-0 w-full border-b animate-in fade-in slide-in-from-top-2 duration-300",
                    // Aqui o blur é essencial para não ler o Hero por trás do menu
                    "bg-background/95 backdrop-blur-xl border-border shadow-2xl"
                )}>
                    <nav className="flex flex-col p-6 gap-1">
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