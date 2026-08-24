"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, X, Pencil, Globe, ChevronUp, Copy, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Topbar } from "@/components/painel/Topbar";
import {
  SERVICO_EXTRAS,
  SERVICO_GRUPO_LABEL,
  SERVICO_SLUG,
  SERVICO_SLUG_LABEL,
  formatPreco,
  isExtra,
  type PrecoTipo,
  type Servico,
  type ServicoGrupo,
  type VariantePreco,
} from "@/types/servico";
import { parseMoney } from "@/lib/parse-number";
import { tokenSugerido } from "@/lib/preco-tokens";
import { safeJsonPost, safeDelete } from "@/lib/safe-fetch";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { ImageUploadZone } from "./ImageUploadZone";

type Props = {
  servicos: Servico[];
};

type VarianteDraft = { label: string; labelEn: string; preco: string; precoMax: string };

type Draft = {
  /** Chave estável por-draft (cliente). Independente do índice e do id da BD. */
  key: string;
  id: string | null;
  slug: ServicoGrupo;
  titulo: string;
  tituloEn: string;
  descricao: string;
  descricaoEn: string;
  precoBase: string;
  precoMax: string;
  precoDesde: boolean;
  precoTipo: PrecoTipo;
  precoTexto: string; // preservado mas não editável (legacy)
  nota: string;
  notaEn: string;
  imageUrl: string;
  ordem: number;
  ativo: boolean;
  temVariantes: boolean;
  variantes: VarianteDraft[];
  dirty: boolean;
};

const DEFAULT_LABELS = ["Desktop", "Portátil", "Consola"];

/**
 * Extras prontos a criar — as taxas gerais que o texto do site já menciona
 * (nota dos serviços + FAQs de assistência). Os valores são os que estão hoje
 * escritos como fallback nos content JSON, por isso criar a linha não muda nada
 * no site: passa só a ser o painel a mandar no número.
 */
type ExtraPreset = {
  id: string;
  titulo: string;
  tituloEn: string;
  preco: string;
  precoTipo: PrecoTipo;
  nota: string;
  notaEn: string;
};

const EXTRAS_PRESETS: ExtraPreset[] = [
  {
    id: "urgencia",
    titulo: "Taxa de urgência (<48h)",
    tituloEn: "Rush fee (<48h)",
    preco: "25",
    precoTipo: "eur",
    nota: "sob disponibilidade",
    notaEn: "subject to availability",
  },
  {
    id: "urgencia-web",
    titulo: "Taxa de urgência web",
    tituloEn: "Website rush fee",
    preco: "25",
    precoTipo: "percent",
    nota: "sobre o valor do orçamento",
    notaEn: "on the quoted price",
  },
  {
    id: "deslocacao",
    titulo: "Deslocação ao domicílio",
    tituloEn: "On-site call-out",
    preco: "0.8",
    precoTipo: "eur",
    nota: "por km, a partir da Fuseta",
    notaEn: "per km, from Fuseta",
  },
];

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/**
 * Token pronto a colar nos content JSON, com o preço actual como fallback.
 * `outrosTitulos` = títulos das outras linhas, para o label esticar quando a
 * palavra colide ("urgência" → "urgência web").
 */
function tokenDoDraft(d: Draft, outrosTitulos: string[]): string {
  const nums = [
    ...(d.precoBase.trim() ? [parseMoney(d.precoBase)] : []),
    ...(d.temVariantes ? d.variantes.map((v) => parseMoney(v.preco)) : []),
  ].filter((n): n is number => n != null && Number.isFinite(n));
  return tokenSugerido(
    d.titulo,
    nums.length > 0 ? Math.min(...nums) : null,
    "pt",
    d.precoTipo,
    outrosTitulos,
  );
}

let keySeq = 0;
function genKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  keySeq += 1;
  return `draft_${Date.now()}_${keySeq}`;
}

