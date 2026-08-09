"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import type { CompanySettings } from "@/lib/mongodb/settings";
import { safeFetch } from "@/lib/safe-fetch";
import { useToast } from "@/hooks/use-toast";

type Props = {
  settings: CompanySettings;
};

/** Valida o formato PT do lado do cliente (espelha a regra do schema da rota). */
function nifInvalid(nif: string): boolean {
  const v = nif.trim();
  return v !== "" && !/^\d{9}$/.test(v);
}

export function CompanyProfileForm({ settings }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [, startTransition] = useTransition();

  const [nome, setNome] = useState(settings.nome ?? "");
  const [nif, setNif] = useState(settings.nif ?? "");
  const [email, setEmail] = useState(settings.email ?? "");
  const [telefone, setTelefone] = useState(settings.telefone ?? "");
  const [morada, setMorada] = useState(settings.morada ?? "");
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl ?? "");

  const [saving, setSaving] = useState(false);

  const nifErr = nifInvalid(nif);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (nifErr) {
      toast({
        title: "NIF inválido",
        description: "O NIF deve ter 9 dígitos.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    const res = await safeFetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: nome.trim(),
        nif: nif.trim(),
        email: email.trim(),
        telefone: telefone.trim(),
        morada: morada.trim(),
        logoUrl: logoUrl.trim(),
      }),
    });
    setSaving(false);

    if (!res.ok) {
      toast({
        title: "Erro a guardar perfil",
        description: res.error,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Perfil guardado", variant: "success" });
    startTransition(() => router.refresh());
  }

  const logoSrc = logoUrl.trim() || "/logo-mark.png";

  return (
    <form onSubmit={onSubmit}>
      <p className="muted" style={{ fontSize: 12, marginBottom: 14 }}>
        Estes dados são usados no painel e em documentos internos — <b>não</b>{" "}
        alteram os contactos do site público (esses vivem no código, em{" "}
        <code>src/lib/constants.ts</code>).
      </p>
      <div className="row" style={{ gap: 18, marginBottom: 18, alignItems: "flex-start" }}>
        <div
          style={{
            width: 88,
            height: 88,
            borderRadius: 16,
            background: "var(--cream-deep)",
            display: "grid",
            placeItems: "center",
            border: "1px solid rgba(90, 14, 14, 0.10)",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          <Image
            src={logoSrc}
            alt=""
            width={56}
            height={56}
            style={{ objectFit: "contain" }}
            unoptimized
          />
        </div>
        <div className="col" style={{ gap: 4, alignItems: "flex-start", flex: 1 }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 18,
              letterSpacing: "-0.01em",
            }}
          >
            {nome.trim() || "RedDune Solutions"}
          </div>
          <div className="muted" style={{ fontSize: 12.5 }}>
            Cola o URL do logo (PNG ou SVG). Recomendado 512×512.
          </div>
          <div className="field" style={{ width: "100%", marginTop: 6, marginBottom: 0 }}>
            <label htmlFor="company-logo">URL do logo</label>
            <input
              id="company-logo"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://…"
              disabled={saving}
            />
          </div>
        </div>
      </div>

      <div className="set-grid">
        <div className="field">
          <label htmlFor="company-nome">Nome</label>
          <input
            id="company-nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="RedDune Solutions"
            disabled={saving}
          />
        </div>
        <div className="field">
          <label htmlFor="company-nif">NIF</label>
          <input
            id="company-nif"
            value={nif}
            onChange={(e) => setNif(e.target.value)}
            placeholder="123456789"
            inputMode="numeric"
            aria-invalid={nifErr}
            disabled={saving}
          />
          {nifErr && (
            <span
              role="alert"
              style={{ display: "block", fontSize: 11.5, color: "var(--ember)", marginTop: 4 }}
            >
              NIF deve ter 9 dígitos.
            </span>
          )}
        </div>
        <div className="field">
          <label htmlFor="company-email">Email</label>
          <input
            id="company-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="reddunesolutions@gmail.com"
            disabled={saving}
          />
        </div>
        <div className="field">
          <label htmlFor="company-telefone">Telemóvel</label>
          <input
            id="company-telefone"
            type="tel"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="+351 9XX XXX XXX"
            disabled={saving}
          />
        </div>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label htmlFor="company-morada">Morada</label>
          <input
            id="company-morada"
            value={morada}
            onChange={(e) => setMorada(e.target.value)}
            placeholder="Fuseta · Algarve"
            disabled={saving}
          />
        </div>
      </div>

      <button type="submit" className="btn-primary" style={{ marginTop: 6 }} disabled={saving || nifErr}>
        {saving && <Loader2 className="ic animate-spin" aria-hidden="true" />}
        Guardar
      </button>
    </form>
  );
}
