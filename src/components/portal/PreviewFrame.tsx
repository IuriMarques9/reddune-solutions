"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  src: string;
  title: string;
  /**
   * html=true: mockup HTML nosso (não-confiável). É carregado via fetch pelo
   * componente pai (contexto de confiança, com token) e injectado por `srcdoc`
   * num iframe sandboxed — assim o token NUNCA entra no URL do iframe, logo um
   * script no mockup não o consegue ler de window.location nem exfiltrá-lo.
   */
  html?: boolean;
};

const frameCls =
  "w-full rounded-[20px] border border-dashed border-[rgba(90,14,14,0.20)] bg-white/55";

export function PreviewFrame({ src, title, html }: Props) {
  const [open, setOpen] = useState(false);
  const [full, setFull] = useState(false);
  const [doc, setDoc] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  // true = a Fullscreen API aceitou mesmo. Ver o listener de fullscreenchange.
  const entrouApiRef = useRef(false);

  async function abrir() {
    if (open) {
      sairFull();
      setOpen(false);
      return;
    }
    if (html && doc === null) {
      try {
        const res = await fetch(src);
        if (!res.ok) throw new Error(String(res.status));
        setDoc(await res.text());
      } catch {
        setErro("Não foi possível carregar a pré-visualização.");
        return;
      }
    }
    setOpen(true);
  }

  /**
   * Ecrã inteiro do CONTENTOR (este documento, de confiança) — não do iframe.
   * O mockup continua em `srcdoc` + sandbox, sem token no URL: o modelo de
   * ameaça não muda, só o tamanho da caixa. Por isso um mockup HTML pode ir a
   * ecrã inteiro apesar de nunca poder abrir em separador novo.
   *
   * O overlay `fixed inset-0` é o que garante o efeito: onde a Fullscreen API
   * não existe (Safari iOS), a pré-visualização ocupa na mesma o ecrã todo.
   */
  async function entrarFull() {
    setFull(true);
    try {
      await boxRef.current?.requestFullscreen?.();
      // Só a partir daqui é que um `fullscreenchange` nos diz respeito.
      entrouApiRef.current = true;
    } catch {
      // Sem API (ou negada) fica só o overlay — é suficiente.
    }
  }

  function sairFull() {
    entrouApiRef.current = false;
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    setFull(false);
  }

  // Sair pelo Esc / botão do browser tem de repor o layout normal — mas SÓ se
  // fomos nós a entrar em fullscreen e a chamada resolveu. Sem esta guarda, um
  // browser que recuse (ou saia logo a seguir) matava também o overlay e o
  // botão não fazia nada de nada.
  useEffect(() => {
    function onChange() {
      if (!document.fullscreenElement && entrouApiRef.current) {
        entrouApiRef.current = false;
        setFull(false);
      }
    }
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Esc no modo overlay (sem Fullscreen API o browser não trata do Esc).
  useEffect(() => {
    if (!full) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") sairFull();
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [full]);

  /**
   * Em ecrã inteiro isto vai para um portal em `document.body`. Obrigatório:
   * o card do portal é um `Reveal` com `transform`, e qualquer transform num
   * antepassado torna-se o bloco contentor de `position: fixed` — o overlay
   * ficava preso dentro do card em vez de cobrir o ecrã.
   * Custo: mudar de sítio no DOM recarrega o iframe (o `srcdoc` já está em
   * memória, não há pedido novo; só se perde o scroll interno).
   */
  const caixa = (
    <div
      ref={boxRef}
      className={cn(
        "mt-3.5",
        full && "fixed inset-0 z-[100] mt-0 flex flex-col gap-2 bg-cream p-3 sm:p-4"
      )}
    >
      {full && (
        <div className="flex shrink-0 items-center justify-between gap-3">
          <p className="truncate font-display text-sm font-semibold text-ink">{title}</p>
          <button
            type="button"
            onClick={sairFull}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[rgba(90,14,14,0.20)] px-3 py-1.5 text-[13px] font-semibold text-ember transition-colors hover:text-dune"
          >
            <Minimize2 className="h-3.5 w-3.5" aria-hidden="true" />
            Sair do ecrã inteiro
            {/* Sem teclado no telemóvel, a dica do Esc só faz sentido em ecrã grande. */}
            <span className="hidden text-ink-mute sm:inline">(Esc)</span>
          </button>
        </div>
      )}
      {html ? (
        <iframe
          srcDoc={doc ?? ""}
          title={title}
          sandbox="allow-scripts"
          className={cn(frameCls, full && "min-h-0 flex-1 rounded-[12px]")}
          style={full ? undefined : { height: "70vh" }}
        />
      ) : (
        <iframe
          src={src}
          title={title}
          // Cross-origin (PDF/link): sandbox sem allow-top-navigation impede
          // que um preview comprometido sequestre o separador do portal.
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          className={cn(frameCls, full && "min-h-0 flex-1 rounded-[12px]")}
          style={full ? undefined : { height: "62vh" }}
        />
      )}
    </div>
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3.5">
        <button
          type="button"
          onClick={abrir}
          // py-2/-my-2: alvo de toque de ~37px no telemóvel sem mexer no layout
          // (o texto sozinho dava 20px, pequeno demais para o dedo).
          className="-my-2 py-2 text-sm font-semibold text-ember transition-colors hover:text-dune hover:underline"
        >
          {open ? "Fechar pré-visualização" : "Pré-visualizar aqui"}
        </button>
        {open && (
          <button
            type="button"
            onClick={entrarFull}
            className="-my-2 inline-flex items-center gap-1.5 py-2 text-[13.5px] text-ink-mute transition-colors hover:text-ink-soft hover:underline"
          >
            <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
            Ecrã inteiro
          </button>
        )}
        {/* HTML não-confiável NÃO abre top-level (levaria o token no URL). Só
            PDFs e links externos ganham "abrir em nova janela". */}
        {!html && (
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13.5px] text-ink-mute transition-colors hover:text-ink-soft hover:underline"
          >
            Abrir em nova janela ↗
          </a>
        )}
      </div>
      {erro && <p className="mt-2 text-sm text-dune">{erro}</p>}

      {open && (full ? createPortal(caixa, document.body) : caixa)}
    </div>
  );
}
