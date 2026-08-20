import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Euro, User } from "lucide-react";
import { requirePainelSession } from "@/lib/painel-auth";
import { getColaboradorById } from "@/lib/mongodb/colaboradores";
import { getAllProjetos } from "@/lib/mongodb/projetos";
import { getAllDespesas } from "@/lib/mongodb/despesas";
import { Topbar } from "@/components/painel/Topbar";
import { ColaboradorForm } from "@/components/painel/ColaboradorForm";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

const eur = (n: number) => n.toLocaleString("pt-PT", { maximumFractionDigits: 2 });

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

export default async function ColaboradorDetailPage({ params }: { params: Params }) {
  await requirePainelSession();
  const { id } = await params;

  const [colaborador, projetos, despesas] = await Promise.all([
    getColaboradorById(id),
    getAllProjetos(),
    getAllDespesas(),
  ]);

  if (!colaborador) notFound();

  // Projectos onde entra + o que ficou combinado em cada um.
  const entradas = projetos
    .map((p) => {
      const c = (p.colaboradores ?? []).find((x) => x.colaboradorId === id);
      return c ? { projeto: p, papel: c.papel ?? null, acordado: c.valorAcordado ?? null } : null;
    })
    .filter((e): e is NonNullable<typeof e> => e !== null)
    .sort((a, b) => (b.projeto.dataCriado ?? "").localeCompare(a.projeto.dataCriado ?? ""));

  const pagamentos = despesas.filter(
    (d) => d.categoria === "colaboradores" && d.colaboradorId === id
  );

  const pagoPorProjeto = new Map<string, number>();
  for (const d of pagamentos) {
    const k = d.projetoId ?? "";
    pagoPorProjeto.set(k, (pagoPorProjeto.get(k) ?? 0) + d.valor);
  }

  const totalPago = pagamentos.reduce((s, d) => s + d.valor, 0);
  const totalAcordado = entradas.reduce((s, e) => s + (e.acordado ?? 0), 0);
  // Só conta a falta onde há valor combinado — sem combinação não há dívida.
  const porPagar = entradas.reduce((s, e) => {
    if (e.acordado == null) return s;
    const falta = e.acordado - (pagoPorProjeto.get(e.projeto.id) ?? 0);
    return falta > 0 ? s + falta : s;
  }, 0);

  const titulos = new Map(projetos.map((p) => [p.id, p.titulo]));

  return (
    <>
      <Topbar
        crumbs={["Colaborador"]}
        title={colaborador.nome}
        description={[
          colaborador.papel,
          colaborador.ativo ? null : "Arquivado",
          `${entradas.length} projecto${entradas.length === 1 ? "" : "s"}.`,
        ]
          .filter(Boolean)
          .join(" · ")}
      />

      <div className="detail-top">
        <Link href="/painel/colaboradores" className="back-btn">
          <ArrowLeft className="ic" aria-hidden="true" /> Voltar a colaboradores
        </Link>
      </div>

      <div className="mini-kpis">
        <div className="k">
          <div className="kpi-label">Projectos</div>
          <div className="kpi-num">{entradas.length}</div>
        </div>
        <div className="k">
          <div className="kpi-label">Combinado</div>
          <div className="kpi-num">{eur(totalAcordado)} €</div>
        </div>
        <div className="k">
          <div className="kpi-label">Já pago</div>
          <div className="kpi-num">{eur(totalPago)} €</div>
        </div>
        <div className={porPagar > 0 ? "k accent" : "k"}>
          <div className="kpi-label">Por pagar</div>
          <div className="kpi-num">{eur(porPagar)} €</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-label">
          <User className="ic" aria-hidden="true" /> Ficha do colaborador
        </div>
        <ColaboradorForm colaborador={colaborador} />
      </div>

      {entradas.length > 0 && (
        <>
          <p className="eyebrow">Projectos</p>
          <table className="tbl">
            <thead>
              <tr>
                <th>Projecto</th>
                <th className="col-hide-sm">Papel</th>
                <th>Combinado</th>
                <th>Pago</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {entradas.map((e) => {
                const pagoAqui = pagoPorProjeto.get(e.projeto.id) ?? 0;
                const falta = e.acordado != null ? e.acordado - pagoAqui : null;
                return (
                  <tr key={e.projeto.id}>
                    <td className="name">
                      <Link href={`/painel/projetos/${e.projeto.id}`}>{e.projeto.titulo}</Link>
                    </td>
                    <td className="muted col-hide-sm">{e.papel ?? "—"}</td>
                    {e.acordado != null ? (
                      <td className="num">{eur(e.acordado)} €</td>
                    ) : (
                      <td className="muted">—</td>
                    )}
                    <td className="num">
                      {eur(pagoAqui)} €
                      {falta != null && falta > 0 && (
                        <span className="muted" style={{ fontWeight: 400 }}>
                          {" "}· faltam {eur(falta)} €
                        </span>
                      )}
                    </td>
                    <td className="arr">
                      <Link href={`/painel/projetos/${e.projeto.id}`} aria-label={`Abrir ${e.projeto.titulo}`}>
                        →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-head">
          <span className="card-title">Pagamentos</span>
          <span className="mono muted" style={{ fontSize: 11 }}>
            {eur(totalPago)} € · {pagamentos.length} pagamento{pagamentos.length === 1 ? "" : "s"}
          </span>
        </div>
        {pagamentos.length === 0 ? (
          <p className="muted" style={{ fontSize: 13 }}>
            Sem pagamentos registados. Regista-os na ficha do projecto, no cartão Colaboradores —
            é o que os faz entrar nos gastos e no lucro.
          </p>
        ) : (
          pagamentos.map((d) => (
            <div key={d.id} className="act">
              <span className="a-ic">
                <Euro className="ic" aria-hidden="true" />
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="who truncate">{d.descricao || "Pagamento"}</div>
                <div className="muted truncate" style={{ fontSize: 11.5 }}>
                  {fmtDate(d.data)}
                  {d.projetoId ? ` · ${titulos.get(d.projetoId) ?? "projecto apagado"}` : ""}
                </div>
              </div>
              <b
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 600,
                  fontSize: 13.5,
                  whiteSpace: "nowrap",
                }}
              >
                {eur(d.valor)} €
              </b>
            </div>
          ))
        )}
      </div>
    </>
  );
}
