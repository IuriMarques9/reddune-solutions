import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  User,
  Euro,
  CheckCircle2,
  ListChecks,
  Pencil,
  type LucideIcon,
} from "lucide-react";
import { requirePainelSession } from "@/lib/painel-auth";
import { getProjetoById } from "@/lib/mongodb/projetos";
import { getLembretesByProjeto } from "@/lib/mongodb/lembretes";
import { getAllClientes } from "@/lib/mongodb/clientes";
import { getPagamentosByProjeto } from "@/lib/mongodb/pagamentos";
import { getDespesasByProjeto } from "@/lib/mongodb/despesas";
import { PagamentosSection } from "@/components/painel/PagamentosSection";
import { CustosCard } from "@/components/painel/CustosCard";
import { ProjetoRowMenu } from "@/components/painel/ProjetoRowMenu";
import { LembreteChecklist } from "@/components/painel/LembreteChecklist";
import { ProjetoForm } from "@/components/painel/ProjetoForm";
import { ArquivosCard } from "@/components/painel/ArquivosCard";
import { PortalSection } from "@/components/painel/PortalSection";
import { getComentariosByProjeto } from "@/lib/mongodb/portal";
import { getSandboxesByProjeto } from "@/lib/mongodb/portal-sandbox";
import { decryptPortalToken } from "@/lib/portal-token";
import { HardwareSection } from "@/components/painel/HardwareSection";
import { sanitizeArquivo } from "@/types/projeto";
import { gastoEmpresaDoProjeto } from "@/lib/gastos";
import { StatusBadge } from "@/components/painel/StatusBadge";
import { todayLisbonYmd } from "@/lib/dates";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export default async function ProjetoDetalhePage({ params }: { params: Params }) {
  await requirePainelSession();
  const { id } = await params;
  const [projeto, lembretes, clientes, pagamentos, comentarios, sandboxes, despesas] =
    await Promise.all([
      getProjetoById(id),
      getLembretesByProjeto(id),
      getAllClientes(),
      getPagamentosByProjeto(id),
      getComentariosByProjeto(id),
      getSandboxesByProjeto(id),
      getDespesasByProjeto(id),
    ]);

  if (!projeto) notFound();

  // Link do portal sempre à mão: decifrado aqui (server), nunca guardado em claro.
  const portalAtivo = !!projeto.portal && !projeto.portal.revogadoEm;
  const portalToken = portalAtivo ? decryptPortalToken(projeto.portal?.tokenEnc) : null;

  const totalLembretes = lembretes.length;
  const lembretesFeitas = lembretes.filter((t) => t.feita).length;
  const totalPago = pagamentos.reduce((s, p) => s + p.valor, 0);
  const gastoEmpresa = gastoEmpresaDoProjeto(projeto, despesas);

  return (
    <>
      {/* Voltar + menu ⋯ */}
      <div className="detail-top">
        <Link href="/painel/projetos" className="back-btn">
          <ArrowLeft className="ic" aria-hidden="true" />
          Voltar a projectos
        </Link>
        <ProjetoRowMenu projeto={projeto} variant="icon-btn" />
      </div>

      {/* Hero escuro — ficha do projecto: estado, dinheiro, progresso de pagamento */}
      <ProjetoHero projeto={projeto} totalPago={totalPago} gastoEmpresa={gastoEmpresa} />

      <div className="detail-wrap">
        {/* ── Coluna principal ── */}
        <div className="detail-main">
          {/* Editar projecto */}
          <section className="card">
            <div className="card-label">
              <Pencil className="ic" aria-hidden="true" />
              Editar projecto
            </div>
            <ProjetoForm projeto={projeto} clientes={clientes} />
          </section>

          {/* Ficheiros / Orçamentos */}
          <ArquivosCard
            projetoId={projeto.id}
            arquivos={(projeto.arquivos ?? []).map(sanitizeArquivo)}
          />

          {/* Portal do cliente (âncora #portal — linkado a partir do kanban) */}
          <div id="portal" className="scroll-mt-6">
            <PortalSection
              projetoId={projeto.id}
              portalAtivo={portalAtivo}
              portalToken={portalToken}
              links={projeto.links ?? []}
              comentarios={comentarios}
              sandboxes={sandboxes.map((s) => ({
                id: s.id,
                nome: s.nome,
                entry: s.entry,
                totalFicheiros: s.ficheiros.length,
              }))}
            />
          </div>

          {/* Checklist de lembretes */}
          <section className="card">
            <div className="card-label">
              <ListChecks className="ic" aria-hidden="true" />
              Lembretes
              {totalLembretes > 0 && (
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--ink-mute)" }}>
                  {lembretesFeitas}/{totalLembretes}
                </span>
              )}
            </div>
            <LembreteChecklist lembretes={lembretes} projetoId={projeto.id} />
          </section>

          {/* Pagamentos */}
          <PagamentosSection
            projetoId={projeto.id}
            pagamentos={pagamentos}
            valorEstimado={projeto.valorEstimado}
            projetoStatus={projeto.status}
            projetoTitulo={projeto.titulo}
          />

          {/* Hardware (só assistência técnica) */}
          {projeto.categoria === "assistencia-tecnica" && (
            <HardwareSection projeto={projeto} />
          )}

          {/* Custos editável */}
          <CustosCard projeto={projeto} despesas={despesas} />
        </div>

        {/* ── Aside ── */}
        <aside className="detail-aside">
          {/* Pills derivadas (dívida, garantia) */}
          <ProjetoBadges projeto={projeto} totalPago={totalPago} />

          {/* Informações */}
          <div className="card">
            <div className="card-label" style={{ marginBottom: 12 }}>Informações</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {projeto.clienteNome && (
                <div className="info-row">
                  <User aria-hidden="true" />
                  <div>
                    <div className="l">Cliente</div>
                    <div className="val">
                      {projeto.clienteId ? (
                        <Link
                          href={`/painel/clientes/${projeto.clienteId}`}
                          className="hover:underline"
                        >
                          {projeto.clienteNome}
                        </Link>
                      ) : (
                        projeto.clienteNome
                      )}
                    </div>
                  </div>
                </div>
              )}
              <InfoRow icon={Calendar} label="Prazo" value={formatDate(projeto.prazo)} />
              <InfoRow icon={Calendar} label="Criado" value={formatDate(projeto.dataCriado)} />
              {projeto.dataFechado && (
                <InfoRow icon={CheckCircle2} label="Fechado" value={formatDate(projeto.dataFechado)} />
              )}
              {projeto.valorEstimado != null && (
                <InfoRow
                  icon={Euro}
                  label="Valor estimado"
                  value={`${projeto.valorEstimado.toLocaleString("pt-PT", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} €`}
                />
              )}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

function ProjetoBadges({ projeto, totalPago }: { projeto: import("@/types/projeto").Projeto; totalPago: number }) {
  const today = new Date().toISOString().slice(0, 10);
  const emDivida = projeto.status === "terminado" && projeto.valorEstimado != null && totalPago < projeto.valorEstimado;
  const divida = emDivida ? (projeto.valorEstimado! - totalPago) : 0;
  const garantia = projeto.garantiaAte;
  const garantiaActiva = garantia && garantia >= today;
  const garantiaExpirada = garantia && garantia < today;

  if (!emDivida && !garantia) return null;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {emDivida && (
        <span className="pill warm">Em dívida: {divida.toLocaleString("pt-PT")} €</span>
      )}
      {garantiaActiva && (
        <span className="pill ok">Garantia até {formatDate(garantia!)}</span>
      )}
      {garantiaExpirada && <span className="pill mute">Garantia expirada</span>}
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="info-row">
      <Icon aria-hidden="true" />
      <div>
        <div className="l">{label}</div>
        <div className="val">{value}</div>
      </div>
    </div>
  );
}

