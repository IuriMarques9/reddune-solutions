"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition, type CSSProperties } from "react";
import {
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Check, ChevronDown, ChevronRight, Globe, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PROJETO_TIPO_LABEL,
  STATUS_GROUPS,
  STATUS_LABELS,
  type Projeto,
  type ProjetoStatus,
  type ProjetoTipo,
} from "@/types/projeto";
import type { ServicoSlug } from "@/types/servico";
import { totalACobrar } from "@/lib/iva";
import { safeJsonPost } from "@/lib/safe-fetch";
import { useToast } from "@/hooks/use-toast";
import { readKanbanOrder } from "./KanbanOrderSettings";

const COLLAPSE_KEY = "painel.kanban.collapsedColumns";
const COLLAPSE_SECS_KEY = "painel.kanban.collapsedSections";

/** Estados finais: sem acção rápida "Concluir". */
const DONE_STATUSES: ProjetoStatus[] = ["terminado", "fechado"];

/** Tag abreviada do rodapé do card (protótipo: Web / Assist. / Software). */
const KC_TAG: Record<ServicoSlug, string> = {
  "web-digital": "Web",
  "assistencia-tecnica": "Assist.",
  "software-recuperacao": "Software",
};

function kcTag(projeto: Projeto): string | null {
  if (projeto.categoria) return KC_TAG[projeto.categoria] ?? null;
  if (projeto.tipo) return PROJETO_TIPO_LABEL[projeto.tipo as ProjetoTipo] ?? projeto.tipo;
  return null;
}

/**
 * Colunas principais do kanban (protótipo: 4 colunas fixas).
 * "A aguardar" corresponde ao estado aguardando (STATUS_GROUPS.aguarda).
 */
type KanbanColumnDef = {
  id: string;
  label: string;
  dot: string;
  statuses: ProjetoStatus[];
  /** Estado aplicado quando um card é largado na coluna. */
  dropStatus: ProjetoStatus;
};

const MAIN_COLUMNS: KanbanColumnDef[] = [
  {
    id: "col:em-curso",
    label: "Em curso",
    dot: "var(--ember)",
    statuses: STATUS_GROUPS.ativo,
    dropStatus: "em-curso",
  },
  {
    id: "col:proximo",
    label: "Próximos",
    dot: "var(--apricot)",
    statuses: STATUS_GROUPS.proximo,
    dropStatus: "proximo",
  },
  {
    id: "col:aguarda",
    label: "A aguardar",
    dot: "#c89b6a",
    statuses: STATUS_GROUPS.aguarda,
    dropStatus: "aguardando",
  },
  {
    id: "col:pronto",
    label: "Finalizado",
    dot: "var(--dune)",
    statuses: STATUS_GROUPS.pronto,
    dropStatus: "terminado",
  },
];

/**
 * Ordena as colunas agregadas segundo a ordem custom guardada em localStorage
 * (que continua a ser uma lista de ProjetoStatus — ver KanbanOrderSettings).
 * Cada coluna fica na posição do primeiro dos seus estados nessa lista.
 */
function orderColumns(order: ProjetoStatus[]): KanbanColumnDef[] {
  const pos = (col: KanbanColumnDef) =>
    Math.min(
      ...col.statuses.map((s) => {
        const i = order.indexOf(s);
        return i === -1 ? Number.MAX_SAFE_INTEGER : i;
      })
    );
  return [...MAIN_COLUMNS].sort((a, b) => pos(a) - pos(b));
}

/** Secções por baixo do kanban (protótipo `.kboard-extra`). */
type ExtraSection = {
  id: string;
  label: string;
  dot: string;
  statuses: ProjetoStatus[];
  /** Estado aplicado quando um card é largado na secção. */
  dropStatus: ProjetoStatus;
};

const EXTRA_SECTIONS: ExtraSection[] = [
  {
    id: "sec:ideia-cliente",
    label: "Ideias de clientes",
    dot: "var(--apricot)",
    statuses: ["ideia-cliente"],
    dropStatus: "ideia-cliente",
  },
  {
    id: "sec:ideia-interna",
    label: "Ideias internas",
    dot: "#c89b6a",
    statuses: ["ideia-interna"],
    dropStatus: "ideia-interna",
  },
  {
    id: "sec:arquivo",
    label: "Fechado",
    dot: "var(--ink-mute)",
    statuses: ["fechado"],
    dropStatus: "fechado",
  },
];

