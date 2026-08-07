"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Cliente } from "@/types/cliente";

const SEM_CLIENTE = "— Sem cliente —";

/** minúsculas e sem acentos — escrever "joao" tem de encontrar "João". */
function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

type Props = {
  clientes: Cliente[];
  /** id do cliente; "" = sem cliente */
  value: string;
  onChange: (clienteId: string) => void;
  disabled?: boolean;
  /** id do trigger, para o <Label htmlFor> */
  id?: string;
};

/**
 * ClientePicker — substitui o <Select> de cliente por um combobox com pesquisa.
 * Com dezenas de clientes, percorrer a lista à mão deixou de ser prático.
 * Pesquisa por nome, email, telefone ou NIF, sem acentos e sem ordem fixa dos
 * termos ("silva joao" encontra "João Silva").
 *
 * Não usa Radix Select de propósito: um input dentro do SelectContent luta com
 * o typeahead/focus do Radix. É um botão + painel próprio, com ↑/↓/Enter/Esc.
 */
export function ClientePicker({ clientes, value, onChange, disabled, id }: Props) {
  const uid = useId();
  const listId = `${uid}-lista`;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const painelRef = useRef<HTMLDivElement>(null);
  const opcoesRef = useRef<(HTMLButtonElement | null)[]>([]);

  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);

  const selecionado = clientes.find((c) => c.id === value) ?? null;

  // null = opção "sem cliente" (só sem pesquisa: é a forma de limpar).
  const opcoes: (Cliente | null)[] = useMemo(() => {
    const termos = norm(q).split(/\s+/).filter(Boolean);
    if (termos.length === 0) return [null, ...clientes];
    return clientes.filter((c) => {
      const alvo = norm([c.nome, c.empresa, c.email, c.telefone, c.nif].filter(Boolean).join(" "));
      return termos.every((t) => alvo.includes(t));
    });
  }, [clientes, q]);

  // Ao abrir: foca a pesquisa, arranca no cliente actual e puxa o painel para
  // dentro da vista (o form do sheet faz scroll e cortaria a lista).
  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    setSel(value ? Math.max(clientes.findIndex((c) => c.id === value) + 1, 0) : 0);
    painelRef.current?.scrollIntoView({ block: "nearest" });
  }, [open, value, clientes]);

  // Escrever recomeça a selecção no primeiro resultado.
  useEffect(() => {
    setSel(0);
  }, [q]);

  useEffect(() => {
    if (!open) return;
    opcoesRef.current[sel]?.scrollIntoView({ block: "nearest" });
  }, [sel, open]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function abrir() {
    if (disabled) return;
    setQ("");
    setOpen(true);
  }

  function fechar(devolveFoco = true) {
    setOpen(false);
    if (devolveFoco) triggerRef.current?.focus();
  }

  function escolher(c: Cliente | null) {
    onChange(c?.id ?? "");
    fechar();
  }

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      fechar();
      return;
    }
    if (e.key === "Tab") {
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel((s) => (opcoes.length ? Math.min(s + 1, opcoes.length - 1) : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter") {
      // Sempre preventDefault: sem isto o Enter submetia o form do projecto.
      e.preventDefault();
      if (opcoes.length > 0) escolher(opcoes[sel] ?? opcoes[0] ?? null);
    }
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        id={id}
        ref={triggerRef}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => (open ? fechar(false) : abrir())}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            abrir();
          }
        }}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={cn("line-clamp-1 text-left", !selecionado && "text-muted-foreground")}>
          {selecionado?.nome ?? SEM_CLIENTE}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
      </button>

      {open && (
        <div
          ref={painelRef}
          className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md"
        >
          <div className="flex items-center gap-2 border-b px-3">
            <Search className="h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onInputKeyDown}
              placeholder="Procurar cliente…"
              aria-label="Procurar cliente"
              aria-expanded
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={opcoes.length > 0 ? `${uid}-opt-${sel}` : undefined}
              autoComplete="off"
              className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          <div
            id={listId}
            role="listbox"
            aria-label="Clientes"
            className="max-h-60 overflow-y-auto p-1"
          >
            {opcoes.length === 0 ? (
              <p className="px-2 py-3 text-center text-sm text-muted-foreground">
                Sem resultados
              </p>
            ) : (
              opcoes.map((c, i) => {
                const activo = c ? c.id === value : !value;
                return (
                  <button
                    key={c?.id ?? "__none"}
                    id={`${uid}-opt-${i}`}
                    ref={(el) => {
                      opcoesRef.current[i] = el;
                    }}
                    type="button"
                    role="option"
                    aria-selected={activo}
                    onClick={() => escolher(c)}
                    onMouseMove={() => setSel(i)}
                    className={cn(
                      "relative flex w-full items-center rounded-sm py-1.5 pl-8 pr-2 text-left text-sm",
                      i === sel && "bg-accent text-accent-foreground",
                      !c && "text-muted-foreground"
                    )}
                  >
                    {activo && (
                      <Check className="absolute left-2 h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    <span className="line-clamp-1">{c?.nome ?? SEM_CLIENTE}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
