"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, MapPin, Phone } from "lucide-react";
import { useState } from "react";

const formSchema = z.object({
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres."),
  email: z.string().email("Por favor, insira um endereço de e-mail válido."),
  message: z.string().min(10, "A mensagem deve ter pelo menos 10 caracteres."),
});

type FormValues = z.infer<typeof formSchema>;

export function Contact() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      message: "",
    },
  });

  function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    // This is a mock submission. In a real app, you would send this to a server.
    console.log(values);
    
    setTimeout(() => {
        toast({
            title: "Mensagem Enviada!",
            description: "Obrigado por nos contatar. Retornaremos em breve.",
        });
        form.reset();
        setIsSubmitting(false);
    }, 1000);
  }

  return (
    <section id="contact" className="py-20 md:py-32 bg-secondary/50">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="font-headline text-3xl md:text-4xl font-bold">Entre em Contato</h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Tem um projeto em mente? Adoraríamos ouvir de você.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2">
                <Card className="shadow-lg rounded-lg">
                    <CardHeader>
                        <CardTitle className="font-headline text-2xl">Envie-nos uma mensagem</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nome Completo</FormLabel>
                                        <FormControl>
                                        <Input placeholder="João da Silva" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Endereço de E-mail</FormLabel>
                                        <FormControl>
                                        <Input placeholder="voce@exemplo.com" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="message"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Sua Mensagem</FormLabel>
                                        <FormControl>
                                        <Textarea placeholder="Conte-nos sobre seu projeto..." {...field} rows={6}/>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                                    {isSubmitting ? "Enviando..." : "Enviar Mensagem"}
                                </Button>
                            </form>
                        </Form>
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
                            <h4 className="font-semibold text-foreground">Ligue para Nós</h4>
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
