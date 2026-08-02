"use client";

import { useState, useRef, useCallback } from "react";
import imageCompression from "browser-image-compression";
import { Upload, X, Loader2, FileText, FileSpreadsheet, ImageIcon, File as FileIcon, BadgeEuro, type LucideIcon } from "lucide-react";
import { safeFetch, safeJsonPatch } from "@/lib/safe-fetch";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import type { ProjetoArquivo } from "@/types/projeto";

type Props = {
  projetoId: string;
  value: ProjetoArquivo[];
  onChange: (next: ProjetoArquivo[]) => void;
  disabled?: boolean;
};

type Pending = {
  id: string;
  name: string;
  status: "compressing" | "uploading" | "error";
  error?: string;
};

const COMPRESSION_OPTS = {
  maxSizeMB: 0.5,
  maxWidthOrHeight: 1600,
  useWebWorker: true,
  fileType: "image/webp" as const,
  initialQuality: 0.82,
};

const ACCEPT =
  "image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf," +
  "application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document," +
  "application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet," +
  "text/csv,text/plain";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function iconFor(tipo: string): LucideIcon {
  if (tipo.startsWith("image/")) return ImageIcon;
  if (tipo === "application/pdf" || tipo === "text/plain") return FileText;
  if (tipo.includes("spreadsheet") || tipo.includes("excel") || tipo === "text/csv") return FileSpreadsheet;
  if (tipo.includes("word")) return FileText;
  return FileIcon;
}

/** Chip de ficheiro — réplica do protótipo (borda 1px, radius 10, 8px 12px). */
const chipStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  border: "1px solid rgba(90,14,14,.1)",
  borderRadius: 10,
  padding: "8px 12px",
  fontSize: 13,
  background: "#fff",
};

