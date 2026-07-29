"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Link2, MessageSquare, Plus, RefreshCw, Trash2, Globe, FolderUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { safeJsonPost, safeFetch } from "@/lib/safe-fetch";
import type { ProjetoLink } from "@/types/projeto";
import type { PortalComentario } from "@/types/portal";

export type SandboxResumo = { id: string; nome: string; entry: string; totalFicheiros: number };

type Props = {
  projetoId: string;
  portalAtivo: boolean;
  /** Token em claro (decifrado no servidor). null = portal antigo, sem token recuperável. */
  portalToken: string | null;
  links: ProjetoLink[];
  comentarios: PortalComentario[];
  sandboxes: SandboxResumo[];
};

export function PortalSection({
  projetoId,
  portalAtivo,
  portalToken,
  links,
  comentarios,
  sandboxes,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);
  const [tokenGerado, setTokenGerado] = useState<string | null>(null);
  const [novoLabel, setNovoLabel] = useState("");
  const [novoUrl, setNovoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const zipRef = useRef<HTMLInputElement>(null);

  const naoLidos = comentarios.filter((c) => !c.lidoEm).length;
  // O link fica SEMPRE visível: o token acabado de gerar (antes do refresh) ou o
  // que veio decifrado do servidor. O `origin` só existe no browser — resolvido
  // num efeito para não haver mismatch de hidratação.
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const token = tokenGerado ?? (portalAtivo ? portalToken : null);
  const linkCompleto = token ? `${origin}/p/${token}` : null;

  async function gerar() {
    if (portalAtivo) {
      const ok = await confirm({
        title: "Regenerar link do portal?",
        description: "O link antigo deixa de funcionar imediatamente.",
        confirmLabel: "Regenerar",
      });
      if (!ok) return;
    }
    setBusy(true);
    const res = await safeJsonPost<{ token: string }>("/api/projetos/portal", {
      projetoId,
      action: "gerar",
    });
    setBusy(false);
    if (!res.ok) {
      toast({ title: "Erro", description: res.error, variant: "destructive" });
      return;
    }
    setTokenGerado(res.data.token);
    router.refresh();
  }

  async function revogar() {
    const ok = await confirm({
      title: "Revogar o link do portal?",
      description: "O cliente deixa de conseguir aceder ao projecto.",
      confirmLabel: "Revogar",
      tone: "destructive",
    });
    if (!ok) return;
    setBusy(true);
    const res = await safeJsonPost("/api/projetos/portal", { projetoId, action: "revogar" });
    setBusy(false);
    if (!res.ok) {
      toast({ title: "Erro", description: res.error, variant: "destructive" });
      return;
    }
    setTokenGerado(null);
    router.refresh();
  }

  async function copiar() {
    if (!linkCompleto) return;
    await navigator.clipboard.writeText(linkCompleto);
    toast({ title: "Link copiado" });
  }

  async function addLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await safeJsonPost("/api/projetos/links", {
      projetoId,
      action: "add",
      label: novoLabel,
      url: novoUrl,
    });
    setBusy(false);
    if (!res.ok) {
      toast({ title: "Erro", description: res.error, variant: "destructive" });
      return;
    }
    setNovoLabel("");
    setNovoUrl("");
    router.refresh();
  }

  async function removeLink(linkId: string) {
    const res = await safeJsonPost("/api/projetos/links", { projetoId, action: "remove", linkId });
    if (!res.ok) {
      toast({ title: "Erro", description: res.error, variant: "destructive" });
      return;
    }
    router.refresh();
  }

  async function uploadZip(file: File) {
    if (!file.name.toLowerCase().endsWith(".zip")) {
      toast({ title: "Tem de ser um .zip", description: "Comprime a pasta do projeto num ZIP.", variant: "destructive" });
      return;
    }
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("projetoId", projetoId);
    fd.append("nome", file.name.replace(/\.zip$/i, ""));
    try {
      const res = await fetch("/api/projetos/sandbox", { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast({ title: "Erro ao carregar projeto", description: data.error ?? `HTTP ${res.status}`, variant: "destructive" });
        return;
      }
      toast({ title: "Projeto carregado ✓" });
      router.refresh();
    } catch {
      toast({ title: "Erro de rede ao carregar", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  async function removeSandbox(s: SandboxResumo) {
    const ok = await confirm({
      title: "Remover projeto do sandbox?",
      description: `"${s.nome}" (${s.totalFicheiros} ficheiros) deixa de estar acessível ao cliente.`,
      tone: "destructive",
    });
    if (!ok) return;
    const res = await safeFetch(`/api/projetos/sandbox/${s.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast({ title: "Erro ao remover", description: res.error, variant: "destructive" });
      return;
    }
    router.refresh();
  }

  async function marcarLido(comentarioId: string) {
    const res = await safeJsonPost("/api/projetos/comentarios", { comentarioId, projetoId });
    if (!res.ok) {
      toast({ title: "Erro", description: res.error, variant: "destructive" });
      return;
    }
    router.refresh();
  }

  return (
    <section className="card">
      {/* Cabeçalho: label + pill "N novo(s)" + Regenerar/Revogar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <div className="card-label" style={{ margin: 0 }}>
          <Globe className="ic" aria-hidden="true" />
          Portal do cliente
        </div>
        {naoLidos > 0 && (
          <span className="pill" style={{ background: "var(--ember)", color: "#fff" }}>
            {naoLidos} novo{naoLidos === 1 ? "" : "s"}
          </span>
        )}
        <span style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button type="button" className="btn-ghost" onClick={gerar} disabled={busy}>
            <RefreshCw style={{ width: 13, height: 13 }} aria-hidden="true" />
            {portalAtivo ? "Regenerar link" : "Gerar link"}
          </button>
          {portalAtivo && (
            <button type="button" className="btn-ghost" onClick={revogar} disabled={busy}>
              Revogar
            </button>
          )}
        </span>
      </div>

      {/* Caixa do portal — o link fica sempre aqui enquanto o portal estiver activo */}
      {linkCompleto ? (
        <div className="portal-box">
          <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
            Link do cliente (fica sempre aqui — envia por WhatsApp/email):
          </div>
          <span className="lnk">{linkCompleto}</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn-ghost" onClick={copiar}>
              Copiar link
            </button>
            <a
              className="btn-primary"
              href={`/p/${token}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "none" }}
            >
              Abrir portal ↗
            </a>
          </div>
        </div>
      ) : (
        <div className="portal-box">
          <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
            {portalAtivo
              ? "Portal activo, mas o link foi gerado antes de guardarmos a cópia cifrada — regenera para o voltares a ver aqui (o antigo deixa de funcionar)."
              : "Sem portal. Gera um link secreto e envia ao cliente por WhatsApp/email."}
          </div>
        </div>
      )}

      {/* Links de preview */}
      <div className="psub">
        <p className="plabel">Links de preview (Vercel/Pages)</p>
        {links.map((k) => (
          <div key={k.id} className="plink">
            <Link2 className="ic" aria-hidden="true" />
            <b>{k.label}</b>
            <a href={k.url} target="_blank" rel="noopener noreferrer">
              {k.url}
            </a>
            <button
              type="button"
              className="icon-mini"
              title="Remover"
              aria-label={`Remover ${k.label}`}
              onClick={() => removeLink(k.id)}
            >
              <Trash2 aria-hidden="true" />
            </button>
          </div>
        ))}
        <form onSubmit={addLink} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            className="in-sm"
            style={{ width: 170 }}
            placeholder="Nome (ex.: Protótipo v2)"
            value={novoLabel}
            onChange={(e) => setNovoLabel(e.target.value)}
          />
          <input
            className="in-sm"
            style={{ flex: 1, minWidth: 160 }}
            placeholder="https://…"
            value={novoUrl}
            onChange={(e) => setNovoUrl(e.target.value)}
          />
          <button
            type="submit"
            className="btn-ghost"
            disabled={busy || !novoLabel.trim() || !novoUrl.trim()}
          >
            <Plus style={{ width: 13, height: 13 }} aria-hidden="true" />
            Adicionar
          </button>
        </form>
      </div>

      {/* Projetos hospedados (sandbox multi-ficheiro) */}
      <div className="psub">
        <p className="plabel">
          <FolderUp style={{ width: 13, height: 13 }} aria-hidden="true" />
          Projetos hospedados (ZIP → aberto no site)
        </p>
        {sandboxes.map((s) => (
          <div key={s.id} className="plink">
            <Globe className="ic" aria-hidden="true" />
            <b>{s.nome}</b>
            <a
              href={`/api/portal/sandbox/${s.id}/${s.entry.split("/").map(encodeURIComponent).join("/")}`}
              target="_blank"
              rel="noopener noreferrer"
              title={`Abrir ${s.nome}`}
            >
              {s.totalFicheiros} fich. · {s.entry}
            </a>
            <button
              type="button"
              className="icon-mini"
              title="Remover"
              aria-label={`Remover ${s.nome}`}
              onClick={() => removeSandbox(s)}
            >
              <Trash2 aria-hidden="true" />
            </button>
          </div>
        ))}
        <input
          ref={zipRef}
          type="file"
          accept=".zip,application/zip,application/x-zip-compressed"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadZip(f);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          className="btn-ghost"
          onClick={() => zipRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} aria-hidden="true" />
          ) : (
            <FolderUp style={{ width: 14, height: 14 }} aria-hidden="true" />
          )}
          {uploading ? "A carregar…" : "Carregar projeto (.zip)"}
        </button>
        <p style={{ fontSize: 11.5, color: "var(--ink-mute)", margin: "6px 0 0" }}>
          Comprime a pasta do projeto (index.html + assets) num ZIP. Abre no site sem GitHub. Até 30MB.
        </p>
      </div>

      {/* Comentários do cliente */}
      {comentarios.length > 0 && (
        <div className="psub">
          <p className="plabel">
            <MessageSquare style={{ width: 13, height: 13 }} aria-hidden="true" />
            Comentários do cliente
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {comentarios.map((c) => (
              <div key={c.id} className={cn("pcom", c.lidoEm && "lido")}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontSize: 11.5, color: "var(--ink-mute)" }}>
                    <b style={{ color: "var(--ink)" }}>{c.autorNome ?? "Cliente"}</b>
                    {" · "}
                    {new Date(c.criadoEm).toLocaleString("pt-PT")}
                  </span>
                  {!c.lidoEm && (
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{ padding: "5px 12px" }}
                      onClick={() => marcarLido(c.id)}
                    >
                      Marcar lido
                    </button>
                  )}
                </div>
                <p style={{ margin: "6px 0 0", fontSize: 13.5, whiteSpace: "pre-wrap" }}>{c.texto}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
