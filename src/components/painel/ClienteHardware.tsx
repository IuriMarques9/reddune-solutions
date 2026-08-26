import Link from "next/link";
import { Cpu } from "lucide-react";
import { HW_COMPONENTE_LABEL, hardwareTemDados, type Projeto } from "@/types/projeto";

/**
 * Vista agregada, só de leitura, do hardware registado nos projectos do
 * cliente. A fonte de verdade é a ficha de cada projecto (âncora #hardware)
 * — aqui organiza-se por projecto para se perceber de onde veio o registo.
 */
export function ClienteHardware({ projetos }: { projetos: Projeto[] }) {
  const comHardware = projetos.filter((p) => hardwareTemDados(p.hardware));
  if (comHardware.length === 0) return null;

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <div className="card-head">
        <span className="card-title" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Cpu className="ic" aria-hidden="true" /> Equipamentos
        </span>
        <span className="mono muted" style={{ fontSize: 11 }}>
          {comHardware.length} equipamento{comHardware.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="col" style={{ gap: 16 }}>
        {comHardware.map((p) => {
          const hw = p.hardware ?? {};
          const nome = [hw.marca, hw.modelo]
            .map((s) => s?.trim())
            .filter(Boolean)
            .join(" ");
          const serial = hw.serial?.trim();
          const acessorios = hw.acessoriosEntregues?.trim();
          const componentes = hw.componentes ?? [];
          return (
            <div key={p.id}>
              <div className="row between" style={{ marginBottom: 6 }}>
                <Link
                  href={`/painel/projetos/${p.id}#hardware`}
                  style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 13.5, color: "var(--ink)" }}
                >
                  {p.titulo}
                </Link>
                {p.ref && (
                  <span className="mono muted" style={{ fontSize: 11 }}>
                    {p.ref}
                  </span>
                )}
              </div>
              {(nome || serial) && (
                <div style={{ fontSize: 13, marginBottom: 6 }}>
                  {nome}
                  {serial && (
                    <span className="mono muted" style={{ fontSize: 11, marginLeft: nome ? 8 : 0 }}>
                      N/S: {serial}
                    </span>
                  )}
                </div>
              )}
              {acessorios && (
                <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
                  Acessórios entregues: {acessorios}
                </div>
              )}
              {componentes.length > 0 && (
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Descrição</th>
                      <th className="col-hide-sm">Nº série</th>
                    </tr>
                  </thead>
                  <tbody>
                    {componentes.map((c) => (
                      <tr key={c.id}>
                        <td className="muted">{HW_COMPONENTE_LABEL[c.tipo] ?? c.tipo}</td>
                        <td>{c.descricao}</td>
                        <td className="mono col-hide-sm">{c.serial?.trim() || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