function toDraft(s: Servico): Draft {
  const temVariantes = !!(s.variantes && s.variantes.length > 0);
  return {
    key: genKey(),
    id: s.id,
    slug: s.slug,
    titulo: s.titulo,
    tituloEn: s.tituloI18n?.en ?? "",
    descricao: s.descricao ?? "",
    descricaoEn: s.descricaoI18n?.en ?? "",
    precoBase: s.precoBase != null ? String(s.precoBase) : "",
    precoMax: s.precoMax != null ? String(s.precoMax) : "",
    precoDesde: s.precoDesde ?? false,
    precoTipo: s.precoTipo ?? "eur",
    precoTexto: s.precoTexto ?? "",
    nota: s.nota ?? "",
    notaEn: s.notaI18n?.en ?? "",
    imageUrl: s.imageUrl ?? "",
    ordem: s.ordem,
    ativo: s.ativo,
    temVariantes,
    variantes: temVariantes
      ? s.variantes!.map((v) => ({
          label: v.label,
          labelEn: v.labelI18n?.en ?? "",
          preco: String(v.preco),
          precoMax: v.precoMax != null ? String(v.precoMax) : "",
        }))
      : [],
    dirty: false,
  };
}

function emptyDraft(slug: ServicoGrupo, ordem: number, preset?: Partial<Draft>): Draft {
  return {
    key: genKey(),
    id: null,
    slug,
    titulo: "",
    tituloEn: "",
    descricao: "",
    descricaoEn: "",
    precoBase: "",
    precoMax: "",
    precoDesde: false,
    precoTipo: "eur",
    precoTexto: "",
    nota: "",
    notaEn: "",
    imageUrl: "",
    ordem,
    ativo: true,
    temVariantes: false,
    variantes: [],
    dirty: true,
    ...preset,
  };
}

/** Preço display da linha `.svc` ("desde 15€", "25€ a 60€", "Sob consulta"), via formatPreco. */
function draftPreco(d: Draft): string {
  if (d.precoTipo === "percent") {
    const n = d.precoBase.trim() ? parseMoney(d.precoBase) : null;
    return n != null && Number.isFinite(n)
      ? `+${String(n).replace(".", ",")}%`
      : "Sob consulta";
  }
  const precoBase = d.precoBase.trim() ? parseMoney(d.precoBase) : null;
  const precoMax = d.precoMax.trim() ? parseMoney(d.precoMax) : null;
  const variantes: VariantePreco[] | null =
    d.temVariantes && d.variantes.length > 0
      ? d.variantes.map((v) => ({
          label: v.label,
          preco: parseMoney(v.preco) ?? 0,
          precoMax: v.precoMax.trim() ? parseMoney(v.precoMax) : null,
        }))
      : null;
  const html = formatPreco({
    precoBase: precoBase != null && Number.isFinite(precoBase) ? precoBase : null,
    precoMax: precoMax != null && Number.isFinite(precoMax) ? precoMax : null,
    precoDesde: d.precoDesde,
    variantes,
    precoTexto: d.precoTexto || null,
    precoTextoI18n: null,
    nota: null,
    notaI18n: null,
  });
  return html.replace(/<\/?b>/g, "");
}

