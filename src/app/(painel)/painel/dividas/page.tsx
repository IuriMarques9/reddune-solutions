import Link from "next/link";
import { Check, Mail, ChevronRight, CalendarClock } from "lucide-react";
import { getAllProjetos } from "@/lib/mongodb/projetos";
import { getAllPagamentos } from "@/lib/mongodb/pagamentos";
import { totalACobrar } from "@/lib/iva";
import { getAllClientes } from "@/lib/mongodb/clientes";
import { getAllMensalidades } from "@/lib/mongodb/mensalidades";
import { requirePainelSession } from "@/lib/painel-auth";
import { Topbar } from "@/components/painel/Topbar";
import { todayLisbonYmd } from "@/lib/dates";
import {
  cobrancasVencidas,
  diffDias,
  porCobrarDentroDoValor,
  somaPorCobrar,
  todasCobrancas,
} from "@/lib/mensalidades";
import { PERIODO_SUFIXO, type Cobranca, type Mensalidade } from "@/types/mensalidade";
import type { Projeto } from "@/types/projeto";

export const dynamic = "force-dynamic";

type Bucket = "30+" | "10-30" | "0-10";
type Filter = "todas" | "30+" | "semana";
type View = "projectos" | "mensalidades";

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
  searchParams: Promise<{ f?: string; v?: string }>;
}) {
  await requirePainelSession();

  const [allProjetos, pagamentos, clientes, mensalidades, params] = await Promise.all([
    getAllProjetos(),
    getAllPagamentos(),
    getAllClientes(),
    getAllMensalidades(),
    searchParams,
  ]);

  const filter: Filter =
    params.f === "30+" || params.f === "semana" ? (params.f as Filter) : "todas";
  const view: View = params.v === "mensalidades" ? "mensalidades" : "projectos";

  const hoje = todayLisbonYmd();
  const cobrancas = todasCobrancas(mensalidades, pagamentos, hoje);
  const vencidas = cobrancasVencidas(cobrancas);

  const clienteById = new Map(clientes.map((c) => [c.id, c]));
  const projetoById = new Map(allProjetos.map((p) => [p.id, p]));
  const mensalidadeById = new Map(mensalidades.map((m) => [m.id, m]));
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
    /** Parte do valor que está a ser cobrada por um plano — mostrada, não somada. */
    emPlano: number;
  };

  // Comparação BRUTA: total a cobrar (com IVA quando o projecto o leva) contra
  // o que foi pago. Ver src/lib/iva.ts.
  const rows: Row[] = allProjetos
    .filter((p) => p.status === "terminado" && totalACobrar(p) != null)
    .map((p) => {
      const pago = pagoPorProjeto.get(p.id) ?? 0;
      // ANTI-DUPLA-CONTAGEM: o que está por cobrar através de um plano marcado
      // "faz parte do valor do projecto" sai daqui e aparece no separador
      // Mensalidades. Sem isto o mesmo dinheiro contava duas vezes.
      const emPlano = porCobrarDentroDoValor(mensalidades, cobrancas, p.id);
      // Bruto contra bruto: `totalACobrar` já traz o IVA quando o projecto o
      // leva, e `Pagamento.valor` é sempre o que o cliente entregou.
      const restante = (totalACobrar(p) ?? 0) - pago - emPlano;
      const dias = diasDesde(p.dataFechado ?? p.dataCriado);
      return {
        projeto: p,
        restante,
        dias,
        bucket: bucketOf(dias),
        ultCobranca: ultimoPagamento.get(p.id) ?? null,
        emPlano,
      };
    })
    .filter((r) => r.restante > 0.005)
    .sort((a, b) => b.dias - a.dias);

  const totalProjetos = rows.reduce((s, r) => s + r.restante, 0);
  const totalVencidoPlanos = somaPorCobrar(vencidas);
  // Vencido = o que já devia ter entrado. Comprometido = isso mais tudo o que
  // está combinado para o futuro (cobranças que ainda nem venceram).
  const vencidoAgora = totalProjetos + totalVencidoPlanos;
  const comprometido = totalProjetos + somaPorCobrar(cobrancas);
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
          <div className="kpi-label">Vencido agora</div>
          <div className="big">{eur(vencidoAgora)} €</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="kpi-label">Comprometido</div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22 }}>
            {eur(comprometido)} €
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <nav className="view-tabs" aria-label="Tipo de dívida">
          <ViewTab v="projectos" cur={view} label="Projectos" n={rows.length} />
          <ViewTab v="mensalidades" cur={view} label="Mensalidades" n={vencidas.length} />
        </nav>
      </div>

      {view === "projectos" ? (
        <>
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
                {visible.map(({ projeto: p, restante, ultCobranca, emPlano }) => {
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
                      <td
                        className="col-hide-sm"
                        title={p.comIva ? `${eur(p.valorEstimado ?? 0)} € s/ IVA` : undefined}
                      >
                        {eur(totalACobrar(p) ?? 0)} €{p.comIva ? " c/ IVA" : ""}
                      </td>
                      <td className="col-hide-sm">{eur(pago)} €</td>
                      <td className="num" style={{ color: "var(--ember)" }}>
                        {eur(restante)} €
                        {emPlano > 0 && (
                          <span
                            className="muted"
                            style={{ display: "block", fontSize: 10.5 }}
                            title="Esta parte está a ser cobrada por um plano de mensalidades — aparece no separador Mensalidades, não é somada aqui."
                          >
                            +{eur(emPlano)} € em plano
                          </span>
                        )}
                      </td>
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
      ) : (
        <MensalidadesTab
          vencidas={vencidas}
          mensalidadeById={mensalidadeById}
          projetoById={projetoById}
          clienteById={clienteById}
          hoje={hoje}
        />
      )}
    </>
  );
}

/**
 * Cobranças que já deviam ter entrado, de planos de QUALQUER projecto —
 * incluindo os que estão em curso. É a lacuna que o separador Projectos deixava:
 * ele só olha para projectos `terminado`, e uma mensalidade corre durante o
 * projecto, não depois.
 */
function MensalidadesTab({
  vencidas,
  mensalidadeById,
  projetoById,
  clienteById,
  hoje,
}: {
  vencidas: Cobranca[];
  mensalidadeById: Map<string, Mensalidade>;
  projetoById: Map<string, Projeto>;
  clienteById: Map<string, { nome: string; email: string | null }>;
  hoje: string;
}) {
  const eur = (n: number) => Math.round(n).toLocaleString("pt-PT");

  if (vencidas.length === 0) {
    return (
      <div className="empty">
        <div className="ic"><CalendarClock aria-hidden="true" /></div>
        <div className="t">Nada vencido</div>
        <div className="desc">Cobranças de mensalidades e anuidades em atraso aparecem aqui.</div>
      </div>
    );
  }

  return (
    <table className="tbl">
      <thead>
        <tr>
          <th>Plano</th>
          <th>Cliente</th>
          <th className="col-hide-sm">Vencia a</th>
          <th>Em falta</th>
          <th>Atraso</th>
          <th className="col-hide-sm" />
        </tr>
      </thead>
      <tbody>
        {vencidas.map((c) => {
          const m = mensalidadeById.get(c.mensalidadeId);
          const projeto = projetoById.get(c.projetoId);
          const cliente = c.clienteId ? clienteById.get(c.clienteId) : null;
          const nome = projeto?.clienteNome ?? cliente?.nome ?? "Sem cliente";
          const email = cliente?.email ?? null;
          const emFalta = Math.max(0, c.valor - c.pago);
          const atraso = diffDias(c.dataPrevista, hoje);
          const titulo = m ? `${m.titulo} · ${c.numero}/${m.numeroCobrancas}` : `Cobrança ${c.numero}`;
          return (
            <tr key={`${c.mensalidadeId}-${c.numero}`}>
              <td className="name">
                <Link href={`/painel/projetos/${c.projetoId}#mensalidades`}>{titulo}</Link>
                {projeto && (
                  <span className="muted" style={{ display: "block", fontSize: 11 }}>
                    {projeto.titulo}
                    {m && ` · ${eur(m.valor)} €/${PERIODO_SUFIXO[m.periodo]}`}
                  </span>
                )}
              </td>
              <td className="muted">
                {c.clienteId ? <Link href={`/painel/clientes/${c.clienteId}`}>{nome}</Link> : nome}
              </td>
              <td className="muted col-hide-sm">{fmtDate(c.dataPrevista)}</td>
              <td className="num" style={{ color: "var(--ember)" }}>
                {eur(emFalta)} €
                {c.estado === "parcial" && (
                  <span className="muted" style={{ display: "block", fontSize: 10.5 }}>
                    já pagou {eur(c.pago)} €
                  </span>
                )}
              </td>
              <td className="num">{atraso} {atraso === 1 ? "dia" : "dias"}</td>
              <td className="col-hide-sm" style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                <span style={{ display: "inline-flex", gap: 6 }}>
                  {email && (
                    <a
                      className="btn-ghost"
                      href={`mailto:${email}?subject=${encodeURIComponent(
                        "Pagamento pendente · " + (m?.titulo ?? "Mensalidade")
                      )}`}
                    >
                      <Mail className="ic" style={{ width: 13, height: 13 }} aria-hidden="true" />
                      Cobrar por email
                    </a>
                  )}
                  <Link className="btn-ghost" href={`/painel/projetos/${c.projetoId}#mensalidades`}>
                    <ChevronRight className="ic" style={{ width: 13, height: 13 }} aria-hidden="true" />
                    Ver plano
                  </Link>
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function ViewTab({ v, cur, label, n }: { v: View; cur: View; label: string; n: number }) {
  const href = v === "projectos" ? "/painel/dividas" : `/painel/dividas?v=${v}`;
  return (
    <Link
      href={href}
      className={cur === v ? "on" : undefined}
      aria-current={cur === v ? "true" : undefined}
    >
      {label}
      <span className="num">{n}</span>
    </Link>
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
