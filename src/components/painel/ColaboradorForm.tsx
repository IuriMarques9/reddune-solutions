"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Colaborador } from "@/types/colaborador";
import { safeJsonPost } from "@/lib/safe-fetch";
import { useToast } from "@/hooks/use-toast";

type Props = {
  colaborador?: Colaborador;
  onSaved?: (id: string) => void;
  onCancel?: () => void;
};

export function ColaboradorForm({ colaborador, onSaved, onCancel }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nome, setNome] = useState(colaborador?.nome ?? "");
  const [papel, setPapel] = useState(colaborador?.papel ?? "");
  const [email, setEmail] = useState(colaborador?.email ?? "");
  const [telefone, setTelefone] = useState(colaborador?.telefone ?? "");
  const [nif, setNif] = useState(colaborador?.nif ?? "");
  const [notas, setNotas] = useState(colaborador?.notas ?? "");
  const [ativo, setAtivo] = useState(colaborador?.ativo ?? true);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nome.trim()) {
      setError("O nome é obrigatório.");
      return;
    }
    setSubmitting(true);
    const res = await safeJsonPost<{ id: string }>("/api/colaboradores/upsert", {
      id: colaborador?.id,
      nome: nome.trim(),
      papel: papel.trim() || null,
      email: email.trim() || null,
      telefone: telefone.trim() || null,
      nif: nif.trim() || null,
      notas: notas.trim() || null,
      ativo,
    });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error);
      toast({ title: "Erro a guardar colaborador", description: res.error, variant: "destructive" });
      return;
    }
    toast({ title: "Colaborador guardado", variant: "success" });
    startTransition(() => router.refresh());
    onSaved?.(res.data.id);
  }

  const isBusy = submitting || pending;

  return (
    <form onSubmit={onSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="co-nome">Nome *</Label>
          <Input
            id="co-nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            maxLength={120}
            placeholder="Ex.: Jaime"
            disabled={isBusy}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="co-papel">Papel habitual</Label>
          <Input
            id="co-papel"
            value={papel}
            onChange={(e) => setPapel(e.target.value)}
            maxLength={300}
            placeholder="Ex.: Comercial"
            disabled={isBusy}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="co-email">Email</Label>
          <Input
            id="co-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={300}
            placeholder="email@exemplo.pt"
            disabled={isBusy}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="co-telefone">Telemóvel</Label>
          <Input
            id="co-telefone"
            type="tel"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            maxLength={50}
            placeholder="+351 9XX XXX XXX"
            disabled={isBusy}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="co-nif">NIF</Label>
          <Input
            id="co-nif"
            value={nif}
            onChange={(e) => setNif(e.target.value)}
            maxLength={20}
            placeholder="123456789"
            disabled={isBusy}
          />
          <p className="text-[11px] text-muted-foreground">Para recibos que ele te passe.</p>
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="co-notas">Notas</Label>
        <Textarea
          id="co-notas"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          maxLength={5000}
          rows={4}
          placeholder="Como combinam pagamentos, IBAN, o que costuma fazer…"
          disabled={isBusy}
        />
      </div>

      {colaborador && (
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={!ativo}
            onChange={(e) => setAtivo(!e.target.checked)}
            disabled={isBusy}
            className="mt-0.5"
          />
          <span>
            Arquivar
            <span className="block text-[11px] text-muted-foreground">
              Deixa de aparecer nas listas de escolha. Projectos e pagamentos antigos ficam.
            </span>
          </span>
        </label>
      )}

      {error && (
        <p role="alert" className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md border border-destructive/20">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isBusy}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={isBusy} className="bg-ink text-cream hover:bg-ember">
          {isBusy && <Loader2 className="h-4 w-4 mr-1 animate-spin" aria-hidden="true" />}
          {colaborador ? "Guardar" : "Criar colaborador"}
        </Button>
      </div>
    </form>
  );
}
