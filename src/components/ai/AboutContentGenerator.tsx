
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { generateAboutContentAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Copy, Loader2, Sparkles } from "lucide-react";

const formSchema = z.object({
  companyDescription: z.string().min(10, "Forneça uma descrição mais detalhada."),
  targetAudience: z.string().min(5, "Descreva seu público-alvo."),
  brandVoice: z.string().min(5, "Descreva a voz da sua marca."),
  additionalKeywords: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function AboutContentGenerator() {
  const [generatedContent, setGeneratedContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyDescription: "A Reddune Solutions é uma agência de design e desenvolvimento especializada em arquitetura moderna e experiências digitais centradas no usuário.",
      targetAudience: "Startups e empresas estabelecidas que procuram branding e presença na web de alta qualidade.",
      brandVoice: "Profissional, sofisticada e inovadora.",
      additionalKeywords: "sustentável, futurista, focada no cliente",
    },
  });

  async function onSubmit(values: FormValues) {
    setIsLoading(true);
    setGeneratedContent("");
    const result = await generateAboutContentAction(values);
    setIsLoading(false);

    if (result.success && result.data) {
      setGeneratedContent(result.data.aboutUsContent);
      toast({
        title: "Conteúdo Gerado",
        description: "Seu conteúdo 'Sobre Nós' foi gerado com sucesso.",
      });
    } else {
      toast({
        variant: "destructive",
        title: "Erro",
        description: result.error,
      });
    }
  }

  const copyToClipboard = () => {
    if (generatedContent) {
      navigator.clipboard.writeText(generatedContent);
      toast({
        title: "Copiado para a Área de Transferência",
        description: "O conteúdo gerado foi copiado.",
      });
    }
  };

  return (
    <Card className="mt-20 bg-secondary/50 border-border shadow-lg rounded-lg">
      <CardHeader>
        <div className="flex items-center gap-3">
            <Sparkles className="text-primary h-8 w-8" />
            <div className="flex-1">
                <CardTitle className="font-headline text-2xl">Assistente de Conteúdo de IA</CardTitle>
                <CardDescription className="mt-1">
                    Gere um conteúdo atraente para a seção 'Sobre Nós'. Preencha os detalhes abaixo para começar.
                </CardDescription>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="companyDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição da Empresa</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Descreva sua empresa, missão e valores..." {...field} rows={4} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="targetAudience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Público-alvo</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Quem você está tentando alcançar?" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="brandVoice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Voz da Marca</FormLabel>
                    <FormControl>
                      <Textarea placeholder="ex: Profissional, amigável, peculiar..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="additionalKeywords"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Palavras-chave Adicionais (opcional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="ex: sustentável, inovador..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Gerar Conteúdo
                  </>
                )}
              </Button>
            </form>
            
            <div className="flex flex-col">
                <FormLabel>Conteúdo Gerado</FormLabel>
                <div className="relative flex-grow mt-2">
                <Textarea
                    readOnly
                    value={isLoading ? "Gerando, por favor aguarde..." : generatedContent}
                    placeholder="O conteúdo gerado por IA aparecerá aqui..."
                    className="h-full min-h-[300px] resize-none bg-background"
                />
                {generatedContent && !isLoading && (
                    <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
                    onClick={copyToClipboard}
                    >
                    <Copy className="h-4 w-4" />
                    </Button>
                )}
                </div>
            </div>
          </Form>
        </div>
      </CardContent>
    </Card>
  );
}
