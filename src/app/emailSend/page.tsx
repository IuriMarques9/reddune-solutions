import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function ObrigadoPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow flex items-center justify-center">
        <div className="text-center p-8">
          <CheckCircle2 className="h-20 w-20 text-green-500 mx-auto mb-6" />
          <h1 className="font-headline text-4xl md:text-5xl font-bold text-foreground">
            Mensagem Enviada!
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-md mx-auto">
            Obrigado por entrar em contato. Recebemos a sua mensagem e responderemos o mais breve possível.
          </p>
          <div className="mt-8">
            <Button asChild>
              <Link href="/">Voltar à Página Inicial</Link>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