export function ArquivosUploadZone({ projetoId, value, onChange, disabled }: Props) {
  const { toast } = useToast();
  const confirm = useConfirm();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pending, setPending] = useState<Pending[]>([]);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);

  // O cliente só vê o orçamento marcado MAIS RECENTE (mesma regra do portal-dto);
  // os outros marcados ficam aqui como histórico, com pill "antigo".
  const orcamentoAtualId =
    value.reduce<ProjetoArquivo | null>((melhor, a) => {
      if (a.categoria !== "orcamento" || a.origem === "cliente") return melhor;
      return !melhor || (a.dataUpload ?? "") >= (melhor.dataUpload ?? "") ? a : melhor;
    }, null)?.id ?? null;

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files);
      if (arr.length === 0) return;

      const uploaded: ProjetoArquivo[] = [];

      for (const original of arr) {
        const pid = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const isImg = original.type.startsWith("image/");
        setPending((prev) => [...prev, { id: pid, name: original.name, status: isImg ? "compressing" : "uploading" }]);

        try {
          let file = original;
          if (isImg) {
            const compressed = await imageCompression(original, COMPRESSION_OPTS);
            const base = original.name.replace(/\.[^.]+$/, "");
            file = new File([compressed], `${base}.webp`, { type: "image/webp" });
            setPending((prev) => prev.map((p) => (p.id === pid ? { ...p, status: "uploading" } : p)));
          }

          const fd = new FormData();
          fd.append("file", file);
          fd.append("projetoId", projetoId);

          const res = await fetch("/api/projetos/arquivo", { method: "POST", body: fd });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            const msg = data.error ?? `HTTP ${res.status}`;
            setPending((prev) => prev.map((p) => (p.id === pid ? { ...p, status: "error", error: msg } : p)));
            toast({ title: `Erro ao carregar ${original.name}`, description: msg, variant: "destructive" });
            continue;
          }

          const data = (await res.json()) as { arquivo: ProjetoArquivo };
          uploaded.push(data.arquivo);
          setPending((prev) => prev.filter((p) => p.id !== pid));
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Erro desconhecido";
          setPending((prev) => prev.map((p) => (p.id === pid ? { ...p, status: "error", error: msg } : p)));
          toast({ title: `Erro ao processar ${original.name}`, description: msg, variant: "destructive" });
        }
      }

      if (uploaded.length > 0) onChange([...value, ...uploaded]);
    },
    [onChange, value, toast, projetoId]
  );

  function onPick() {
    if (disabled) return;
    inputRef.current?.click();
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      e.target.value = "";
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  }

  async function toggleOrcamento(arquivo: ProjetoArquivo) {
    const proxima = arquivo.categoria === "orcamento" ? null : ("orcamento" as const);
    setMarkingId(arquivo.id);
    // arquivo.url já traz /api/projetos/arquivo/<id>?projetoId=… (como o DELETE)
    const res = await safeJsonPatch(arquivo.url, { categoria: proxima });
    setMarkingId(null);
    if (!res.ok) {
      toast({ title: "Erro ao marcar", description: res.error, variant: "destructive" });
      return;
    }
    onChange(value.map((a) => (a.id === arquivo.id ? { ...a, categoria: proxima } : a)));
    toast({
      title: proxima === "orcamento" ? "Marcado como orçamento ✓" : "Deixou de ser orçamento",
      description:
        proxima === "orcamento"
          ? "Aparece destacado ao cliente no topo do portal."
          : undefined,
    });
  }

  async function removeArquivo(arquivo: ProjetoArquivo) {
    const ok = await confirm({
      title: "Remover ficheiro?",
      description: "Esta ação apaga o ficheiro permanentemente.",
      tone: "destructive",
    });
    if (!ok) return;
    setRemovingId(arquivo.id);
    const res = await safeFetch(arquivo.url, { method: "DELETE" });
    setRemovingId(null);
    if (!res.ok) {
      toast({ title: "Erro ao remover", description: res.error, variant: "destructive" });
      return;
    }
    onChange(value.filter((a) => a.id !== arquivo.id));
  }

  return (
    // A zona inteira aceita drag-and-drop (o realce aparece ao arrastar por cima).
    <div
      onDrop={onDrop}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragOver(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setDragOver(false);
      }}
      style={
        dragOver
          ? { outline: "2px dashed var(--ember)", outlineOffset: 6, borderRadius: 12 }
          : undefined
      }
    >
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        {value.map((arquivo) => {
          const Icon = iconFor(arquivo.tipo);
          const ehOrcamento = arquivo.categoria === "orcamento";
          const ehAtual = ehOrcamento && arquivo.id === orcamentoAtualId;
          return (
            <div
              key={arquivo.id}
              style={{
                ...chipStyle,
                ...(ehAtual ? { borderColor: "rgba(214,66,42,.45)" } : null),
              }}
            >
              <Icon
                style={{ width: 14, height: 14, color: "var(--ink-mute)", flexShrink: 0 }}
                aria-hidden="true"
              />
              <a
                href={arquivo.url}
                target="_blank"
                rel="noopener noreferrer"
                title={`Abrir ${arquivo.nome} (${formatBytes(arquivo.tamanho)})`}
                style={{ color: "var(--ink)", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              >
                {arquivo.nome}
              </a>
              {/* Marcar/desmarcar orçamento — só ficheiros nossos (a API bloqueia os do cliente) */}
              {arquivo.origem !== "cliente" && (
                <button
                  type="button"
                  onClick={() => toggleOrcamento(arquivo)}
                  disabled={disabled || markingId === arquivo.id}
                  aria-pressed={ehOrcamento}
                  aria-label={
                    ehOrcamento
                      ? `Desmarcar ${arquivo.nome} como orçamento`
                      : `Marcar ${arquivo.nome} como orçamento`
                  }
                  title={
                    ehAtual
                      ? "Orçamento atual — é este que o cliente vê destacado. Carrega para desmarcar."
                      : ehOrcamento
                        ? "Versão antiga — o cliente não a vê, fica como histórico. Carrega para desmarcar."
                        : "Marcar como orçamento — aparece destacado ao cliente no portal"
                  }
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 10.5,
                    textTransform: "uppercase",
                    letterSpacing: ".08em",
                    padding: "2px 7px",
                    borderRadius: 999,
                    border: "none",
                    cursor: "pointer",
                    flexShrink: 0,
                    background: ehAtual
                      ? "var(--ember)"
                      : ehOrcamento
                        ? "rgba(214,66,42,.12)"
                        : "rgba(90,14,14,.08)",
                    color: ehAtual ? "#fff" : ehOrcamento ? "var(--ember)" : "var(--ink-mute)",
                  }}
                >
                  {markingId === arquivo.id ? (
                    <Loader2 className="animate-spin" style={{ width: 11, height: 11 }} aria-hidden="true" />
                  ) : (
                    <BadgeEuro style={{ width: 11, height: 11 }} aria-hidden="true" />
                  )}
                  {ehOrcamento && !ehAtual ? "Orç. antigo" : "Orçamento"}
                </button>
              )}
              {arquivo.origem === "cliente" && (
                <span
                  title="Enviado pelo cliente no portal"
                  style={{
                    fontSize: 10.5,
                    textTransform: "uppercase",
                    letterSpacing: ".08em",
                    padding: "2px 7px",
                    borderRadius: 999,
                    background: "rgba(214,66,42,.12)",
                    color: "var(--ember)",
                    flexShrink: 0,
                  }}
                >
                  cliente
                </span>
              )}
              <button
                type="button"
                className="icon-mini"
                onClick={() => removeArquivo(arquivo)}
                disabled={disabled || removingId === arquivo.id}
                aria-label={`Remover ${arquivo.nome}`}
                title="Remover"
              >
                {removingId === arquivo.id ? (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                ) : (
                  <X aria-hidden="true" />
                )}
              </button>
            </div>
          );
        })}

        {pending.map((p) => (
          <div
            key={p.id}
            style={{
              ...chipStyle,
              borderColor: p.status === "error" ? "rgba(214,66,42,.4)" : "rgba(90,14,14,.1)",
            }}
          >
            {p.status !== "error" ? (
              <Loader2
                className="animate-spin"
                style={{ width: 14, height: 14, color: "var(--ember)", flexShrink: 0 }}
                aria-hidden="true"
              />
            ) : (
              <X style={{ width: 14, height: 14, color: "var(--ember)", flexShrink: 0 }} aria-hidden="true" />
            )}
            <span style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {p.name}
            </span>
            <span style={{ fontSize: 11.5, color: "var(--ink-mute)" }}>
              {p.status === "compressing" ? "A comprimir…" : p.status === "uploading" ? "A enviar…" : p.error ?? "Erro"}
            </span>
          </div>
        ))}

        <button type="button" className="btn-ghost" onClick={onPick} disabled={disabled}>
          <Upload style={{ width: 14, height: 14 }} aria-hidden="true" />
          Carregar
        </button>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          onChange={onInputChange}
          disabled={disabled}
          className="hidden"
        />
      </div>

      <p style={{ fontSize: 11.5, color: "var(--ink-mute)", margin: "8px 0 0" }}>
        {value.length === 0 && pending.length === 0 ? "Sem ficheiros anexados. " : ""}
        Arrasta ficheiros para aqui ou usa Carregar — PDF, documentos ou imagens até 10MB (imagens são comprimidas).
      </p>
    </div>
  );
}