/** Dias desde a criação, contados por dia de calendário no fuso de Lisboa. */
function diasNoSistema(dataCriadoIso: string | null): number | null {
  if (!dataCriadoIso) return null;
  const criado = new Date(dataCriadoIso);
  if (Number.isNaN(criado.getTime())) return null;
  const utcMs = (ymd: string) => {
    const [y, m, d] = ymd.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  const ms = utcMs(todayLisbonYmd()) - utcMs(todayLisbonYmd(criado));
  return Math.max(0, Math.round(ms / 86400000));
}

function ProjetoHero({
  projeto,
  totalPago,
  gastoEmpresa,
}: {
  projeto: import("@/types/projeto").Projeto;
  totalPago: number;
  gastoEmpresa: number;
}) {
  const orcado = projeto.valorEstimado;
  const divida = orcado != null ? Math.max(0, orcado - totalPago) : 0;
  // Lucro REALIZADO (regime de caixa): só conta o que já foi recebido. Enquanto
  // houver dívida não é o lucro final do projecto — daí o "Em dívida" ao lado.
  const lucro = totalPago - gastoEmpresa;
  const temLucro = totalPago > 0 || gastoEmpresa > 0;
  const pct =
    orcado != null
      ? orcado > 0
        ? Math.min(100, Math.max(0, Math.round((totalPago / orcado) * 100)))
        : 100
      : null;
  const dias = diasNoSistema(projeto.dataCriado);
  const money = (n: number) => n.toLocaleString("pt-PT");

  return (
    <div className="pd-hero">
      <div className="pd-hero-top">
        <p className="eyebrow">Painel · Projectos · {projeto.titulo}</p>
        <div className="pd-status">
          <StatusBadge status={projeto.status} />
          {dias != null && (
            <span className="pd-age">
              há {dias} dia{dias === 1 ? "" : "s"} no sistema
            </span>
          )}
        </div>
      </div>
      <h1 className="pd-h1">{projeto.titulo}</h1>
      {projeto.ref && <p className="pd-ref">{projeto.ref}</p>}
      {projeto.clienteNome && (
        <p className="pd-cli">
          {projeto.clienteId ? (
            <Link href={`/painel/clientes/${projeto.clienteId}`} className="hover:underline">
              {projeto.clienteNome}
            </Link>
          ) : (
            projeto.clienteNome
          )}
        </p>
      )}
      <div className="pd-money">
        {orcado != null && (
          <div className="v">
            <div className="l">Orçado</div>
            <div className="n">{money(orcado)} €</div>
          </div>
        )}
        <div className="v">
          <div className="l">Recebido</div>
          <div className="n">{money(totalPago)} €</div>
        </div>
        {orcado != null && (
          <div className="v">
            <div className="l">Em dívida</div>
            <div className={divida > 0 ? "n em" : "n"}>{money(divida)} €</div>
          </div>
        )}
        {temLucro && (
          <div
            className="v"
            title={`Recebido (${money(totalPago)} €) − gasto da empresa (${money(gastoEmpresa)} €: linhas marcadas ✓ + despesas ligadas)${
              divida > 0 ? ". Ainda há valor por receber — não é o lucro final." : ""
            }`}
          >
            <div className="l">Lucro</div>
            <div className={lucro < 0 ? "n em" : "n"}>{money(lucro)} €</div>
          </div>
        )}
        {pct != null && (
          <div className="pd-prog">
            <div className="pd-prog-bar">
              <span style={{ width: `${pct}%` }} />
            </div>
            <div className="pd-prog-l">
              {pct}% pago{divida > 0 ? ` · faltam ${money(divida)} €` : ""}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
