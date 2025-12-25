"use client";

import Image from "next/image";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from "@/hooks/use-mobile";
import LanguageSwitcher from "../templates/language-switcher";


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
					<Link href="/">
						<Image src="/logo.png" alt="Logo" width={120} height={40} className="object-contain" />
					</Link>
					

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
					<Link href="/">
						<Image src="/logo.png" alt="Logo" width={120} height={40} className="object-contain" />
					</Link>

					<nav className={cn("hidden gap-6 items-center", {"flex": scrolled})}>
						{navLinks.map((link) => (
							<Link key={link.href} href={link.href} className="font-medium text-foreground transition-colors hover:text-primary">
								{link.label}
							</Link>
						))}

						<LanguageSwitcher />
					</nav>
				</div>

				
			</header>
		)
	);
}
