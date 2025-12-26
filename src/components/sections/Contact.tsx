"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, MapPin, Phone, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useTranslations } from "next-intl";

type SubmissionStatus = "idle" | "loading" | "success" | "error";

export function Contact() {
    const [status, setStatus] = useState<SubmissionStatus>("idle");
    const { toast } = useToast();

    const t = useTranslations("HomePage.ContactSection");

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

        if (response.ok) {
        setStatus("success");
        toast({
          title: t("useToast.successTitle"),
          description: t("useToast.successDescription"),
          variant: "success",
        });
        (event.target as HTMLFormElement).reset(); // Limpa o formulário
      } else {
        throw new Error("A resposta da rede não foi bem-sucedida.");
      }
    }
    catch (error) {
        setStatus("error");
        toast({
            title: t("useToast.errorTitle"),
            description: t("useToast.errorDescription"),
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
    <section id="contact" className="md:py-32 bg-secondary/50">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="font-headline text-3xl md:text-4xl font-bold">{t("title")}</h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("description")}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2">
                <Card className="shadow-lg rounded-lg">
                    <CardHeader>
                        <CardTitle className="font-headline text-2xl">{t("form.title")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                       <form onSubmit={handleSubmit} className="space-y-6">
                            
                            <div className="space-y-2">
                                <label htmlFor="name" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{t("form.nameTitle")}</label>
                                <Input type="text" name="name" id="name" placeholder={t("form.namePlaceholder")} required disabled={status === 'loading'}/>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{t("form.emailTitle")}</label>
                                <Input type="email" name="email" id="email" placeholder={t("form.emailPlaceholder")} required disabled={status === 'loading'}/>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="message" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{t("form.messageTitle")}</label>
                                <Textarea name="message" id="message" placeholder={t("form.messagePlaceholder")} rows={6} required disabled={status === 'loading'}/>
                            </div>

                            <Button type="submit" className="w-full" size="lg" disabled={status === 'loading'}>
                                {status === 'loading' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {status === 'loading' ? t("form.submitButtonLoading") : t("form.submitButton")}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-8">
                <h3 className="font-headline text-2xl font-bold">{t("contactInfo.title")}</h3>
                <div className="space-y-6 text-muted-foreground">
                    <div className="flex items-start gap-4">
                        <MapPin className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                        <div>
                            <h4 className="font-semibold text-foreground">{t("contactInfo.address")}</h4>
                            <p>Fuseta</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <Mail className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                        <div>
                            <h4 className="font-semibold text-foreground">{t("contactInfo.email")}</h4>
                            <p>reddunesolutions@gmail.com</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <Phone className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                        <div>
                            <h4 className="font-semibold text-foreground">{t("contactInfo.phone")}</h4>
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
