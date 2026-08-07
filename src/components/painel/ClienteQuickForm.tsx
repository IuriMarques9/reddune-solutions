"use client";

import { useState } from "react";
import { Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Cliente } from "@/types/cliente";
import { safeJsonPost } from "@/lib/safe-fetch";
import { useToast } from "@/hooks/use-toast";

type Props = {
  onCreated: (cliente: Cliente) => void;
  onCancel: () => void;
};

export function ClienteQuickForm({ onCreated, onCancel }: Props) {
  const { toast } = useToast();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    setSaving(true);
    setError(null);
    const res = await safeJsonPost<{ id: string }>("/api/clientes/upsert", {
      nome: nome.trim(),
      empresa: null,
      email: email.trim() || null,
      telefone: telefone.trim() || null,
      nif: null,
      morada: null,
      notas: null,
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      toast({ title: "Erro a criar cliente", description: res.error, variant: "destructive" });
      return;
    }
    onCreated({
      id: res.data.id,
      nome: nome.trim(),
      empresa: null,
      email: email.trim() || null,
      telefone: telefone.trim() || null,
      nif: null,
      morada: null,
      notas: null,
      criadoEm: new Date().toISOString(),
    });
  }

  return (
    <div className="rounded-md border border-dashed border-primary/40 bg-primary/5 p-3 space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
        Criar novo cliente
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="qf-nome" className="text-xs">
          Nome *
        </Label>
        <Input
          id="qf-nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          maxLength={300}
          disabled={saving}
          autoFocus
          required
          className="h-8 text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="qf-email" className="text-xs">
            Email
          </Label>
          <Input
            id="qf-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={saving}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="qf-tel" className="text-xs">
            Telefone
          </Label>
          <Input
            id="qf-tel"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            disabled={saving}
            className="h-8 text-sm"
          />
        </div>
      </div>

      {error && (
        <p className="text-xs text-rose-600 bg-rose-500/10 border border-rose-500/20 rounded px-2 py-1">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Button
          type="button"
          size="sm"
          onClick={submit}
          disabled={saving || !nome.trim()}
          className="h-7 text-xs"
        >
          {saving ? (
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
          ) : (
            <Check className="h-3 w-3 mr-1" aria-hidden="true" />
          )}
          Criar
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={saving}
          className="h-7 text-xs"
        >
          <X className="h-3 w-3 mr-1" aria-hidden="true" />
          Cancelar
        </Button>
      </div>
    </div>
  );
}
