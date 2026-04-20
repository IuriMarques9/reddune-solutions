"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import type { Locale } from "@/types/i18n";

const COOKIE_NAME = "MYNEXTAPP_LOCALE";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const SUPPORTED: ReadonlyArray<Locale> = ["pt", "en"];
const DEFAULT_LOCALE: Locale = "pt";

const FLAGS: Record<Locale, { src: string; label: string }> = {
  pt: { src: "https://flagcdn.com/w40/pt.png", label: "Português" },
  en: { src: "https://flagcdn.com/w40/gb.png", label: "English" },
};

const readCookie = (name: string): string | undefined =>
  document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.split("=")[1];

const writeCookie = (name: string, value: string) => {
  document.cookie = `${name}=${value}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
};

const normalize = (value: string | undefined): Locale =>
  SUPPORTED.includes(value as Locale) ? (value as Locale) : DEFAULT_LOCALE;

const LanguageSwitcher = () => {
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);
  const router = useRouter();

  useEffect(() => {
    const cookieLocale = readCookie(COOKIE_NAME);
    if (cookieLocale && SUPPORTED.includes(cookieLocale as Locale)) {
      setLocale(cookieLocale as Locale);
      return;
    }
    const browser = navigator.language.slice(0, 2);
    const next = normalize(browser);
    setLocale(next);
    writeCookie(COOKIE_NAME, next);
    router.refresh();
  }, [router]);

  const toggle = () => {
    const next = locale === "pt" ? "en" : "pt";
    setLocale(next);
    writeCookie(COOKIE_NAME, next);
    router.refresh();
  };

  const { src, label } = FLAGS[locale];

  return (
    <Button
      variant="ghost"
      size="sm"
      className="px-1 py-1 h-auto"
      onClick={toggle}
      aria-label={label}
    >
      <Image
        src={src}
        alt={label}
        width={28}
        height={20}
        className="rounded-sm object-cover"
      />
    </Button>
  );
};

export default LanguageSwitcher;