export function ServicosEditor({ servicos }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [, startTransition] = useTransition();
  const [items, setItems] = useState<Draft[]>(servicos.map(toDraft));
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set());
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fecha o menu "Novo serviço" ao clicar fora.
  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  function setCardError(key: string, msg: string | null) {
    setErrors((prev) => {
      if (msg == null) {
        if (!(key in prev)) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: msg };
    });
  }

  function toggleOpen(key: string) {
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function update(key: string, patch: Partial<Draft>) {
    setItems((prev) =>
      prev.map((d) => (d.key === key ? { ...d, ...patch, dirty: true } : d))
    );
  }

  function updateVariante(key: string, vIdx: number, patch: Partial<VarianteDraft>) {
    setItems((prev) =>
      prev.map((d) => {
        if (d.key !== key) return d;
        const next = [...d.variantes];
        next[vIdx] = { ...next[vIdx]!, ...patch };
        return { ...d, variantes: next, dirty: true };
      })
    );
  }

  function addVariante(key: string) {
    setItems((prev) =>
      prev.map((d) => {
        if (d.key !== key) return d;
        const label = DEFAULT_LABELS[d.variantes.length] ?? "";
        return {
          ...d,
          variantes: [...d.variantes, { label, labelEn: "", preco: "", precoMax: "" }],
          dirty: true,
        };
      })
    );
  }

  function removeVariante(key: string, vIdx: number) {
    setItems((prev) =>
      prev.map((d) => {
        if (d.key !== key) return d;
        return { ...d, variantes: d.variantes.filter((_, j) => j !== vIdx), dirty: true };
      })
    );
  }

  function toggleVariantes(key: string, on: boolean) {
    setItems((prev) =>
      prev.map((d) => {
        if (d.key !== key) return d;
        if (on && d.variantes.length === 0) {
          // Seed com 2 variantes default
          return {
            ...d,
            temVariantes: true,
            variantes: [
              { label: "Desktop", labelEn: "Desktop", preco: "", precoMax: "" },
              { label: "Portátil", labelEn: "Laptop", preco: "", precoMax: "" },
            ],
            dirty: true,
          };
        }
        return { ...d, temVariantes: on, dirty: true };
      })
    );
  }

  function addNovo(slug: ServicoGrupo, preset?: Partial<Draft>) {
    const ordem = items.filter((d) => d.slug === slug).length;
    const draft = emptyDraft(slug, ordem, preset);
    setItems((prev) => [...prev, draft]);
    setOpenKeys((prev) => new Set(prev).add(draft.key));
  }

  function addExtra(preset?: ExtraPreset) {
    addNovo(
      SERVICO_EXTRAS,
      preset
        ? {
            titulo: preset.titulo,
            tituloEn: preset.tituloEn,
            precoBase: preset.preco,
            precoTipo: preset.precoTipo,
            nota: preset.nota,
            notaEn: preset.notaEn,
          }
        : undefined,
    );
  }

  /** Títulos das outras linhas — desambiguam o label do token. */
  function outrosTitulos(d: Draft): string[] {
    return items.filter((it) => it.key !== d.key).map((it) => it.titulo);
  }

  /** Preset já criado? Compara títulos completos (nos dois sentidos). */
  function presetJaExiste(preset: ExtraPreset): boolean {
    const alvo = norm(preset.titulo);
    return items.some((d) => {
      if (!isExtra(d.slug)) return false;
      const t = norm(d.titulo);
      return t.includes(alvo) || (t.length > 0 && alvo.includes(t));
    });
  }

  async function save(key: string) {
    const d = items.find((it) => it.key === key);
    if (!d) return;
    if (!d.titulo.trim()) {
      setCardError(d.key, "Título obrigatório.");
      return;
    }

    let variantesPayload: VariantePreco[] | null = null;
    if (d.temVariantes && d.variantes.length > 0) {
      const parsed: VariantePreco[] = [];
      for (const v of d.variantes) {
        if (!v.label.trim()) {
          setCardError(d.key, "Todas as variantes precisam de um label.");
          return;
        }
        const n = parseMoney(v.preco);
        if (n == null || n < 0) {
          setCardError(d.key, `Preço inválido na variante "${v.label}".`);
          return;
        }
        const nMax = v.precoMax.trim() ? parseMoney(v.precoMax) : null;
        parsed.push({
          label: v.label.trim(),
          labelI18n: v.labelEn.trim() ? { pt: v.label.trim(), en: v.labelEn.trim() } : null,
          preco: n,
          precoMax: nMax ?? null,
        });
      }
      variantesPayload = parsed;
    }

    setSavingKey(d.key);
    setCardError(d.key, null);
    try {
      const precoBase = d.precoBase.trim() ? parseMoney(d.precoBase) : null;
      const precoMax = d.precoMax.trim() ? parseMoney(d.precoMax) : null;
      const tituloEn = d.tituloEn.trim();
      const descricaoEn = d.descricaoEn.trim();
      const notaEn = d.notaEn.trim();
      const payload = {
        id: d.id ?? undefined,
        slug: d.slug,
        titulo: d.titulo.trim(),
        tituloI18n: tituloEn ? { pt: d.titulo.trim(), en: tituloEn } : null,
        descricao: d.descricao.trim() || null,
        descricaoI18n: descricaoEn ? { pt: d.descricao.trim() || null, en: descricaoEn } : null,
        notaI18n: notaEn ? { pt: d.nota.trim() || null, en: notaEn } : null,
        precoBase:
          variantesPayload
            ? null
            : precoBase != null && Number.isFinite(precoBase) ? precoBase : null,
        precoMax:
          variantesPayload || d.precoTipo === "percent"
            ? null
            : precoMax != null && Number.isFinite(precoMax) ? precoMax : null,
        precoDesde: !variantesPayload && d.precoTipo !== "percent" && d.precoDesde,
        precoTipo: d.precoTipo,
        variantes: variantesPayload,
        // Larga o `precoTexto` legacy: não é editável aqui, não traduz e ganhava
        // precedência ao "Sob consulta". Guardar a linha migra-a. Ver aviso no card.
        precoTexto: null,
        precoTextoI18n: null,
        nota: d.nota.trim() || null,
        imageUrl: d.imageUrl.trim() || null,
        ordem: d.ordem,
        // Um extra nunca é renderizado (a página filtra por slug), por isso o
        // flag não decide nada — fica sempre activo para não haver linhas
        // "desligadas" a alimentar texto sem se perceber porquê.
        ativo: isExtra(d.slug) ? true : d.ativo,
      };
      const res = await safeJsonPost<{ id: string }>("/api/servicos/upsert", payload);
      if (!res.ok) {
        setCardError(d.key, res.error);
        toast({ title: "Erro a guardar serviço", description: res.error, variant: "destructive" });
        return;
      }
      setItems((prev) =>
        prev.map((it) => (it.key === d.key ? { ...it, id: res.data.id, dirty: false } : it))
      );
      startTransition(() => router.refresh());
    } finally {
      setSavingKey(null);
    }
  }

  async function remove(key: string) {
    const d = items.find((it) => it.key === key);
    if (!d) return;
    if (d.id) {
      const ok = await confirm({
        title: `Apagar "${d.titulo}"?`,
        description: isExtra(d.slug)
          ? "Os tokens {{preco:…}} que apontam para este extra passam a mostrar o valor escrito no ficheiro de conteúdo."
          : "Remove este serviço da página pública /servicos.",
        confirmLabel: "Apagar",
        tone: "destructive",
      });
      if (!ok) return;
      const res = await safeDelete(`/api/servicos/${encodeURIComponent(d.id)}`);
      if (!res.ok) {
        toast({ title: "Erro a apagar serviço", description: res.error, variant: "destructive" });
        return;
      }
    }
    setCardError(d.key, null);
    setItems((prev) => prev.filter((it) => it.key !== d.key));
    setOpenKeys((prev) => {
      const next = new Set(prev);
      next.delete(d.key);
      return next;
    });
    startTransition(() => router.refresh());
  }

  function renderEditor(d: Draft) {
    const key = d.key;
    const extra = isExtra(d.slug);
    // Extras chegam a cêntimos (deslocação a 0,80€/km); as categorias são a euro
    // inteiro e o spinner de 0,01 só atrapalhava.
    const precoStep = extra ? "0.01" : "1";
    const precoMode = extra ? ("decimal" as const) : ("numeric" as const);
    return (
      <div className="rounded-md border border-border-strong bg-surface-elevated p-3 space-y-3" style={{ margin: "0 0 9px", background: "var(--sand-warm)" }}>
        {/* Linha 1: Título / Ordem / Activo */}
        <div className="grid grid-cols-12 gap-2">
          <div className="col-span-12 sm:col-span-8 space-y-1">
            <Label className="text-[10px] uppercase font-semibold text-foreground/80 tracking-wide">Título (PT) *</Label>
            <Input
              value={d.titulo}
              onChange={(e) => update(key, { titulo: e.target.value })}
              className="h-8 text-base font-medium border-border-strong bg-background"
            />
            <Label className="text-[10px] uppercase font-semibold text-foreground/60 tracking-wide pt-1">Título (EN)</Label>
            <Input
              value={d.tituloEn}
              onChange={(e) => update(key, { tituloEn: e.target.value })}
              placeholder="English title (deixa vazio p/ usar PT)"
              className="h-8 text-sm border-border-strong bg-background"
            />
          </div>
          <div className="col-span-6 sm:col-span-2 space-y-1">
            <Label className="text-[10px] uppercase font-semibold text-foreground/80 tracking-wide">Ordem</Label>
            <Input
              type="number"
              step="1"
              min="0"
              value={d.ordem}
              onChange={(e) => update(key, { ordem: parseInt(e.target.value, 10) || 0 })}
              className="h-8 text-sm tabular-nums border-border-strong bg-background"
            />
          </div>
          {!extra && (
            <div className="col-span-6 sm:col-span-2 flex items-end justify-center">
              <label className="inline-flex items-center gap-1 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={d.ativo}
                  onChange={(e) => update(key, { ativo: e.target.checked })}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                Activo
              </label>
            </div>
          )}
        </div>

        {/* Bloco de preço: toggle variantes */}
        <div className="rounded border border-dashed border-border-strong bg-muted/50 p-2.5 space-y-2">
          <label className="inline-flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={d.temVariantes}
              onChange={(e) => toggleVariantes(key, e.target.checked)}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            <span className="font-medium">Tem variantes</span>
            <span className="text-muted-foreground">(ex: desktop / portátil / consola)</span>
          </label>

          {d.precoTexto.trim() && (
            <div className="rounded border border-amber-500/40 bg-amber-500/10 p-2 text-xs space-y-1">
              <p className="font-semibold text-amber-700 dark:text-amber-400">
                Preço antigo (não traduz para inglês)
              </p>
              <p className="text-foreground/80">
                Esta linha ainda mostra o texto livre{" "}
                <span className="font-mono font-semibold">«{d.precoTexto.trim()}»</span>, que fica
                sempre em português e sem o número a laranja.
              </p>
              <p className="text-foreground/80">
                <strong>Ao guardar, este texto é apagado.</strong> Preenche o preço (ou deixa vazio
                para dar <em>Sob consulta</em> / <em>On request</em>) e mete o resto na Nota PT + Nota
                EN aqui em baixo.
              </p>
            </div>
          )}

          {!d.temVariantes ? (
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-5 sm:col-span-3 space-y-1">
                <Label className="text-[10px] uppercase font-semibold text-foreground/80 tracking-wide">
                  {extra ? (d.precoTipo === "percent" ? "Taxa (%)" : "Preço (€)") : "Preço mín (€)"}
                </Label>
                <Input
                  type="number"
                  inputMode={precoMode}
                  step={precoStep}
                  min="0"
                  value={d.precoBase}
                  onChange={(e) => update(key, { precoBase: e.target.value })}
                  placeholder="—"
                  className="h-8 text-sm tabular-nums border-border-strong bg-background"
                />
                {extra && (
                  <div className="flex gap-1 pt-1" role="radiogroup" aria-label="Unidade do preço">
                    {(["eur", "percent"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        role="radio"
                        aria-checked={d.precoTipo === t}
                        onClick={() => update(key, { precoTipo: t })}
                        className={
                          "h-6 px-2 rounded border text-[11px] font-mono " +
                          (d.precoTipo === t
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border-strong bg-background text-muted-foreground")
                        }
                      >
                        {t === "eur" ? "€" : "% do orçamento"}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {d.precoTipo !== "percent" && (
                <div className="col-span-5 sm:col-span-3 space-y-1">
                  <Label className="text-[10px] uppercase font-semibold text-foreground/80 tracking-wide">Preço máx (€)</Label>
                  <Input
                    type="number"
                    inputMode={precoMode}
                    step={precoStep}
                    min="0"
                    value={d.precoMax}
                    onChange={(e) => update(key, { precoMax: e.target.value })}
                    placeholder="opcional"
                    className="h-8 text-sm tabular-nums border-border-strong bg-background"
                  />
                </div>
              )}
              <div className="col-span-12 sm:col-span-6 space-y-1">
                <Label className="text-[10px] uppercase font-semibold text-foreground/80 tracking-wide">Nota PT (sufixo)</Label>
                <Input
                  value={d.nota}
                  onChange={(e) => update(key, { nota: e.target.value })}
                  placeholder="ex: abatido se reparares"
                  className="h-8 text-sm border-border-strong bg-background"
                />
                <Label className="text-[10px] uppercase font-semibold text-foreground/60 tracking-wide pt-1">Nota EN</Label>
                <Input
                  value={d.notaEn}
                  onChange={(e) => update(key, { notaEn: e.target.value })}
                  placeholder="e.g. waived if you repair"
                  className="h-8 text-sm border-border-strong bg-background"
                />
              </div>
              {d.precoTipo !== "percent" && (
                <div className="col-span-12 flex items-center gap-2 pt-1">
                  <label className="inline-flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={d.precoDesde}
                      onChange={(e) => update(key, { precoDesde: e.target.checked })}
                      className="h-4 w-4 rounded border-border accent-primary"
                    />
                    <span>Mostrar como <b>desde X€</b> (máximo indefinido)</span>
                  </label>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="space-y-1.5">
                {d.variantes.map((v, vIdx) => (
                  <div key={vIdx} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-12 sm:col-span-4 space-y-1">
                      <Label className="text-[10px] uppercase font-semibold text-foreground/80 tracking-wide">Label PT</Label>
                      <Input
                        value={v.label}
                        onChange={(e) => updateVariante(key, vIdx, { label: e.target.value })}
                        placeholder="Portátil"
                        className="h-8 text-sm border-border-strong bg-background"
                      />
                      <Label className="text-[10px] uppercase font-semibold text-foreground/60 tracking-wide pt-1">Label EN</Label>
                      <Input
                        value={v.labelEn}
                        onChange={(e) => updateVariante(key, vIdx, { labelEn: e.target.value })}
                        placeholder="Laptop"
                        className="h-8 text-sm border-border-strong bg-background"
                      />
                    </div>
                    <div className="col-span-5 sm:col-span-3 space-y-1">
                      <Label className="text-[10px] uppercase font-semibold text-foreground/80 tracking-wide">Mín (€)</Label>
                      <Input
                        type="number"
                        inputMode={precoMode}
                        step={precoStep}
                        min="0"
                        value={v.preco}
                        onChange={(e) => updateVariante(key, vIdx, { preco: e.target.value })}
                        className="h-8 text-sm tabular-nums border-border-strong bg-background"
                      />
                    </div>
                    <div className="col-span-5 sm:col-span-3 space-y-1">
                      <Label className="text-[10px] uppercase font-semibold text-foreground/80 tracking-wide">Máx (€)</Label>
                      <Input
                        type="number"
                        inputMode={precoMode}
                        step={precoStep}
                        min="0"
                        value={v.precoMax}
                        onChange={(e) => updateVariante(key, vIdx, { precoMax: e.target.value })}
                        placeholder="opcional"
                        className="h-8 text-sm tabular-nums border-border-strong bg-background"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-2 flex items-end justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeVariante(key, vIdx)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        aria-label="Remover variante"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => addVariante(key)}
                className="h-7 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" aria-hidden="true" />
                Adicionar variante
              </Button>
              <div className="space-y-1 pt-1">
                <Label className="text-[10px] uppercase font-semibold text-foreground/80 tracking-wide">Nota PT (sufixo)</Label>
                <Input
                  value={d.nota}
                  onChange={(e) => update(key, { nota: e.target.value })}
                  placeholder="opcional"
                  className="h-8 text-sm border-border-strong bg-background"
                />
                <Label className="text-[10px] uppercase font-semibold text-foreground/60 tracking-wide pt-1">Nota EN</Label>
                <Input
                  value={d.notaEn}
                  onChange={(e) => update(key, { notaEn: e.target.value })}
                  placeholder="optional"
                  className="h-8 text-sm border-border-strong bg-background"
                />
              </div>
            </div>
          )}
        </div>

        {/* Descrição */}
        <div className="space-y-1">
          <Label className="text-[10px] uppercase font-semibold text-foreground/80 tracking-wide">Descrição (PT)</Label>
          <Textarea
            value={d.descricao}
            onChange={(e) => update(key, { descricao: e.target.value })}
            rows={2}
            className="text-sm border-border-strong bg-background"
          />
          <Label className="text-[10px] uppercase font-semibold text-foreground/60 tracking-wide pt-1">Descrição (EN)</Label>
          <Textarea
            value={d.descricaoEn}
            onChange={(e) => update(key, { descricaoEn: e.target.value })}
            rows={2}
            placeholder="English description (vazio = usa PT)"
            className="text-sm border-border-strong bg-background"
          />
        </div>

        {/* Imagem — extras não têm card no site, logo não têm imagem. */}
        {!extra && (
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-semibold text-foreground/80 tracking-wide">Imagem</Label>
            <ImageUploadZone
              value={d.imageUrl ? [d.imageUrl] : []}
              onChange={(urls) => update(key, { imageUrl: urls[0] ?? "" })}
              disabled={savingKey === d.key}
              max={1}
            />
          </div>
        )}

        {/* Token — a única forma de um extra chegar ao site. */}
        {extra && (
          <div className="rounded border border-dashed border-border-strong bg-muted/50 p-2.5 space-y-1.5">
            <Label className="text-[10px] uppercase font-semibold text-foreground/80 tracking-wide">
              Como usar no texto do site
            </Label>
            <p className="text-xs text-foreground/80">
              Este extra não aparece em nenhuma tabela. Para o preço entrar numa FAQ, nota ou
              estatística, cola o token em <span className="font-mono">content/pt|en/servicos/*.json</span>{" "}
              — funciona em qualquer uma das três categorias. Se apagares a linha, fica o valor
              escrito depois do <span className="font-mono">|</span>.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 min-w-0 truncate rounded bg-background border border-border-strong px-2 py-1 font-mono text-xs">
                {tokenDoDraft(d, outrosTitulos(d))}
              </code>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs shrink-0"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(tokenDoDraft(d, outrosTitulos(d)));
                    toast({ title: "Token copiado" });
                  } catch {
                    toast({ title: "Não deu para copiar", description: tokenDoDraft(d, outrosTitulos(d)) });
                  }
                }}
              >
                <Copy className="h-3 w-3 mr-1" aria-hidden="true" />
                Copiar
              </Button>
            </div>
          </div>
        )}

        {errors[d.key] && (
          <p className="text-xs text-rose-600 bg-rose-500/10 border border-rose-500/20 rounded px-2 py-1">
            {errors[d.key]}
          </p>
        )}

        <div className="flex items-center justify-end gap-2">
          {d.dirty && (
            <Button
              size="sm"
              onClick={() => save(key)}
              disabled={savingKey === d.key}
            >
              {savingKey === d.key && (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" aria-hidden="true" />
              )}
              Guardar
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => remove(key)}
            disabled={savingKey === d.key}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </div>
      </div>
    );
  }

  /** Linha `.svc` — igual para categorias e extras. */
  function renderLinha(d: Draft) {
    const isOpen = openKeys.has(d.key);
    const nome = d.titulo.trim() || (isExtra(d.slug) ? "(novo extra)" : "(novo serviço)");
    return (
      <div key={d.key}>
        <div className="svc" style={isOpen ? { marginBottom: 6 } : undefined}>
          <div style={{ minWidth: 0 }}>
            <div className="s-name">
              {nome}
              {!d.ativo && !isExtra(d.slug) && (
                <span className="pill mute" style={{ marginLeft: 8, verticalAlign: "middle" }}>
                  Inativo
                </span>
              )}
              {d.dirty && (
                <span className="pill warm" style={{ marginLeft: 8, verticalAlign: "middle" }}>
                  Por guardar
                </span>
              )}
            </div>
            <div className="s-desc">
              {isExtra(d.slug) ? tokenDoDraft(d, outrosTitulos(d)) : d.descricao.trim() || "Sem descrição"}
            </div>
          </div>
          <span className="s-price">{draftPreco(d)}</span>
          <button
            type="button"
            className="s-edit"
            onClick={() => toggleOpen(d.key)}
            aria-expanded={isOpen}
            aria-label={isOpen ? `Fechar edição de ${nome}` : `Editar ${nome}`}
          >
            {isOpen ? (
              <ChevronUp className="ic" aria-hidden="true" />
            ) : (
              <Pencil className="ic" aria-hidden="true" />
            )}
          </button>
        </div>
        {isOpen && renderEditor(d)}
      </div>
    );
  }

  const extras = items.filter((d) => isExtra(d.slug));

  return (
    <>
      <Topbar
        crumbs={["Serviços"]}
        titleHtml="Serviços &amp; <em>preços</em>"
        actions={
          <div className="novo-menu" ref={menuRef}>
            <button
              type="button"
              className="btn-primary"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              <Plus className="ic" aria-hidden="true" /> Novo serviço
            </button>
            {menuOpen && (
              <div className="novo-pop" role="menu">
                {SERVICO_SLUG.map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      addNovo(s);
                      setMenuOpen(false);
                    }}
                  >
                    <Plus className="ic" aria-hidden="true" /> {SERVICO_SLUG_LABEL[s]}
                  </button>
                ))}
                <button
                  type="button"
                  role="menuitem"
                  style={{ borderTop: "1px solid rgba(90,14,14,.10)" }}
                  onClick={() => {
                    addExtra();
                    setMenuOpen(false);
                  }}
                >
                  <Plus className="ic" aria-hidden="true" /> Extra (todas as categorias)
                </button>
              </div>
            )}
          </div>
        }
      />

      <div className="note-strip">
        <Globe className="ic" aria-hidden="true" /> Alimenta a página /serviços do site público
      </div>

      {items.length === 0 && (
        <div className="empty">
          <div className="t">Ainda não há serviços</div>
          <div className="desc">Usa &quot;Novo serviço&quot; para adicionar o primeiro.</div>
        </div>
      )}

      {SERVICO_SLUG.map((slug) => {
        const group = items.filter((d) => d.slug === slug);
        if (group.length === 0) return null;
        return (
          <section key={slug} style={{ marginBottom: 22 }}>
            <p className="eyebrow">{SERVICO_SLUG_LABEL[slug]}</p>
            {group.map(renderLinha)}
          </section>
        );
      })}

      {/*
        Extras — taxas gerais (urgência, deslocação) que valem para as tres
        categorias e por isso não pertencem a nenhuma tabela. A secção está
        sempre visível, mesmo vazia: é o único sítio onde estas linhas se criam.
      */}
      <section style={{ marginBottom: 22 }}>
        <p className="eyebrow">{SERVICO_GRUPO_LABEL[SERVICO_EXTRAS]} · todas as categorias</p>
        <div className="note-strip" style={{ marginBottom: 10 }}>
          <Info className="ic" aria-hidden="true" /> Não entram na tabela pública — alimentam o
          texto (notas, FAQs, estatísticas) por token
        </div>

        {extras.length > 0 ? (
          extras.map(renderLinha)
        ) : (
          <div className="empty" style={{ marginBottom: 10 }}>
            <div className="t">Ainda não há extras</div>
            <div className="desc">
              Cria a taxa de urgência e a deslocação para o site passar a ler estes valores daqui
              em vez do que está escrito nos ficheiros de conteúdo.
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {EXTRAS_PRESETS.map((p) => {
            const jaExiste = presetJaExiste(p);
            return (
              <Button
                key={p.id}
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => addExtra(p)}
                disabled={jaExiste}
                title={jaExiste ? "Já existe uma linha com este nome" : undefined}
              >
                <Plus className="h-3 w-3 mr-1" aria-hidden="true" />
                {p.titulo}
              </Button>
            );
          })}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-muted-foreground"
            onClick={() => addExtra()}
          >
            <Plus className="h-3 w-3 mr-1" aria-hidden="true" />
            Extra em branco
          </Button>
        </div>
      </section>

    </>
  );
}
