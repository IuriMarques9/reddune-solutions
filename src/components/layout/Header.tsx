"use client";

import Image from "next/image";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import logo from '../../public/logo.png';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from "@/hooks/use-mobile";


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
  const isMobile = useIsMobile();

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
    isMobile ? (
		/* Mobile Header */
		<header
			className={cn(
				"sticky top-0 z-50 w-full transition-all duration-300",
				scrolled
				? "border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
				: "bg-transparent"
			)}
		>
			<div className={cn("flex w-full items-center justify-center container mx-auto h-16 max-w-7xl px-4 ", {'justify-between': scrolled})}>
				{scrolled ? <LogoMobile /> : <Logo />}
				
				<nav className="hidden gap-6">
					{navLinks.map((link) => (
						<Link key={link.href} href={link.href} className="font-medium text-foreground transition-colors hover:text-primary">
							{link.label}
						</Link>
					))}
				</nav>

				<div className={cn("", {"hidden": !scrolled})}>
					<div className="">
						<Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
							{mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
							<span className="sr-only">Abrir menu</span>
						</Button>
					</div>
					{/* Mobile Menu */}
					{mobileMenuOpen && (
						<div className="absolute top-16 left-0 bg-background/95 border-t w-full border-border/40 w-full">
							<nav className="container mx-auto flex flex-col items-center gap-4 py-6">
								{navLinks.map((link) => (
									<Link key={link.href} href={link.href} className="text-lg font-medium text-foreground hover:text-primary transition-colors" onClick={() => setMobileMenuOpen(false)}>
										{link.label}
									</Link>
								))}
							</nav>
						</div>
					)}
				</div>

			</div>
		</header>
    ) : (
		/* Desktop Header */
      	<header
			className={cn(
				"sticky top-0 z-50 w-full transition-all duration-300",
				scrolled
				? "border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
				: "bg-transparent"
			)}
		>
			<div className={cn("flex w-full items-center justify-center container mx-auto h-20 max-w-7xl px-4", {'justify-between': scrolled})}>
			 	<Logo />

				<nav className={cn("hidden gap-6", {"flex": scrolled})}>
					{navLinks.map((link) => (
						<Link key={link.href} href={link.href} className="font-medium text-foreground transition-colors hover:text-primary">
							{link.label}
						</Link>
					))}
				</nav>
			</div>
		</header>
    )
  );
}
