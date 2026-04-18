"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, MapPin, Phone, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { contactInfo } from "@/config/contact";
import { CONTACT_LIMITS, validateContact } from "@/lib/validation";

type SubmissionStatus = "idle" | "loading" | "success" | "error";

export function Contact() {
  const [status, setStatus] = useState<SubmissionStatus>("idle");
  const { toast } = useToast();
  const t = useTranslations("HomePage.ContactSection");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    const payload = {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      message: String(formData.get("message") ?? ""),
    };

    const validation = validateContact(payload);
    if (!validation.ok) {
      toast({
        title: t("useToast.errorTitle"),
        description: t("useToast.errorDescription"),
        variant: "destructive",
      });
      return;
    }

    setStatus("loading");

    try {
      const response = await fetch("/api/sendEmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      });

      if (!response.ok) throw new Error("Request failed");

      setStatus("success");
      toast({
        title: t("useToast.successTitle"),
        description: t("useToast.successDescription"),
        variant: "success",
      });
      form.reset();
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
      toast({
        title: t("useToast.errorTitle"),
        description: t("useToast.errorDescription"),
        variant: "destructive",
      });
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  const isLoading = status === "loading";

  return (
    <section id="contact" className="py-12 md:py-24 bg-secondary/50">
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
                <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                  <div className="space-y-2">
                    <Label htmlFor="name">{t("form.nameTitle")}</Label>
                    <Input
                      type="text"
                      name="name"
                      id="name"
                      placeholder={t("form.namePlaceholder")}
                      required
                      minLength={CONTACT_LIMITS.nameMin}
                      maxLength={CONTACT_LIMITS.nameMax}
                      autoComplete="name"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">{t("form.emailTitle")}</Label>
                    <Input
                      type="email"
                      name="email"
                      id="email"
                      placeholder={t("form.emailPlaceholder")}
                      required
                      maxLength={CONTACT_LIMITS.emailMax}
                      autoComplete="email"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">{t("form.messageTitle")}</Label>
                    <Textarea
                      name="message"
                      id="message"
                      placeholder={t("form.messagePlaceholder")}
                      rows={6}
                      required
                      minLength={CONTACT_LIMITS.messageMin}
                      maxLength={CONTACT_LIMITS.messageMax}
                      disabled={isLoading}
                    />
                  </div>

                  <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                    {isLoading ? t("form.submitButtonLoading") : t("form.submitButton")}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <h3 className="font-headline text-2xl font-bold">{t("contactInfo.title")}</h3>
            <div className="space-y-6 text-muted-foreground">
              <div className="flex items-start gap-4">
                <MapPin className="h-6 w-6 text-primary mt-1 flex-shrink-0" aria-hidden="true" />
                <div>
                  <h4 className="font-semibold text-foreground">{t("contactInfo.address")}</h4>
                  <p>{contactInfo.city}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Mail className="h-6 w-6 text-primary mt-1 flex-shrink-0" aria-hidden="true" />
                <div>
                  <h4 className="font-semibold text-foreground">{t("contactInfo.email")}</h4>
                  <a href={`mailto:${contactInfo.email}`} className="hover:text-primary transition-colors">
                    {contactInfo.email}
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Phone className="h-6 w-6 text-primary mt-1 flex-shrink-0" aria-hidden="true" />
                <div>
                  <h4 className="font-semibold text-foreground">{t("contactInfo.phone")}</h4>
                  <a
                    href={`tel:${contactInfo.phone.replace(/[^+\d]/g, "")}`}
                    className="hover:text-primary transition-colors"
                  >
                    {contactInfo.phone}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
