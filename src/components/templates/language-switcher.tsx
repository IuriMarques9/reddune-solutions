"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import type { Locale } from "@/types/i18n";

const COOKIE_NAME = "MYNEXTAPP_LOCALE";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const SUPPORTED: ReadonlyArray<Locale> = ["pt", "en"];
const DEFAULT_LOCALE: Locale = "pt";

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

  const changeLocale = (newLocale: Locale) => {
    if (newLocale === locale) return;
    setLocale(newLocale);
    writeCookie(COOKIE_NAME, newLocale);
    router.refresh();
  };

  return (
    <div className="flex align-middle gap-2" role="group" aria-label="Language selector">
      {SUPPORTED.map((code) => (
        <Button
          key={code}
          variant={locale === code ? "default" : "ghost"}
          size="sm"
          className={locale === code ? "text-white" : "text-black"}
          onClick={() => changeLocale(code)}
          aria-pressed={locale === code}
        >
          {code.toUpperCase()}
        </Button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;
