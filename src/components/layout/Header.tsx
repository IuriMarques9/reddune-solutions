"use client";

import Image from "next/image";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import logo from '../../public/logo.png';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';


const RedduneDuneLogo = () => (
    <Image src={logo} alt={"logo"} width={50} height={50}/>
);

const navLinks = [
    { href: "#home", label: "Início" },
    { href: "#services", label: "Serviços" },
    { href: "#portfolio", label: "Portfólio" },
    { href: "#about", label: "Sobre" },
    { href: "#contact", label: "Contacto" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const Logo = () => (
    <Link href="/" className="flex items-center gap-2 text-foreground" onClick={() => setMobileMenuOpen(false)}>
        <RedduneDuneLogo />
        <span className="font-headline text-xl font-bold">Reddune Solutions</span>
    </Link>
  );

  const LogoMobile = () => (
    <Link href="/" className="flex items-center gap-2 text-foreground" onClick={() => setMobileMenuOpen(false)}>
        <RedduneDuneLogo />
    </Link>
  );

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300 flex items-center",
        scrolled || mobileMenuOpen
          ? "border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
          : "bg-transparent"
      )}
    >
      {/* Scrolled: Logo on left, nav on right */}
        <div className={cn("flex w-full items-center justify-between container mx-auto h-20 max-w-7x px-4 sm:px-6 lg:px-8", { "hidden": !scrolled })}>        
          <LogoMobile />
            <nav className="hidden md:flex gap-6">
                {navLinks.map((link) => (
                    <Link key={link.href} href={link.href} className="font-medium text-foreground transition-colors hover:text-primary">
                        {link.label}
                    </Link>
                ))}
            </nav>
        </div>

        {/* Top of page: Logo in center, nav split */}
        <div className={cn("hidden w-full items-center justify-center h-20", { "md:flex": !scrolled })}>
            <nav className="flex-1 flex justify-end gap-8">
                {navLinks.slice(0, 2).map((link) => (
                     <Link key={link.href} href={link.href} className="font-medium text-primary-foreground/80 transition-colors hover:text-primary-foreground">
                        {link.label}
                    </Link>
                ))}
            </nav>
            <div className="px-12">
                <Logo />
            </div>
            <nav className="flex-1 flex justify-start gap-8">
                {navLinks.slice(2).map((link) => (
                     <Link key={link.href} href={link.href} className="font-medium text-primary-foreground/80 transition-colors hover:text-primary-foreground">
                        {link.label}
                    </Link>
                ))}
            </nav>
        </div>

        <div className="md:hidden">
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                <span className="sr-only">Abrir menu</span>
            </Button>
          </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
          <div className="md:hidden bg-background/95 border-t border-border/40">
              <nav className="container mx-auto flex flex-col items-center gap-6 py-8">
                {navLinks.map((link) => (
                    <Link key={link.href} href={link.href} className="text-lg font-medium text-foreground hover:text-primary transition-colors" onClick={() => setMobileMenuOpen(false)}>
                        {link.label}
                    </Link>
                ))}
              </nav>
          </div>
      )}
    </header>
  );
}
