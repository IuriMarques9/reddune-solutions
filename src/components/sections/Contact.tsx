"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, MapPin, Phone } from "lucide-react";


export function Contact() {

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
                       <form action={`https://formsubmit.co/reddunesolutions@hotmail.com`} method="POST" className="space-y-6">
                            {/* Honeypot */}
                            <input type="text" name="_honey" style={{ display: 'none' }} />
                            {/* Disable Captcha */}
                            <input type="hidden" name="_captcha" value="false" />
                            {/* Success URL */}
                            <input type="hidden" name="_next" value="/emailSend" />
                            {/* Email Template */}
                            <input type="hidden" name="_template" value="table" />
                            
                            <div className="space-y-2">
                                <label htmlFor="name" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Nome Completo</label>
                                <Input type="text" name="name" id="name" placeholder="João da Silva" required />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Endereço de E-mail</label>
                                <Input type="email" name="email" id="email" placeholder="voce@exemplo.com" required />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="message" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Sua Mensagem</label>
                                <Textarea name="message" id="message" placeholder="Conte-nos sobre seu projeto..." rows={6} required />
                            </div>

                            <Button type="submit" className="w-full" size="lg">
                                Enviar Mensagem
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
