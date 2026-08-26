import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, User } from "lucide-react";
import { getProjetosByCliente } from "@/lib/mongodb/projetos";
import { getClienteById } from "@/lib/mongodb/clientes";
import { getPagamentosByCliente } from "@/lib/mongodb/pagamentos";
import { METODO_LABEL } from "@/types/pagamento";
import { Topbar } from "@/components/painel/Topbar";
import { InlineStatusSelect } from "@/components/painel/InlineStatusSelect";
import { ClienteForm } from "@/components/painel/ClienteForm";
import { ClienteHardware } from "@/components/painel/ClienteHardware";
import { STATUS_GROUPS } from "@/types/projeto";
import { parseIsoDate } from "@/lib/dates";
import { requirePainelSession } from "@/lib/painel-auth";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

const eur = (n: number) => Math.round(n).toLocaleString("pt-PT");

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

export default async function ClienteDetailPage({ params }: { params: Params }) {
  await requirePainelSession();
  const { id } = await params;
  const [cliente, projetos, pagamentos] = await Promise.all([
    getClienteById(id),
    getProjetosByCliente(id),
    getPagamentosByCliente(id),
  ]);

  if (!cliente) notFound();

  const active = projetos.filter(
    (p) =>
      STATUS_GROUPS.ativo.includes(p.status) ||
      STATUS_GROUPS.proximo.includes(p.status) ||
      STATUS_GROUPS.aguarda.includes(p.status) ||
      STATUS_GROUPS.pronto.includes(p.status)
  );
  const finished = projetos.filter((p) => STATUS_GROUPS.arquivo.includes(p.status));

  const totalValor = projetos.reduce((sum, p) => sum + (p.valorEstimado ?? 0), 0);

  const pagoPorProjeto = new Map<string, number>();
  for (const p of pagamentos) {
    pagoPorProjeto.set(p.projetoId, (pagoPorProjeto.get(p.projetoId) ?? 0) + p.valor);
  }
  const dividaTotal = projetos.reduce((sum, p) => {
    if (p.status !== "terminado" || p.valorEstimado == null) return sum;
    const restante = p.valorEstimado - (pagoPorProjeto.get(p.id) ?? 0);
    return restante > 0 ? sum + restante : sum;
  }, 0);

  const sortedProjetos = [...projetos].sort((a, b) => {
    const aDate = parseIsoDate(a.dataCriado ?? null);
    const bDate = parseIsoDate(b.dataCriado ?? null);
    if (!aDate && !bDate) return 0;
    if (!aDate) return 1;
    if (!bDate) return -1;
    return bDate.getTime() - aDate.getTime();
  });

  return (
    <>
      <Topbar
        crumbs={["Cliente"]}
        title={cliente.nome}
        description={[
          cliente.empresa,
          `${projetos.length} projecto${projetos.length === 1 ? "" : "s"} no histórico.`,
        ]
          .filter(Boolean)
          .join(" · ")}
      />

      <div className="detail-top">
        <Link href="/painel/clientes" className="back-btn">
          <ArrowLeft className="ic" aria-hidden="true" /> Voltar a clientes
        </Link>
      </div>

      <div className="mini-kpis">
        <div className="k">
          <div className="kpi-label">Projectos</div>
          <div className="kpi-num">{projetos.length}</div>
        </div>
        <div className="k">
          <div className="kpi-label">Em curso / a aguardar</div>
          <div className="kpi-num">{active.length}</div>
        </div>
        <div className="k">
          <div className="kpi-label">Concluídos</div>
          <div className="kpi-num">{finished.length}</div>
        </div>
        <div className="k">
          <div className="kpi-label">Valor estimado</div>
          <div className="kpi-num">{eur(totalValor)} €</div>
        </div>
        <div className={dividaTotal > 0 ? "k accent" : "k"}>
          <div className="kpi-label">Em dívida</div>
          <div className="kpi-num">{eur(dividaTotal)} €</div>
        </div>
      </div>

      {/* Ficha editável inline */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-label">
          <User className="ic" aria-hidden="true" /> Ficha do cliente
        </div>
        <ClienteForm cliente={cliente} />
      </div>

      {/* Projectos do cliente */}
      {sortedProjetos.length === 0 ? (
        <div className="empty">
          <div className="t">Sem projectos</div>
          <div className="desc">Sem projectos associados a este cliente.</div>
        </div>
      ) : (
        <>
          <p className="eyebrow">Projectos</p>
          <table className="tbl">
            <thead>
              <tr>
                <th>Projecto</th>
                <th>Estado</th>
                <th className="col-hide-sm">Prazo</th>
                <th>Valor</th>
                <th className="col-hide-sm" />
              </tr>
            </thead>
            <tbody>
              {sortedProjetos.map((p) => (
                <tr key={p.id}>
                  <td className="name">
                    <Link href={`/painel/projetos/${p.id}`}>{p.titulo}</Link>
                  </td>
                  <td>
                    <InlineStatusSelect
                      projetoId={p.id}
                      status={p.status}
                      pagoTotal={pagoPorProjeto.get(p.id) ?? 0}
                      valorEstimado={p.valorEstimado}
                    />
                  </td>
                  <td className="muted col-hide-sm">{fmtDate(p.prazo)}</td>
                  {p.valorEstimado != null ? (
                    <td className="num">{eur(p.valorEstimado)} €</td>
                  ) : (
                    <td className="muted">—</td>
                  )}
                  <td className="arr col-hide-sm">
                    <Link href={`/painel/projetos/${p.id}`} aria-label={`Abrir ${p.titulo}`}>→</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Equipamentos — hardware registado nas fichas dos projectos */}
      <ClienteHardware projetos={sortedProjetos} />

      {/* Histórico de pagamentos */}
      {pagamentos.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <PagamentosHistorico
            pagamentos={pagamentos}
            projetosMap={Object.fromEntries(projetos.map((p) => [p.id, p.titulo]))}
          />
        </div>
      )}
    </>
  );
}

function PagamentosHistorico({
  pagamentos,
  projetosMap,
}: {
  pagamentos: import("@/types/pagamento").Pagamento[];
  projetosMap: Record<string, string>;
}) {
  const total = pagamentos.reduce((s, p) => s + p.valor, 0);
  const grupos = new Map<string, typeof pagamentos>();
  for (const p of pagamentos) {
    const arr = grupos.get(p.projetoId) ?? [];
    arr.push(p);
    grupos.set(p.projetoId, arr);
  }

  return (
    <>
      <div className="card-head">
        <span className="card-title">Histórico de pagamentos</span>
        <span className="mono muted" style={{ fontSize: 11 }}>
          {total.toLocaleString("pt-PT")} € · {pagamentos.length} pagamento{pagamentos.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="col" style={{ gap: 16 }}>
        {Array.from(grupos.entries()).map(([projetoId, lista]) => {
          const sub = lista.reduce((s, p) => s + p.valor, 0);
          return (
            <div key={projetoId}>
              <div className="row between" style={{ marginBottom: 8 }}>
                <Link
                  href={`/painel/projetos/${projetoId}`}
                  style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 13.5, color: "var(--ink)" }}
                >
                  {projetosMap[projetoId] ?? "(projeto removido)"}
                </Link>
                <span className="mono" style={{ fontSize: 12, fontWeight: 700 }}>
                  {sub.toLocaleString("pt-PT")} €
                </span>
              </div>
              <div className="col" style={{ gap: 7 }}>
                {lista.map((p) => (
                  <div key={p.id} className="pay">
                    <b>{p.valor.toLocaleString("pt-PT")} €</b>
                    <span className="pd">{fmtDate(p.data)}</span>
                    {p.metodo && <span className="pm">{METODO_LABEL[p.metodo]}</span>}
                    {p.notas && (
                      <span
                        className="pd"
                        style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}
                      >
                        {p.notas}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