/** Pointer primeiro (largar onde está o cursor); rect como fallback. */
const collisionDetection: CollisionDetection = (args) => {
  const within = pointerWithin(args);
  return within.length > 0 ? within : rectIntersection(args);
};

function formatValor(v: number | null): string {
  if (v == null) return "—";
  return `${v.toLocaleString("pt-PT", { maximumFractionDigits: 0 })} €`;
}

/**
 * Corpo do card (partilhado entre o card arrastável e o DragOverlay).
 * Protótipo `.kcard`: kc-cli → kc-name → kc-next → kc-foot (kc-val + kc-tag).
 */
function KanbanCardBody({ projeto }: { projeto: Projeto }) {
  const tag = kcTag(projeto);
  return (
    <>
      <div className="kc-cli">
        {projeto.ref && <span className="kc-ref">{projeto.ref}</span>}
        {projeto.clienteNome ?? "RedDune"}
      </div>
      <div className="kc-name">{projeto.titulo}</div>
      {projeto.proximaAccao && <div className="kc-next">{projeto.proximaAccao}</div>}
      <div className="kc-foot">
        <span className="kc-val" title={projeto.comIva ? "Valor com IVA" : undefined}>
          {formatValor(totalACobrar(projeto))}
        </span>
        {tag && <span className="kc-tag">{tag}</span>}
      </div>
    </>
  );
}

/**
 * Card do kanban: Link para a ficha + draggable dnd-kit + acções rápidas.
 * O PointerSensor tem activationConstraint distance 6px, por isso um clique
 * normal (movimento < 6px) nunca activa o drag e a navegação continua a
 * funcionar; depois de um drag real, `suppressClickRef` cancela o clique.
 */
