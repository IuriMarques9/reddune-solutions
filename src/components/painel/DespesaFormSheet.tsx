"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DESPESA_CATEGORIA_HINT,
  DESPESA_CATEGORIA_LABEL,
  DESPESA_CATEGORIA_ORDER,
  type DespesaCategoria,
} from "@/types/despesa";
import { parseMoney } from "@/lib/parse-number";
import { todayLisbonYmd } from "@/lib/dates";
import { safeJsonPost } from "@/lib/safe-fetch";
import { useToast } from "@/hooks/use-toast";

export type ProjetoOption = { id: string; titulo: string };

/** Valores iniciais do form — ex.: a ficha do projecto abre já com o projecto
 * e a categoria "colaboradores" preenchidos para registar um pagamento. */
export type DespesaPrefill = {
  categoria?: DespesaCategoria;
  projetoId?: string;
  colaborador?: string;
};

type SheetProps = {
  projetos: ProjetoOption[];
  /** Controlo externo do sheet (ex.: NovoMenu). Sem esta prop gere o próprio estado. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Esconde o trigger — o sheet passa a abrir apenas via `open` controlado. */
  hideTrigger?: boolean;
  prefill?: DespesaPrefill;
};

/**
 * DespesaFormSheet — botão + Sheet lateral para registar uma despesa manual
 * da empresa (stock, domínios, licenças, marketing…). POST /api/despesas/upsert.
 */
export function DespesaFormSheet({
  projetos,
  open: openProp,
  onOpenChange,
  hideTrigger = false,
  prefill,
}: SheetProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;

  function setOpen(o: boolean) {
    onOpenChange?.(o);
    if (openProp === undefined) setInternalOpen(o);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <SheetTrigger asChild>
          <button type="button" className="btn-primary">
            <Plus className="ic" aria-hidden="true" />
            Registar despesa
          </button>
        </SheetTrigger>
      )}
      <SheetContent side="right" className="flex flex-col p-0">
        <SheetHeader>
          <SheetTitle>Registar despesa</SheetTitle>
          <SheetDescription>
            Gasto da empresa — stock, peças, domínios, licenças, marketing…
          </SheetDescription>
        </SheetHeader>
        <DespesaForm
          projetos={projetos}
          prefill={prefill}
          onSaved={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </SheetContent>
    </Sheet>
  );
}

type FormProps = {
  projetos: ProjetoOption[];
  prefill?: DespesaPrefill;
  onSaved?: () => void;
  onCancel?: () => void;
};

function DespesaForm({ projetos, prefill, onSaved, onCancel }: FormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState<DespesaCategoria | "">(prefill?.categoria ?? "");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(todayLisbonYmd());
  const [projetoId, setProjetoId] = useState(prefill?.projetoId ?? "");
  const [colaborador, setColaborador] = useState(prefill?.colaborador ?? "");
  const [notas, setNotas] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!categoria) {
      setError("Escolhe uma categoria.");
      return;
    }
    const v = parseMoney(valor);
    if (v == null || v <= 0) {
      setError("Valor inválido — usa um número positivo (aceita vírgula).");
      return;
    }
    // O nome é a chave que agrupa os totais por pessoa — sem ele o pagamento
    // ficava órfão nos relatórios (o `required` do input deixa passar espaços).
    if (categoria === "colaboradores" && !colaborador.trim()) {
      setError("Escreve a quem pagaste.");
      return;
    }
    setSubmitting(true);
    const res = await safeJsonPost<{ id: string }>("/api/despesas/upsert", {
      descricao: descricao.trim(),
      categoria,
      valor: Math.round(v * 100) / 100,
      data,
      projetoId: projetoId || null,
      colaborador: categoria === "colaboradores" ? colaborador.trim() || null : null,
      notas: notas.trim() || null,
    });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error);
      toast({ title: "Erro a registar despesa", description: res.error, variant: "destructive" });
      return;
    }
    toast({ title: "Despesa registada", variant: "success" });
    startTransition(() => router.refresh());
    onSaved?.();
  }

  const isBusy = submitting || pending;

  return (
    <form onSubmit={onSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
      <div className="space-y-1">
        <Label htmlFor="dd">Descrição *</Label>
        <Input
          id="dd"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          required
          maxLength={300}
          placeholder="Ex.: SSD 1TB para stock"
          disabled={isBusy}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Categoria *</Label>
          <Select
            value={categoria}
            onValueChange={(v) => setCategoria(v as DespesaCategoria)}
            disabled={isBusy}
          >
            <SelectTrigger>
              <SelectValue placeholder="Escolher…" />
            </SelectTrigger>
            <SelectContent>
              {DESPESA_CATEGORIA_ORDER.map((c) => (
                <SelectItem key={c} value={c} title={DESPESA_CATEGORIA_HINT[c]}>
                  {DESPESA_CATEGORIA_LABEL[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {categoria && (
            <p className="text-[11px] text-muted-foreground">{DESPESA_CATEGORIA_HINT[categoria]}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="dv">Valor € *</Label>
          <Input
            id="dv"
            type="text"
            inputMode="decimal"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            required
            placeholder="0,00"
            disabled={isBusy}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="dt">Data *</Label>
          <Input
            id="dt"
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            required
            disabled={isBusy}
          />
        </div>
        <div className="space-y-1">
          <Label>Projecto (opcional)</Label>
          <Select
            value={projetoId || "__none"}
            onValueChange={(v) => setProjetoId(v === "__none" ? "" : v)}
            disabled={isBusy}
          >
            <SelectTrigger>
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">— sem projecto —</SelectItem>
              {projetos.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.titulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {categoria === "colaboradores" && (
        <div className="space-y-1">
          <Label htmlFor="dc">Pago a (nome) *</Label>
          <Input
            id="dc"
            value={colaborador}
            onChange={(e) => setColaborador(e.target.value)}
            required
            maxLength={120}
            placeholder="Ex.: Jaime"
            disabled={isBusy}
          />
          <p className="text-[11px] text-muted-foreground">
            Usa sempre o mesmo nome — é ele que agrupa os totais por pessoa.
          </p>
        </div>
      )}

      <div className="space-y-1">
        <Label htmlFor="dn">Notas</Label>
        <Textarea
          id="dn"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="Detalhes, fornecedor, nº de factura…"
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
          Registar
        </Button>
      </div>
    </form>
  );
}
