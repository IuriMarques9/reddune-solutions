import Link from "next/link";
import type { ReactNode } from "react";
import { Users } from "lucide-react";
import { requirePainelSession } from "@/lib/painel-auth";
import { getAllClientes } from "@/lib/mongodb/clientes";
import { totalACobrar } from "@/lib/iva";
import { getAllProjetos } from "@/lib/mongodb/projetos";
import { getAllPagamentos } from "@/lib/mongodb/pagamentos";
import { Topbar } from "@/components/painel/Topbar";
import { NovoClienteButton } from "@/components/painel/NovoClienteButton";
import { STATUS_GROUPS } from "@/types/projeto";

export const dynamic = "force-dynamic";

const eur = (n: number) => Math.round(n).toLocaleString("pt-PT");

type Agg = {
  total: number;
  ativos: number;
  proximos: number;
  espera: number;
  prontos: number;
  trabalhoAtivo: number;
  divida: number;
};

/** Resumo de projectos por cliente, à maneira do protótipo ("1 activo", "1 próximo"…). */
function projectosLabel(a: Agg | undefined): string | null {
  if (!a || a.total === 0) return null;
  if (a.ativos > 0) return `${a.ativos} activo${a.ativos === 1 ? "" : "s"}`;
  if (a.proximos > 0) return `${a.proximos} próximo${a.proximos === 1 ? "" : "s"}`;
  if (a.espera > 0) return `${a.espera} a aguardar`;
  if (a.prontos > 0) return `${a.prontos} finalizado${a.prontos === 1 ? "" : "s"}`;
  return `${a.total} fechado${a.total === 1 ? "" : "s"}`;
}

/** Preenche a célula toda com o link — linha clicável sem JS (margens negativas anulam o padding do td). */
function CellLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} style={{ display: "block", margin: "-13px -16px", padding: "13px 16px" }}>
      {children}
    </Link>
  );
}

export default async function ClientesPage() {
  await requirePainelSession();

  const [clientes, projetos, pagamentos] = await Promise.all([
    getAllClientes(),
    getAllProjetos(),
    getAllPagamentos(),
  ]);

  const pagoPorProjeto = new Map<string, number>();
  for (const p of pagamentos) {
    pagoPorProjeto.set(p.projetoId, (pagoPorProjeto.get(p.projetoId) ?? 0) + p.valor);
  }

  const agg = new Map<string, Agg>();
  for (const p of projetos) {
    if (!p.clienteId) continue;
    const a =
      agg.get(p.clienteId) ??
      { total: 0, ativos: 0, proximos: 0, espera: 0, prontos: 0, trabalhoAtivo: 0, divida: 0 };
    a.total += 1;
    if (STATUS_GROUPS.ativo.includes(p.status)) a.ativos += 1;
    if (STATUS_GROUPS.proximo.includes(p.status)) a.proximos += 1;
    if (STATUS_GROUPS.aguarda.includes(p.status)) a.espera += 1;
    if (STATUS_GROUPS.pronto.includes(p.status)) a.prontos += 1;
    if (
      STATUS_GROUPS.ativo.includes(p.status) ||
      STATUS_GROUPS.proximo.includes(p.status) ||
      STATUS_GROUPS.aguarda.includes(p.status) ||
      STATUS_GROUPS.pronto.includes(p.status)
    ) {
      a.trabalhoAtivo += 1;
    }
    // Dívida bruta (com IVA quando o projecto o leva) — bate com os pagamentos.
    const total = totalACobrar(p);
    if (p.status === "terminado" && total != null) {
      const restante = total - (pagoPorProjeto.get(p.id) ?? 0);
      if (restante > 0) a.divida += restante;
    }
    agg.set(p.clienteId, a);
  }

  const sorted = [...clientes].sort((a, b) => String(a.nome).localeCompare(String(b.nome), "pt"));

  const comTrabalho = sorted.filter((c) => (agg.get(c.id)?.trabalhoAtivo ?? 0) > 0).length;
  const dividaTotal = sorted.reduce((s, c) => s + (agg.get(c.id)?.divida ?? 0), 0);

  return (
    <>
      <Topbar
        crumbs={["Clientes"]}
        titleHtml={`${clientes.length} <em>cliente${clientes.length === 1 ? "" : "s"}</em>`}
        actions={<NovoClienteButton />}
      />

      <div className="mini-kpis">
        <div className="k">
          <div className="kpi-label">Total</div>
          <div className="kpi-num">{clientes.length}</div>
        </div>
        <div className="k">
          <div className="kpi-label">Com trabalho activo</div>
          <div className="kpi-num">{comTrabalho}</div>
        </div>
        <div className="k accent">
          <div className="kpi-label">Em dívida</div>
          <div className="kpi-num">{eur(dividaTotal)} €</div>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="empty">
          <div className="ic"><Users aria-hidden="true" /></div>
          <div className="t">Sem clientes</div>
          <div className="desc">Clica em “Novo cliente” para adicionar o primeiro.</div>
        </div>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th>Nome</th>
              <th className="col-hide-sm">Contacto</th>
              <th>Projectos</th>
              <th>Em dívida</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => {
              const a = agg.get(c.id);
              const label = projectosLabel(a);
              const divida = a?.divida ?? 0;
              const href = `/painel/clientes/${c.id}`;
              return (
                <tr key={c.id}>
                  <td className="name">
                    <CellLink href={href}>
                      {c.nome}
                      {c.empresa && (
                        <span className="muted" style={{ fontWeight: 400 }}> · {c.empresa}</span>
                      )}
                    </CellLink>
                  </td>
                  <td className="muted col-hide-sm">
                    <CellLink href={href}>{c.telefone ?? c.email ?? "—"}</CellLink>
                  </td>
                  <td className={label ? undefined : "muted"}>
                    <CellLink href={href}>{label ?? "—"}</CellLink>
                  </td>
                  {divida > 0 ? (
                    <td className="num" style={{ color: "var(--ember)" }}>
                      <CellLink href={href}>{eur(divida)} €</CellLink>
                    </td>
                  ) : (
                    <td className="muted"><CellLink href={href}>—</CellLink></td>
                  )}
                  <td className="arr"><CellLink href={href}>→</CellLink></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
