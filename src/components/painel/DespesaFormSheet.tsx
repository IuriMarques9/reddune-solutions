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
  type Despesa,
  type DespesaCategoria,
} from "@/types/despesa";
import { parseMoney } from "@/lib/parse-number";
import { todayLisbonYmd } from "@/lib/dates";
import { safeJsonPost } from "@/lib/safe-fetch";
import { useToast } from "@/hooks/use-toast";
import type { Colaborador } from "@/types/colaborador";
import { ColaboradorPicker } from "./ColaboradorPicker";
import { NovoColaboradorButton } from "./NovoColaboradorButton";

export type ProjetoOption = { id: string; titulo: string };

/** Valores iniciais do form — ex.: a ficha do projecto abre já com o projecto
 * e a categoria "colaboradores" preenchidos para registar um pagamento. */
export type DespesaPrefill = {
  categoria?: DespesaCategoria;
  projetoId?: string;
  colaboradorId?: string;
};

type SheetProps = {
  projetos: ProjetoOption[];
  /** Despesa a editar. Sem esta prop o sheet regista uma nova. */
  despesa?: Despesa;
  /** Fichas para escolher em pagamentos a colaboradores. */
  colaboradores?: Colaborador[];
  /** Controlo externo do sheet (ex.: NovoMenu). Sem esta prop gere o próprio estado. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Esconde o trigger — o sheet passa a abrir apenas via `open` controlado. */
  hideTrigger?: boolean;
  prefill?: DespesaPrefill;
};

/**
 * DespesaFormSheet — botão + Sheet lateral para registar ou editar uma despesa
 * manual da empresa (stock, domínios, licenças, marketing…).
 * POST /api/despesas/upsert.
 */
export function DespesaFormSheet({
  projetos,
  despesa,
  colaboradores = [],
  open: openProp,
  onOpenChange,
  hideTrigger = false,
  prefill,
}: SheetProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const isEdit = !!despesa;

  function setOpen(o: boolean) {
    onOpenChange?.(o);
    if (openProp === undefined) setInternalOpen(o);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <SheetTrigger asChild>
          <button type="button" className={isEdit ? "btn-ghost" : "btn-primary"}>
            {!isEdit && <Plus className="ic" aria-hidden="true" />}
            {isEdit ? "Editar" : "Registar despesa"}
          </button>
        </SheetTrigger>
      )}
      <SheetContent side="right" className="flex flex-col p-0">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Editar despesa" : "Registar despesa"}</SheetTitle>
          {/* Nasceu de um plano: diz-se, não se trava — a ligação viaja no
              payload e nunca é campo de utilizador. */}
          {/* rgba à mão, não `bg-ember/8`: os tokens Oasis são `var(--ember)`
              com hex lá dentro, e o Tailwind 3 não gera a variante com
              opacidade — a classe saía do CSS e o chip ficava sem fundo. */}
          {despesa?.mensalidadeId && (
            <span className="self-start rounded-full border border-[rgba(214,66,42,0.25)] bg-[rgba(214,66,42,0.08)] px-2 py-0.5 text-[10px] uppercase tracking-wide text-dune">
              Do plano
              {despesa.cobrancaNumero ? ` · cobrança ${despesa.cobrancaNumero}` : ""}
            </span>
          )}
          <SheetDescription>
            {isEdit
              ? "Actualiza os dados desta despesa."
              : "Gasto da empresa — stock, peças, domínios, licenças, marketing…"}
          </SheetDescription>
        </SheetHeader>
        <DespesaForm
          key={despesa?.id ?? "nova"}
          projetos={projetos}
          despesa={despesa}
          colaboradores={colaboradores}
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
  despesa?: Despesa;
  colaboradores: Colaborador[];
  prefill?: DespesaPrefill;
  onSaved?: () => void;
  onCancel?: () => void;
};

