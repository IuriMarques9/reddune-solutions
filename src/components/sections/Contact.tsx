"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, MapPin, Phone, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

type SubmissionStatus = "idle" | "loading" | "success" | "error";

export function Contact() {
const [status, setStatus] = useState<SubmissionStatus>("idle");
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    const data = {
      name: formData.get("name"),
      email: formData.get("email"),
      message: formData.get("message"),
    };

    setStatus("loading");
    
    try{
        const response = await fetch('/api/sendEmail', {
            method: 'POST',
            body: JSON.stringify(data),
        });

    }
    catch (error) {
        setStatus("error");
        toast({
            title: "Erro ao enviar a mensagem.",
            description: "Ocorreu um erro inesperado. Por favor, tente novamente mais tarde.",
            variant: "destructive",
        });
        return;
    } finally {
        // Atraso para o utilizador ver o sucesso antes de reativar o botão
        if (status === 'success') {
            setTimeout(() => setStatus("idle"), 2000);
        } else {
            setStatus("idle");
        }
    }
  };

  return (
    <section id="contact" className="py-20 md:py-32 bg-secondary/50">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="font-headline text-3xl md:text-4xl font-bold">Entre em Contato</h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Tem um projeto, dúvidas ou sugestões em mente? Adoraríamos ouvi-lo.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2">
                <Card className="shadow-lg rounded-lg">
                    <CardHeader>
                        <CardTitle className="font-headline text-2xl">Envie-nos uma mensagem</CardTitle>
                    </CardHeader>
                    <CardContent>
                       <form onSubmit={handleSubmit} className="space-y-6">
                            
                            <div className="space-y-2">
                                <label htmlFor="name" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Nome Completo</label>
                                <Input type="text" name="name" id="name" placeholder="João da Silva" required disabled={status === 'loading'}/>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Endereço de E-mail</label>
                                <Input type="email" name="email" id="email" placeholder="voce@exemplo.com" required disabled={status === 'loading'}/>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="message" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Sua Mensagem</label>
                                <Textarea name="message" id="message" placeholder="Conte-nos sobre seu projeto..." rows={6} required disabled={status === 'loading'}/>
                            </div>

                            <Button type="submit" className="w-full" size="lg" disabled={status === 'loading'}>
                                {status === 'loading' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {status === 'loading' ? 'A Enviar...' : 'Enviar Mensagem'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-8">
                <h3 className="font-headline text-2xl font-bold">Informações de Contato</h3>
                <div className="space-y-6 text-muted-foreground">
                    <div className="flex items-start gap-4">
                        <MapPin className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                        <div>
                            <h4 className="font-semibold text-foreground">Local</h4>
                            <p>Fuseta</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <Mail className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                        <div>
                            <h4 className="font-semibold text-foreground">Envie-nos um E-mail</h4>
                            <p>reddunesolutions@gmail.com</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <Phone className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                        <div>
                            <h4 className="font-semibold text-foreground">Ligue-nos</h4>
                            <p>(+351) 961 531 235</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </section>
  );
}
