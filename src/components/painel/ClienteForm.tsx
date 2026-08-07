"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Cliente } from "@/types/cliente";
import { safeJsonPost } from "@/lib/safe-fetch";
import { useToast } from "@/hooks/use-toast";

type Props = {
  cliente?: Cliente;
  onSaved?: (id: string) => void;
  onCancel?: () => void;
};

export function ClienteForm({ cliente, onSaved, onCancel }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nome, setNome] = useState(cliente?.nome ?? "");
  const [empresa, setEmpresa] = useState(cliente?.empresa ?? "");
  const [email, setEmail] = useState(cliente?.email ?? "");
  const [telefone, setTelefone] = useState(cliente?.telefone ?? "");
  const [nif, setNif] = useState(cliente?.nif ?? "");
  const [morada, setMorada] = useState(cliente?.morada ?? "");
  const [notas, setNotas] = useState(cliente?.notas ?? "");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await safeJsonPost<{ id: string }>("/api/clientes/upsert", {
      id: cliente?.id,
      nome: nome.trim(),
      empresa: empresa.trim() || null,
      email: email.trim() || null,
      telefone: telefone.trim() || null,
      nif: nif.trim() || null,
      morada: morada.trim() || null,
      notas: notas.trim() || null,
    });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error);
      toast({ title: "Erro a guardar cliente", description: res.error, variant: "destructive" });
      return;
    }
    toast({ title: "Cliente guardado", variant: "success" });
    startTransition(() => router.refresh());
    onSaved?.(res.data.id);
  }

  const isBusy = submitting || pending;

  return (
    <form onSubmit={onSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="nome">Nome *</Label>
          <Input
            id="nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            maxLength={300}
            placeholder="Nome completo"
            disabled={isBusy}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="empresa">Empresa</Label>
          <Input
            id="empresa"
            value={empresa}
            onChange={(e) => setEmpresa(e.target.value)}
            maxLength={300}
            placeholder="Nome da empresa"
            disabled={isBusy}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={300}
            placeholder="email@exemplo.pt"
            disabled={isBusy}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="telefone">Telemóvel</Label>
          <Input
            id="telefone"
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
          <Label htmlFor="nif">NIF</Label>
          <Input
            id="nif"
            value={nif}
            onChange={(e) => setNif(e.target.value)}
            maxLength={20}
            placeholder="123456789"
            disabled={isBusy}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="morada">Morada</Label>
        <Input
          id="morada"
          value={morada}
          onChange={(e) => setMorada(e.target.value)}
          maxLength={500}
          placeholder="Rua, cidade..."
          disabled={isBusy}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="notas">Notas</Label>
        <Textarea
          id="notas"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          maxLength={5000}
          rows={4}
          placeholder="Informações adicionais..."
          disabled={isBusy}
        />
      </div>

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
          {cliente ? "Guardar" : "Criar cliente"}
        </Button>
      </div>
    </form>
  );
}