function DespesaForm({ projetos, despesa, colaboradores, prefill, onSaved, onCancel }: FormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A despesa a editar ganha sempre ao prefill — o prefill é para a criação.
  // Remontagem por `key` no chamador; sem useEffect de re-sync (via-se o valor
  // a saltar, ver CustosCard).
  const [descricao, setDescricao] = useState(despesa?.descricao ?? "");
  const [categoria, setCategoria] = useState<DespesaCategoria | "">(
    despesa?.categoria ?? prefill?.categoria ?? ""
  );
  const [valor, setValor] = useState(despesa ? String(despesa.valor).replace(".", ",") : "");
  const [data, setData] = useState(despesa?.data.slice(0, 10) ?? todayLisbonYmd());
  const [projetoId, setProjetoId] = useState(despesa?.projetoId ?? prefill?.projetoId ?? "");
  const [colaboradorId, setColaboradorId] = useState(
    despesa?.colaboradorId ?? prefill?.colaboradorId ?? ""
  );
  const [notas, setNotas] = useState(despesa?.notas ?? "");
  // Sheet de ficha nova aberto por cima deste — quem falta na lista cria-se
  // aqui em vez de abandonar o pagamento a meio.
  const [novoAberto, setNovoAberto] = useState(false);

  // Projecto que a despesa aponta mas já não existe na lista (foi apagado).
  // Precisa de entrada própria no Select, senão o campo fica em branco.
  const orfao =
    projetoId && !projetos.some((p) => p.id === projetoId) ? projetoId : null;

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
    // Sem pessoa escolhida o pagamento ficava órfão nos relatórios.
    if (categoria === "colaboradores" && !colaboradorId) {
      setError("Escolhe a quem pagaste.");
      return;
    }
    setSubmitting(true);
    const res = await safeJsonPost<{ id: string }>("/api/despesas/upsert", {
      id: despesa?.id,
      descricao: descricao.trim(),
      categoria,
      valor: Math.round(v * 100) / 100,
      data,
      projetoId: projetoId || null,
      colaboradorId: categoria === "colaboradores" ? colaboradorId || null : null,
      notas: notas.trim() || null,
      // A ligação ao plano não é campo de utilizador: viaja intacta, senão o
      // upsert reescrevia-a a null e a prestação reabria no calendário e no cron.
      mensalidadeId: despesa?.mensalidadeId ?? null,
      cobrancaNumero: despesa?.cobrancaNumero ?? null,
    });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error);
      toast({
        title: despesa ? "Erro a guardar despesa" : "Erro a registar despesa",
        description: res.error,
        variant: "destructive",
      });
      return;
    }
    toast({ title: despesa ? "Despesa guardada" : "Despesa registada", variant: "success" });
    startTransition(() => router.refresh());
    onSaved?.();
  }

  const isBusy = submitting || pending;
  // A rota anula o colaboradorId fora da categoria "colaboradores", em silêncio.
  const perdeColaborador = !!despesa?.colaboradorId && categoria !== "colaboradores";
  const nomePago =
    colaboradores.find((c) => c.id === despesa?.colaboradorId)?.nome ?? "este colaborador";

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
          {perdeColaborador && (
            <p className="text-[11px] text-muted-foreground">
              Deixa de contar como pagamento a {nomePago}.
            </p>
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
              {/* Apagar um projecto deixa as despesas dele como histórico
                  (api/projetos/[id]). Sem esta entrada o campo ficava EM BRANCO
                  — nem título nem "sem projecto" — e lia-se como desligado
                  quando a ligação continua lá. */}
              {orfao && (
                <SelectItem value={orfao}>— projecto apagado —</SelectItem>
              )}
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
          <Label htmlFor="dc">Pago a *</Label>
          <ColaboradorPicker
            id="dc"
            colaboradores={colaboradores}
            value={colaboradorId}
            onChange={setColaboradorId}
            disabled={isBusy}
          />
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-muted-foreground">
              Escolhido da ficha — os totais por pessoa agrupam sozinhos.
            </p>
            <button
              type="button"
              onClick={() => setNovoAberto(true)}
              disabled={isBusy}
              className="text-[11px] underline underline-offset-2 text-muted-foreground hover:text-foreground"
            >
              Falta alguém?
            </button>
          </div>
          <NovoColaboradorButton
            open={novoAberto}
            onOpenChange={setNovoAberto}
            hideTrigger
            onSaved={(id) => setColaboradorId(id)}
          />
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
          {despesa ? "Guardar" : "Registar"}
        </Button>
      </div>
    </form>
  );
}
