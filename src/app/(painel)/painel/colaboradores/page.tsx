import Link from "next/link";
import type { ReactNode } from "react";
import { Users } from "lucide-react";
import { requirePainelSession } from "@/lib/painel-auth";
import { getAllColaboradores } from "@/lib/mongodb/colaboradores";
import { getAllProjetos } from "@/lib/mongodb/projetos";
import { getAllDespesas } from "@/lib/mongodb/despesas";
import { Topbar } from "@/components/painel/Topbar";
import { NovoColaboradorButton } from "@/components/painel/NovoColaboradorButton";

export const dynamic = "force-dynamic";

const eur = (n: number) => Math.round(n).toLocaleString("pt-PT");

/** Preenche a célula toda com o link — linha clicável sem JS. */
function CellLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} style={{ display: "block", margin: "-13px -16px", padding: "13px 16px" }}>
      {children}
    </Link>
  );
}

export default async function ColaboradoresPage() {
  await requirePainelSession();

  const [colaboradores, projetos, despesas] = await Promise.all([
    getAllColaboradores(),
    getAllProjetos(),
    getAllDespesas(),
  ]);

  // Quanto já foi pago a cada pessoa e o que falta face ao combinado nos
  // projectos onde entra. Tudo por id — nomes não entram na conta.
  const pago = new Map<string, number>();
  for (const d of despesas) {
    if (d.categoria !== "colaboradores" || !d.colaboradorId) continue;
    pago.set(d.colaboradorId, (pago.get(d.colaboradorId) ?? 0) + d.valor);
  }

  const nProjetos = new Map<string, number>();
  const acordado = new Map<string, number>();
  for (const p of projetos) {
    for (const c of p.colaboradores ?? []) {
      nProjetos.set(c.colaboradorId, (nProjetos.get(c.colaboradorId) ?? 0) + 1);
      if (c.valorAcordado != null) {
        acordado.set(c.colaboradorId, (acordado.get(c.colaboradorId) ?? 0) + c.valorAcordado);
      }
    }
  }

  const activos = colaboradores.filter((c) => c.ativo);
  const arquivados = colaboradores.filter((c) => !c.ativo);
  const ordenados = [...activos, ...arquivados];

  const totalPago = [...pago.values()].reduce((s, v) => s + v, 0);
  const totalFalta = colaboradores.reduce((s, c) => {
    const falta = (acordado.get(c.id) ?? 0) - (pago.get(c.id) ?? 0);
    return falta > 0 ? s + falta : s;
  }, 0);

  return (
    <>
      <Topbar
        crumbs={["Colaboradores"]}
        titleHtml={`${colaboradores.length} <em>colaborador${colaboradores.length === 1 ? "" : "es"}</em>`}
        description="Quem trabalha contigo nos projectos. Não são clientes: o cliente paga-nos, o colaborador recebe de nós."
        actions={<NovoColaboradorButton />}
      />

      <div className="mini-kpis">
        <div className="k">
          <div className="kpi-label">Activos</div>
          <div className="kpi-num">{activos.length}</div>
        </div>
        <div className="k">
          <div className="kpi-label">Já pago</div>
          <div className="kpi-num">{eur(totalPago)} €</div>
        </div>
        <div className={totalFalta > 0 ? "k accent" : "k"}>
          <div className="kpi-label">Por pagar</div>
          <div className="kpi-num">{eur(totalFalta)} €</div>
        </div>
      </div>

      {ordenados.length === 0 ? (
        <div className="empty">
          <div className="ic"><Users aria-hidden="true" /></div>
          <div className="t">Sem colaboradores</div>
          <div className="desc">
            Clica em “Novo colaborador” para criar a primeira ficha. Depois escolhe a pessoa na
            ficha do projecto e regista os pagamentos por lá.
          </div>
        </div>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th>Nome</th>
              <th className="col-hide-sm">Contacto</th>
              <th>Projectos</th>
              <th>Pago</th>
              <th>Por pagar</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {ordenados.map((c) => {
              const href = `/painel/colaboradores/${c.id}`;
              const n = nProjetos.get(c.id) ?? 0;
              const jaPago = pago.get(c.id) ?? 0;
              const falta = (acordado.get(c.id) ?? 0) - jaPago;
              return (
                <tr key={c.id}>
                  <td className="name">
                    <CellLink href={href}>
                      {c.nome}
                      {c.papel && (
                        <span className="muted" style={{ fontWeight: 400 }}> · {c.papel}</span>
                      )}
                      {!c.ativo && (
                        <span className="muted" style={{ fontWeight: 400 }}> · arquivado</span>
                      )}
                    </CellLink>
                  </td>
                  <td className="muted col-hide-sm">
                    <CellLink href={href}>{c.telefone ?? c.email ?? "—"}</CellLink>
                  </td>
                  <td className={n > 0 ? undefined : "muted"}>
                    <CellLink href={href}>{n > 0 ? n : "—"}</CellLink>
                  </td>
                  <td className={jaPago > 0 ? "num" : "muted"}>
                    <CellLink href={href}>{jaPago > 0 ? `${eur(jaPago)} €` : "—"}</CellLink>
                  </td>
                  {falta > 0 ? (
                    <td className="num" style={{ color: "var(--ember)" }}>
                      <CellLink href={href}>{eur(falta)} €</CellLink>
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
