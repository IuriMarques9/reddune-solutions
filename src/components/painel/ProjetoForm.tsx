"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus, Wand2 } from "lucide-react";
import type { ProjetoTipoCustom } from "@/lib/mongodb/projeto-tipos-custom";
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
  STATUS_LABELS,
  PROJETO_STATUS_FLUXO,
  PROJETO_TIPO_LABEL,
  CATEGORIA_TIPOS,
  TIPO_TO_CATEGORIA,
  firstBaseTipo,
  isProjetoIdeia,
  type Projeto,
  type ProjetoStatus,
  type ProjetoTipo,
} from "@/types/projeto";
import { SERVICO_SLUG_LABEL, type ServicoSlug } from "@/types/servico";
import type { Cliente } from "@/types/cliente";
import { ClientePicker } from "./ClientePicker";
import { ClienteQuickForm } from "./ClienteQuickForm";
import { safeFetch, safeJsonPost } from "@/lib/safe-fetch";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/components/ui/confirm-dialog";

type Props = {
  projeto?: Projeto;
  clientes?: Cliente[];
  onSaved?: (id: string) => void;
  onCancel?: () => void;
};

export function ProjetoForm({ projeto, clientes = [], onSaved, onCancel }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [titulo, setTitulo] = useState(projeto?.titulo ?? "");
  const [clienteId, setClienteId] = useState(projeto?.clienteId ?? "");
  const [clientesList, setClientesList] = useState<Cliente[]>(clientes);
  const [showQuickClient, setShowQuickClient] = useState(false);
  const [status, setStatus] = useState<ProjetoStatus>(projeto?.status ?? "proximo");
  const isIdeia = isProjetoIdeia(status);
  // Guarda o último estado de fluxo para repor quando se desmarca "Ideia".
  const prevFluxoRef = useRef<ProjetoStatus>(isIdeia ? "proximo" : status);
  function setIdeia(tipo: "ideia-interna" | "ideia-cliente" | null) {
    if (tipo === null) {
      setStatus(prevFluxoRef.current);
    } else {
      if (!isProjetoIdeia(status)) prevFluxoRef.current = status;
      setStatus(tipo);
    }
  }
  const [tipos, setTipos] = useState<string[]>(
    projeto?.tipos && projeto.tipos.length > 0
      ? projeto.tipos
      : projeto?.tipo
        ? [projeto.tipo]
        : []
  );
  const [customTipos, setCustomTipos] = useState<ProjetoTipoCustom[]>([]);
  // Tipos base removidos nas Definições — escondidos do picker (mas mantidos
  // se já estiverem seleccionados neste projecto).
  const [baseRemovidos, setBaseRemovidos] = useState<string[]>([]);
  const [categoria, setCategoria] = useState<ServicoSlug | null>(projeto?.categoria ?? null);
  const [prazo, setPrazo] = useState(projeto?.prazo ?? "");
  const [garantiaAte, setGarantiaAte] = useState(projeto?.garantiaAte ?? "");
  const [proximaAccao, setProximaAccao] = useState(projeto?.proximaAccao ?? "");
  const [notasResumo, setNotasResumo] = useState(projeto?.notasResumo ?? "");

  useEffect(() => {
    let cancelled = false;
    safeFetch<{ custom: ProjetoTipoCustom[]; baseRemovidos: string[] }>(
      "/api/projeto-tipos-custom"
    ).then((res) => {
      if (cancelled || !res.ok) return;
      if (Array.isArray(res.data.custom)) setCustomTipos(res.data.custom);
      if (Array.isArray(res.data.baseRemovidos)) setBaseRemovidos(res.data.baseRemovidos);
    });
    return () => { cancelled = true; };
  }, []);

  function toggleTipo(slug: string, cat: ServicoSlug) {
    const active = tipos.includes(slug);
    if (active) {
      setTipos((prev) => prev.filter((x) => x !== slug));
    } else {
      setTipos((prev) => [...prev, slug]);
      if (!categoria) {
        const auto = TIPO_TO_CATEGORIA[slug as import("@/types/projeto").ProjetoTipo] ?? cat;
        setCategoria(auto);
      }
    }
  }

  function handleClienteCreated(c: Cliente) {
    setClientesList((prev) => [...prev, c]);
    setClienteId(c.id);
    setShowQuickClient(false);
  }

  // Compõe um título dos campos preenchidos: {Tipo} {objeto} — {Cliente}.
  // Tipo = primeiro seleccionado ("Website" para web); objeto = hardware.modelo;
  // cliente = nome seleccionado. Sem IA.
  function tituloSugerido(): string {
    const tipoSlug = tipos[0];
    let tipoLabel = "";
    if (tipoSlug) {
      tipoLabel =
        tipoSlug === "web"
          ? "Website"
          : PROJETO_TIPO_LABEL[tipoSlug as ProjetoTipo] ??
            customTipos.find((c) => c.slug === tipoSlug)?.label ??
            tipoSlug;
    }
    const objeto = projeto?.hardware?.modelo?.trim() ?? "";
    // Cliente vazio -> sem cliente. Só recorre ao clienteNome do projecto se o
    // cliente seleccionado for o mesmo do projecto (evita meter no título um
    // cliente que foi removido/trocado).
    const cliente = !clienteId
      ? ""
      : clientesList.find((c) => c.id === clienteId)?.nome ??
        (clienteId === projeto?.clienteId ? projeto?.clienteNome ?? "" : "");
    const esquerda = [tipoLabel, objeto].filter(Boolean).join(" ");
    if (!esquerda) return cliente;
    return cliente ? `${esquerda} — ${cliente}` : esquerda;
  }

  async function gerarTitulo() {
    const sugestao = tituloSugerido();
    if (!sugestao) {
      toast({
        title: "Preenche o tipo ou o cliente primeiro",
        variant: "destructive",
      });
      return;
    }
    const actual = titulo.trim();
    if (actual && actual !== sugestao) {
      const ok = await confirm({
        title: "Substituir o título?",
        description: `«${actual}» → «${sugestao}»`,
        confirmLabel: "Substituir",
      });
      if (!ok) return;
    }
    setTitulo(sugestao);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const selectedCliente = clientesList.find((c) => c.id === clienteId);
    const showGarantia = status === "terminado" || status === "fechado";

    const payload = {
      id: projeto?.id,
      titulo: titulo.trim(),
      clienteId: clienteId || null,
      clienteNome: selectedCliente?.nome ?? projeto?.clienteNome ?? null,
      status,
      categoria: categoria,
      // Campo legado: só aceita slugs BASE (z.enum no schema). Mandar aqui um
      // tipo personalizado dava 400 "Invalid payload" ao guardar. O servidor
      // deriva o mesmo valor de `tipos` — mandar null é seguro.
      tipo: firstBaseTipo(tipos),
      tipos: tipos.length > 0 ? tipos : null,
      prazo: prazo || null,
      proximaAccao: proximaAccao.trim() || null,
      notasResumo: notasResumo.trim() || null,
      garantiaAte: showGarantia ? (garantiaAte || null) : null,
    };

    const res = await safeJsonPost<{ id: string }>("/api/projetos/upsert", payload);
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error);
      toast({ title: "Erro a guardar projecto", description: res.error, variant: "destructive" });
      return;
    }

    toast({ title: "Projecto guardado", variant: "success" });
    startTransition(() => router.refresh());
    onSaved?.(res.data.id);
  }

  const isBusy = submitting || pending;

  return (
    <form onSubmit={onSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label htmlFor="titulo">Título *</Label>
          <button
            type="button"
            onClick={gerarTitulo}
            disabled={isBusy}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
          >
            <Wand2 className="h-3 w-3" aria-hidden="true" />
            Gerar título
          </button>
        </div>
        <Input
          id="titulo"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          required
          maxLength={300}
          placeholder="Nome do projeto"
          disabled={isBusy}
        />
      </div>

      <div className="space-y-1">
        <Label>Estado *</Label>
        <Select
          value={isIdeia ? undefined : status}
          onValueChange={(v) => setStatus(v as ProjetoStatus)}
          disabled={isBusy || isIdeia}
        >
          <SelectTrigger>
            <SelectValue placeholder={isIdeia ? "— (marcado como ideia)" : "Escolhe o estado"} />
          </SelectTrigger>
          <SelectContent>
            {PROJETO_STATUS_FLUXO.map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* Ideias: fora do fluxo. Marcar uma desliga o estado acima; o kanban
            (arrastar para as secções de Ideias) mexe no mesmo campo. */}
        <div className="flex flex-wrap gap-4 pt-1.5">
          <label className="inline-flex items-center gap-2 text-sm text-ink-soft cursor-pointer">
            <input
              type="checkbox"
              className="accent-ember"
              checked={status === "ideia-interna"}
              onChange={(e) => setIdeia(e.target.checked ? "ideia-interna" : null)}
              disabled={isBusy}
            />
            Ideia interna
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-ink-soft cursor-pointer">
            <input
              type="checkbox"
              className="accent-ember"
              checked={status === "ideia-cliente"}
              onChange={(e) => setIdeia(e.target.checked ? "ideia-cliente" : null)}
              disabled={isBusy}
            />
            Ideia de cliente
          </label>
        </div>
      </div>

      {/* Tipos — só selecção. Adicionar/remover tipos é em Definições. */}
      <div className="space-y-1.5">
        <Label>Serviço / Tipo</Label>
        <div className="rounded-md border border-border bg-muted/30 p-2.5 space-y-2">
          {(Object.keys(CATEGORIA_TIPOS) as ServicoSlug[]).map((cat) => {
            // Tipos base: esconde os removidos nas Definições, mas mantém os que
            // este projecto já tem seleccionados (para se poderem tirar).
            const baseTipos = CATEGORIA_TIPOS[cat].filter(
              (t) => !baseRemovidos.includes(t) || tipos.includes(t)
            );
            const extraTipos = customTipos.filter((c) => c.categoria === cat);
            if (baseTipos.length === 0 && extraTipos.length === 0) return null;
            const chipCls = (active: boolean) =>
              "text-[11px] px-2 py-0.5 rounded-full border transition-colors " +
              (active
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground");
            return (
              <div key={cat} className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground w-24 shrink-0">
                  {SERVICO_SLUG_LABEL[cat]}
                </span>
                {baseTipos.map((t) => (
                  <button
                    key={t}
                    type="button"
                    disabled={isBusy}
                    onClick={() => toggleTipo(t, cat)}
                    className={chipCls(tipos.includes(t))}
                  >
                    {PROJETO_TIPO_LABEL[t] ?? t}
                  </button>
                ))}
                {extraTipos.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    disabled={isBusy}
                    onClick={() => toggleTipo(c.slug, cat)}
                    className={chipCls(tipos.includes(c.slug))}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Para adicionar ou remover tipos, vai a Definições · Tipos de serviço.
        </p>
      </div>

      {/* Cliente + Prazo */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1 col-span-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="cliente">Cliente</Label>
            {!showQuickClient && (
              <button
                type="button"
                onClick={() => setShowQuickClient(true)}
                disabled={isBusy}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <UserPlus className="h-3 w-3" aria-hidden="true" />
                Criar novo
              </button>
            )}
          </div>
          {showQuickClient ? (
            <ClienteQuickForm
              onCreated={handleClienteCreated}
              onCancel={() => setShowQuickClient(false)}
            />
          ) : (
            <ClientePicker
              id="cliente"
              clientes={clientesList}
              value={clienteId}
              onChange={setClienteId}
              disabled={isBusy}
            />
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="prazo">Prazo</Label>
          <Input
            id="prazo"
            type="date"
            value={prazo ?? ""}
            onChange={(e) => setPrazo(e.target.value)}
            disabled={isBusy}
          />
        </div>
        {(status === "terminado" || status === "fechado") && (
          <div className="space-y-1">
            <Label htmlFor="garantiaAte">Garantia até</Label>
            <Input
              id="garantiaAte"
              type="date"
              value={garantiaAte ?? ""}
              onChange={(e) => setGarantiaAte(e.target.value)}
              disabled={isBusy}
            />
          </div>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="proximaAccao">Próxima acção</Label>
        <Input
          id="proximaAccao"
          value={proximaAccao}
          onChange={(e) => setProximaAccao(e.target.value)}
          maxLength={500}
          placeholder="O que falta fazer a seguir"
          disabled={isBusy}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="notas">Notas</Label>
        <Textarea
          id="notas"
          value={notasResumo}
          onChange={(e) => setNotasResumo(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="Detalhes adicionais"
          disabled={isBusy}
        />
      </div>

      {error && (
        <p role="alert" className="text-xs text-dune bg-dune/10 px-3 py-2 rounded-btn border border-dune/20">
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
          {projeto ? "Guardar" : "Criar projeto"}
        </Button>
      </div>
    </form>
  );
}
