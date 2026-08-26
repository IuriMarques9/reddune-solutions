import Link from "next/link";
import { Check, Mail, ChevronRight } from "lucide-react";
import { getAllProjetos } from "@/lib/mongodb/projetos";
import { getAllPagamentos } from "@/lib/mongodb/pagamentos";
import { totalACobrar } from "@/lib/iva";
import { getAllClientes } from "@/lib/mongodb/clientes";
import { requirePainelSession } from "@/lib/painel-auth";
import { Topbar } from "@/components/painel/Topbar";
import type { Projeto } from "@/types/projeto";

export const dynamic = "force-dynamic";

type Bucket = "30+" | "10-30" | "0-10";
type Filter = "todas" | "30+" | "semana";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

function diasDesde(iso: string | null): number {
  if (!iso) return 0;
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return 0;
  return Math.max(0, Math.floor((Date.now() - d) / 86400000));
}

function bucketOf(dias: number): Bucket {
  if (dias >= 30) return "30+";
  if (dias >= 10) return "10-30";
  return "0-10";
}

export default async function DividasPage({
  searchParams,
}: {
  searchParams: Promise<{ f?: string }>;
}) {
  await requirePainelSession();

  const [allProjetos, pagamentos, clientes, params] = await Promise.all([
    getAllProjetos(),
    getAllPagamentos(),
    getAllClientes(),
    searchParams,
  ]);

  const filter: Filter =
    params.f === "30+" || params.f === "semana" ? (params.f as Filter) : "todas";

  const clienteById = new Map(clientes.map((c) => [c.id, c]));
  const pagoPorProjeto = new Map<string, number>();
  const ultimoPagamento = new Map<string, string>();
  for (const p of pagamentos) {
    pagoPorProjeto.set(p.projetoId, (pagoPorProjeto.get(p.projetoId) ?? 0) + p.valor);
    const prev = ultimoPagamento.get(p.projetoId);
    if (!prev || (p.data && p.data > prev)) ultimoPagamento.set(p.projetoId, p.data);
  }

  type Row = {
    projeto: Projeto;
    restante: number;
    dias: number;
    bucket: Bucket;
    ultCobranca: string | null;
  };

  // Comparação BRUTA: total a cobrar (com IVA quando o projecto o leva) contra
  // o que foi pago. Ver src/lib/iva.ts.
  const rows: Row[] = allProjetos
    .filter((p) => {
      const total = totalACobrar(p);
      return p.status === "terminado" && total != null && (pagoPorProjeto.get(p.id) ?? 0) < total;
    })
    .map((p) => {
      const restante = (totalACobrar(p) ?? 0) - (pagoPorProjeto.get(p.id) ?? 0);
      const dias = diasDesde(p.dataFechado ?? p.dataCriado);
      return {
        projeto: p,
        restante,
        dias,
        bucket: bucketOf(dias),
        ultCobranca: ultimoPagamento.get(p.id) ?? null,
      };
    })
    .sort((a, b) => b.dias - a.dias);

  const total = rows.reduce((s, r) => s + r.restante, 0);
  const n30 = rows.filter((r) => r.bucket === "30+").length;

  const visible = rows.filter((r) => {
    if (filter === "30+") return r.bucket === "30+";
    if (filter === "semana") return r.dias <= 7;
    return true;
  });

  const eur = (n: number) => Math.round(n).toLocaleString("pt-PT");

  return (
    <>
      <Topbar crumbs={["Dívidas"]} titleHtml={`Por <em>cobrar</em>`} />

      <div className="debt-banner">
        <div>
          <div className="kpi-label">Total em dívida</div>
          <div className="big">{eur(total)} €</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="kpi-label">Projectos</div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22 }}>
            {rows.length}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <nav className="view-tabs" aria-label="Filtrar dívidas">
          <FilterTab f="todas" cur={filter} label="Todas" n={rows.length} />
          <FilterTab f="30+" cur={filter} label="30+ dias" n={n30} />
          <FilterTab f="semana" cur={filter} label="Esta semana" />
        </nav>
      </div>

      {visible.length === 0 ? (
        <div className="empty">
          <div className="ic"><Check aria-hidden="true" /></div>
          <div className="t">Sem dívidas</div>
          <div className="desc">Projectos terminados e por cobrar aparecem aqui.</div>
        </div>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th>Projecto</th>
              <th>Cliente</th>
              <th className="col-hide-sm">Total</th>
              <th className="col-hide-sm">Pago</th>
              <th>Em falta</th>
              <th className="col-hide-sm">Último pagamento</th>
              <th className="col-hide-sm" />
            </tr>
          </thead>
          <tbody>
            {visible.map(({ projeto: p, restante, ultCobranca }) => {
              const cliente = p.clienteId ? clienteById.get(p.clienteId) : null;
              const nome = p.clienteNome ?? cliente?.nome ?? "Sem cliente";
              const email = cliente?.email ?? null;
              const pago = pagoPorProjeto.get(p.id) ?? 0;
              return (
                <tr key={p.id}>
                  <td className="name">
                    <Link href={`/painel/projetos/${p.id}`}>{p.titulo}</Link>
                  </td>
                  <td className="muted">
                    {p.clienteId ? (
                      <Link href={`/painel/clientes/${p.clienteId}`}>{nome}</Link>
                    ) : (
                      nome
                    )}
                  </td>
                  <td className="col-hide-sm" title={p.comIva ? `${eur(p.valorEstimado ?? 0)} € s/ IVA` : undefined}>
                    {eur(totalACobrar(p) ?? 0)} €{p.comIva ? " c/ IVA" : ""}
                  </td>
                  <td className="col-hide-sm">{eur(pago)} €</td>
                  <td className="num" style={{ color: "var(--ember)" }}>{eur(restante)} €</td>
                  <td className="muted col-hide-sm">{ultCobranca ? fmtDate(ultCobranca) : "—"}</td>
                  <td className="col-hide-sm" style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <span style={{ display: "inline-flex", gap: 6 }}>
                      {email && (
                        <a
                          className="btn-ghost"
                          href={`mailto:${email}?subject=${encodeURIComponent("Pagamento pendente · " + p.titulo)}`}
                        >
                          <Mail className="ic" style={{ width: 13, height: 13 }} aria-hidden="true" />
                          Cobrar por email
                        </a>
                      )}
                      <Link className="btn-ghost" href={`/painel/projetos/${p.id}`}>
                        <ChevronRight className="ic" style={{ width: 13, height: 13 }} aria-hidden="true" />
                        Ver projecto
                      </Link>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}

function FilterTab({ f, cur, label, n }: { f: Filter; cur: Filter; label: string; n?: number }) {
  const href = f === "todas" ? "/painel/dividas" : `/painel/dividas?f=${encodeURIComponent(f)}`;
  return (
    <Link
      href={href}
      className={cur === f ? "on" : undefined}
      aria-current={cur === f ? "true" : undefined}
    >
      {label}
      {n != null && <span className="num">{n}</span>}
    </Link>
  );
}