function KanbanCard({
  projeto,
  onConcluir,
  suppressClickRef,
}: {
  projeto: Projeto;
  onConcluir: (projeto: Projeto) => void;
  suppressClickRef: React.MutableRefObject<boolean>;
}) {
  const router = useRouter();
  const { setNodeRef, listeners, isDragging } = useDraggable({ id: projeto.id });

  const showConcluir = !DONE_STATUSES.includes(projeto.status);
  const portalAtivo = !!projeto.portal && !projeto.portal.revogadoEm;

  function quickAction(e: React.MouseEvent, run: () => void) {
    // Botões dentro de um <Link>: não deixar o clique navegar para a ficha.
    e.preventDefault();
    e.stopPropagation();
    run();
  }

  return (
    <Link
      ref={setNodeRef}
      href={`/painel/projetos/${projeto.id}`}
      className={cn("kcard touch-manipulation", isDragging && "dragging")}
      data-draggable="true"
      onClick={(e) => {
        if (suppressClickRef.current) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      {...listeners}
    >
      <KanbanCardBody projeto={projeto} />
      <div className="kc-actions" onPointerDown={(e) => e.stopPropagation()}>
        {showConcluir && (
          <button
            type="button"
            className="kc-act"
            title="Concluir"
            aria-label={`Concluir ${projeto.titulo}`}
            onClick={(e) => quickAction(e, () => onConcluir(projeto))}
          >
            <Check className="ic" aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          className="kc-act"
          title={portalAtivo ? "Abrir portal do cliente" : "Portal do cliente (gerar link)"}
          aria-label={`Portal do cliente de ${projeto.titulo}`}
          onClick={(e) =>
            quickAction(e, () => {
              // Com portal activo abre o /p/[token] numa aba nova: a rota decifra
              // o token no servidor (nunca viaja na lista de projectos). Sem
              // portal vai à ficha, onde se gera o link.
              if (portalAtivo) {
                window.open(
                  `/api/projetos/portal/abrir?projetoId=${encodeURIComponent(projeto.id)}`,
                  "_blank",
                  "noopener"
                );
              } else {
                router.push(`/painel/projetos/${projeto.id}#portal`);
              }
            })
          }
        >
          <Globe className="ic" aria-hidden="true" />
        </button>
      </div>
    </Link>
  );
}

function KanbanColumn({
  column,
  items,
  isCollapsed,
  onToggle,
  onConcluir,
  suppressClickRef,
}: {
  column: KanbanColumnDef;
  items: Projeto[];
  isCollapsed: boolean;
  onToggle: (column: KanbanColumnDef) => void;
  onConcluir: (projeto: Projeto) => void;
  suppressClickRef: React.MutableRefObject<boolean>;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { statuses: column.statuses, dropStatus: column.dropStatus },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn("kcol", isOver && "drop-over")}
      aria-label={`Coluna ${column.label}`}
    >
      <div className="kcol-head">
        <span className="dot" style={{ background: column.dot }} />
        <span className="kc-title">{column.label}</span>
        <span className="kc-n">{items.length}</span>
        <button
          type="button"
          onClick={() => onToggle(column)}
          aria-label={isCollapsed ? "Expandir coluna" : "Recolher coluna"}
          className="text-ink-mute hover:text-ink"
        >
          {isCollapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
      {!isCollapsed &&
        (items.length === 0 ? (
          // Drop target normal: sem hover/afford de botão (pointer-events off);
          // a coluna inteira é o droppable.
          <div
            className="font-mono text-[10.5px] text-ink-mute"
            style={{ pointerEvents: "none", padding: "6px 4px" }}
            aria-hidden="true"
          >
            Vazio
          </div>
        ) : (
          items.map((projeto) => (
            <KanbanCard
              key={projeto.id}
              projeto={projeto}
              onConcluir={onConcluir}
              suppressClickRef={suppressClickRef}
            />
          ))
        ))}
    </div>
  );
}

function KanbanExtraSection({
  section,
  items,
  dragActive,
  isCollapsed,
  onToggle,
  onConcluir,
  suppressClickRef,
}: {
  section: ExtraSection;
  items: Projeto[];
  dragActive: boolean;
  isCollapsed: boolean;
  onToggle: (section: ExtraSection) => void;
  onConcluir: (projeto: Projeto) => void;
  suppressClickRef: React.MutableRefObject<boolean>;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: section.id,
    data: { statuses: section.statuses, dropStatus: section.dropStatus },
  });

  // Só aparece com itens OU durante um drag (para se poder largar aqui).
  if (items.length === 0 && !dragActive) return null;

  // Recolhida esconde os cards — mas durante um drag expande à força,
  // senão não havia onde largar.
  const showRow = !isCollapsed || dragActive;

  return (
    <div ref={setNodeRef} className="ksec" aria-label={section.label}>
      <div className="ksec-head">
        <span className="dot" style={{ background: section.dot }} />
        {section.label}
        <span style={{ marginLeft: "auto" }}>{items.length}</span>
        <button
          type="button"
          onClick={() => onToggle(section)}
          aria-label={isCollapsed ? `Expandir ${section.label}` : `Recolher ${section.label}`}
          aria-expanded={!isCollapsed}
          className="text-ink-mute hover:text-ink"
        >
          {showRow ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
      {showRow && (
        <div className={cn("ksec-row", isOver && "drop-over")}>
          {items.length === 0 ? (
            <span className="font-mono text-[10.5px] text-ink-mute self-center">
              Larga aqui
            </span>
          ) : (
            items.map((projeto) => (
              <KanbanCard
                key={projeto.id}
                projeto={projeto}
                onConcluir={onConcluir}
                suppressClickRef={suppressClickRef}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

type Props = {
  projetos: Projeto[];
  className?: string;
};

export function KanbanBoard({ projetos, className }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [, startTransition] = useTransition();

  const [collapsed, setCollapsed] = useState<Set<ProjetoStatus>>(new Set());
  const [collapsedSecs, setCollapsedSecs] = useState<Set<string>>(new Set());
  const [mainColumns, setMainColumns] = useState<KanbanColumnDef[]>(MAIN_COLUMNS);
  // UI optimista: overrides de estado por projecto enquanto o servidor confirma.
  const [overrides, setOverrides] = useState<Record<string, ProjetoStatus>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const suppressClickRef = useRef(false);

  const sensors = useSensors(
    // distance 6: só activa drag depois de 6px de movimento — o clique para
    // navegar para a ficha continua a funcionar.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(COLLAPSE_KEY);
      if (raw) setCollapsed(new Set(JSON.parse(raw) as ProjetoStatus[]));
    } catch {
      // ignore
    }
    try {
      const raw = localStorage.getItem(COLLAPSE_SECS_KEY);
      if (raw) setCollapsedSecs(new Set(JSON.parse(raw) as string[]));
    } catch {
      // ignore
    }
    setMainColumns(orderColumns(readKanbanOrder()));
  }, []);

  // Quando o servidor confirma (router.refresh), limpa overrides já reflectidos
  // e overrides de projectos que desapareceram.
  useEffect(() => {
    setOverrides((prev) => {
      const ids = new Set(projetos.map((p) => p.id));
      let changed = false;
      const next = { ...prev };
      for (const p of projetos) {
        if (next[p.id] !== undefined && next[p.id] === p.status) {
          delete next[p.id];
          changed = true;
        }
      }
      for (const id of Object.keys(next)) {
        if (!ids.has(id)) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [projetos]);

  function toggle(column: KanbanColumnDef) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(column.dropStatus)) next.delete(column.dropStatus);
      else next.add(column.dropStatus);
      try {
        localStorage.setItem(COLLAPSE_KEY, JSON.stringify([...next]));
      } catch {
        // ignore
      }
      return next;
    });
  }

  function toggleSection(section: ExtraSection) {
    setCollapsedSecs((prev) => {
      const next = new Set(prev);
      if (next.has(section.id)) next.delete(section.id);
      else next.add(section.id);
      try {
        localStorage.setItem(COLLAPSE_SECS_KEY, JSON.stringify([...next]));
      } catch {
        // ignore
      }
      return next;
    });
  }

  const serverById = useMemo(() => new Map(projetos.map((p) => [p.id, p])), [projetos]);

  const effProjetos = useMemo(
    () =>
      projetos.map((p) => {
        const o = overrides[p.id];
        return o && o !== p.status ? { ...p, status: o } : p;
      }),
    [projetos, overrides]
  );

  const byId = useMemo(() => new Map(effProjetos.map((p) => [p.id, p])), [effProjetos]);

  const grouped: Partial<Record<ProjetoStatus, Projeto[]>> = {};
  for (const projeto of effProjetos) {
    if (!grouped[projeto.status]) grouped[projeto.status] = [];
    grouped[projeto.status]!.push(projeto);
  }

  const itemsOf = (statuses: ProjetoStatus[]) => statuses.flatMap((s) => grouped[s] ?? []);

  const dragActive = activeId !== null;

  // Durante um drag mostram-se todas as colunas (para se poder largar em
  // colunas vazias normalmente escondidas).
  const columns = mainColumns.filter(
    (col) =>
      dragActive ||
      itemsOf(col.statuses).length > 0 ||
      col.statuses.some((s) => (["em-curso", "proximo"] as ProjetoStatus[]).includes(s))
  );

  const activeProjeto = activeId ? byId.get(activeId) ?? null : null;

  async function moveProjeto(projeto: Projeto, next: ProjetoStatus) {
    const prev = projeto.status; // estado efectivo (já com override)
    if (prev === next) return;

    setOverrides((o) => ({ ...o, [projeto.id]: next }));

    const res = await safeJsonPost("/api/projetos/edit", {
      projetoId: projeto.id,
      field: "status",
      newValue: next,
    });

    if (!res.ok) {
      // Reverte a UI optimista.
      setOverrides((o) => {
        const copy = { ...o };
        const serverStatus = serverById.get(projeto.id)?.status;
        if (serverStatus === prev) delete copy[projeto.id];
        else copy[projeto.id] = prev;
        return copy;
      });
      toast({
        title: "Erro a mudar estado",
        description: res.error,
        variant: "destructive",
      });
      return;
    }

    startTransition(() => router.refresh());
  }

  function handleConcluir(projeto: Projeto) {
    void moveProjeto(projeto, "terminado");
  }

  function releaseClickSuppression() {
    // O click nativo dispara logo a seguir ao pointerup/onDragEnd; limpar no
    // próximo tick deixa o guard do card cancelar essa navegação.
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
    suppressClickRef.current = true;
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    releaseClickSuppression();
    const projeto = byId.get(String(event.active.id));
    const data = event.over?.data.current as
      | { statuses?: ProjetoStatus[]; dropStatus?: ProjetoStatus }
      | undefined;
    if (!projeto || !data?.dropStatus) return;
    // Coluna agregada (ex.: "Em espera"): se o estado actual já pertence à
    // coluna, largar aqui é um no-op (não força o dropStatus).
    if (data.statuses?.includes(projeto.status)) return;
    void moveProjeto(projeto, data.dropStatus);
  }

  function handleDragCancel() {
    setActiveId(null);
    releaseClickSuppression();
  }

  const anyExtraVisible =
    dragActive ||
    EXTRA_SECTIONS.some((sec) => itemsOf(sec.statuses).length > 0);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className={className}>
        <div className="kanban">
          {columns.map((col) => (
            <KanbanColumn
              key={col.id}
              column={col}
              items={itemsOf(col.statuses)}
              isCollapsed={collapsed.has(col.dropStatus)}
              onToggle={toggle}
              onConcluir={handleConcluir}
              suppressClickRef={suppressClickRef}
            />
          ))}
        </div>

        {anyExtraVisible && (
          <div className="kboard-extra">
            {EXTRA_SECTIONS.map((sec) => (
              <KanbanExtraSection
                key={sec.id}
                section={sec}
                items={itemsOf(sec.statuses)}
                dragActive={dragActive}
                isCollapsed={collapsedSecs.has(sec.id)}
                onToggle={toggleSection}
                onConcluir={handleConcluir}
                suppressClickRef={suppressClickRef}
              />
            ))}
          </div>
        )}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeProjeto ? (
          <div className="kcard" style={{ cursor: "grabbing", marginBottom: 0 }}>
            <KanbanCardBody projeto={activeProjeto} />
            <div className="kc-actions" aria-hidden="true">
              {!DONE_STATUSES.includes(activeProjeto.status) && (
                <span className="kc-act">
                  <Check className="ic" />
                </span>
              )}
              <span className="kc-act">
                <Pencil className="ic" />
              </span>
              <span className="kc-act">
                <Globe className="ic" />
              </span>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

/* ===================== VISTA LISTA ===================== */

/** Estilo do `.pill` de estado (inline styles copiados do protótipo, l.575-579). */
function statusPill(status: ProjetoStatus): { className: string; style?: CSSProperties } {
  switch (status) {
    case "em-curso":
      return { className: "pill warm" };
    case "proximo":
      return {
        className: "pill",
        style: { background: "rgba(224,122,63,.16)", color: "#c2560e" },
      };
    case "aguardando":
      return {
        className: "pill",
        style: { background: "rgba(200,155,106,.20)", color: "#8a6414" },
      };
    case "terminado":
      return {
        className: "pill",
        style: { background: "rgba(122,138,92,.18)", color: "var(--dune)" },
      };
    default:
      return { className: "pill mute" };
  }
}

/**
 * Vista Lista de /painel/projetos — `.tbl` simples do protótipo
 * (Cliente / Projecto / Estado / Próxima acção / Valor / Tipo).
 * Linha inteira clicável → ficha do projecto.
 */
export function ProjetosTable({ projetos }: { projetos: Projeto[] }) {
  const router = useRouter();

  return (
    <div style={{ overflowX: "auto" }}>
      <table className="tbl">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Projecto</th>
            <th>Estado</th>
            <th>Próxima acção</th>
            <th>Valor</th>
            <th>Tipo</th>
          </tr>
        </thead>
        <tbody>
          {projetos.length === 0 ? (
            <tr>
              <td colSpan={6} className="muted" style={{ textAlign: "center", padding: "40px 0" }}>
                Sem projetos para mostrar.
              </td>
            </tr>
          ) : (
            projetos.map((p) => {
              const pill = statusPill(p.status);
              return (
                <tr
                  key={p.id}
                  onClick={() => router.push(`/painel/projetos/${p.id}`)}
                  style={{ cursor: "pointer" }}
                >
                  <td className="kc-cli">{p.clienteNome ?? "RedDune"}</td>
                  <td className="name">
                    <Link
                      href={`/painel/projetos/${p.id}`}
                      className="kc-name"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {p.titulo}
                    </Link>
                  </td>
                  <td>
                    <span className={pill.className} style={pill.style}>
                      {STATUS_LABELS[p.status]}
                    </span>
                  </td>
                  <td className="muted">{p.proximaAccao ?? "—"}</td>
                  <td className="num">
                    <span className="kc-val" title={p.comIva ? "Valor com IVA" : undefined}>
                      {formatValor(totalACobrar(p))}
                    </span>
                  </td>
                  <td className="muted">{kcTag(p) ?? "—"}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
