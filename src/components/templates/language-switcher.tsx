'use client';

import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/button';
import { useRouter } from "next/navigation";

const LanguageSwitcher = () => {
  	const [locale, setLocale] = useState<string>('');
	const router = useRouter();

    const changeLocale = (newLocale: string) => {
            setLocale(newLocale);
            document.cookie = `MYNEXTAPP_LOCALE=${newLocale};`;
            router.refresh();
        };

        useEffect(() => {
                const cookieLocale = document.cookie
                .split('; ')
                .find(row => row.startsWith('MYNEXTAPP_LOCALE='))
                ?.split('=')[1];
        
                if (cookieLocale) {
                    setLocale(cookieLocale);
                } else {
                    const browserLocale = navigator.language.slice(0, 2);
                    setLocale(browserLocale);
                    document.cookie = `MYNEXTAPP_LOCALE=${browserLocale};`;
                    router.refresh();
                }
        
            }, [router]);
  return (
    <div className="flex align-middle gap-2">
      <Button
        variant={locale === 'pt' ? 'default' : 'ghost'}
        size="sm"
        className={locale === 'pt' ? 'text-white' : 'text-black'}
        onClick={() => changeLocale('pt')}
      >
        PT
      </Button>
      <Button
        variant={locale === 'en' ? 'default' : 'ghost'}
        size="sm"
        className={locale === 'en' ? 'text-white' : 'text-black'}
        onClick={() => changeLocale('en')}
      >
        EN
      </Button>
    </div>
  );
};

export default LanguageSwitcher;
