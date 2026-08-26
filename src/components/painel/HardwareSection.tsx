"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Cpu, ChevronRight, Plus, Trash2, MemoryStick } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  HW_COMPONENTE_LABEL,
  HW_COMPONENTE_TIPO,
  HW_COMPONENTES_PC_TIPICO,
  hardwareTemDados,
  type HardwareComponente,
  type HardwareComponenteTipo,
  type Projeto,
} from "@/types/projeto";
import { safeJsonPost } from "@/lib/safe-fetch";
import { useToast } from "@/hooks/use-toast";

/** Sugestão de preenchimento por tipo — encurta o registo ao balcão. */
const PLACEHOLDER: Record<HardwareComponenteTipo, string> = {
  cpu: "ex: Ryzen 5 5600",
  motherboard: "ex: MSI B550M PRO-VDH",
  ram: "ex: Kingston Fury 2x8GB DDR4 3200",
  armazenamento: "ex: SSD NVMe Kingston NV2 1TB",
  gpu: "ex: RTX 3060 12GB",
  fonte: "ex: Corsair CV650 650W",
  cooler: "ex: cooler stock / AK620",
  caixa: "ex: NZXT H510",
  rede: "ex: Intel AX200 Wi-Fi 6",
  outro: "ex: leitor de cartões",
};

function novoComponenteId(): string {
  return `hw_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

type Props = {
  projeto: Projeto;
};

export function HardwareSection({ projeto }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [, startTransition] = useTransition();
  const hw = projeto.hardware ?? {};
  const componentesIniciais = hw.componentes ?? [];
  const hasData = hardwareTemDados(hw);
  const [open, setOpen] = useState(hasData);
  const [marca, setMarca] = useState(hw.marca ?? "");
  const [modelo, setModelo] = useState(hw.modelo ?? "");
  const [serial, setSerial] = useState(hw.serial ?? "");
  const [acessorios, setAcessorios] = useState(hw.acessoriosEntregues ?? "");
  const [componentes, setComponentes] = useState<HardwareComponente[]>(componentesIniciais);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    marca !== (hw.marca ?? "") ||
    modelo !== (hw.modelo ?? "") ||
    serial !== (hw.serial ?? "") ||
    acessorios !== (hw.acessoriosEntregues ?? "") ||
    JSON.stringify(componentes) !== JSON.stringify(componentesIniciais);

  function updateComponente(id: string, patch: Partial<HardwareComponente>) {
    setComponentes((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function addComponente(tipo: HardwareComponenteTipo = "cpu") {
    setComponentes((cs) => [...cs, { id: novoComponenteId(), tipo, descricao: "" }]);
  }

  /** Semeia as peças que uma torre leva por norma, para só preencher. */
  function addPcTipico() {
    setComponentes((cs) => [
      ...cs,
      ...HW_COMPONENTES_PC_TIPICO.map((tipo) => ({
        id: novoComponenteId(),
        tipo,
        descricao: "",
      })),
    ]);
  }

  async function save() {
    setSaving(true);
    setError(null);
    // Linhas em branco (adicionadas e não preenchidas) não se guardam.
    const comps = componentes
      .filter((c) => c.descricao.trim() || c.serial?.trim())
      .map((c) => ({
        id: c.id,
        tipo: c.tipo,
        descricao: c.descricao.trim(),
        serial: c.serial?.trim() || null,
      }));
    const hardware =
      marca.trim() || modelo.trim() || serial.trim() || acessorios.trim() || comps.length
        ? {
            marca: marca.trim() || undefined,
            modelo: modelo.trim() || undefined,
            serial: serial.trim() || undefined,
            acessoriosEntregues: acessorios.trim() || undefined,
            componentes: comps.length ? comps : undefined,
          }
        : null;
    const res = await safeJsonPost("/api/projetos/upsert", {
      id: projeto.id,
      titulo: projeto.titulo,
      status: projeto.status,
      hardware,
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      toast({ title: "Erro a guardar hardware", description: res.error, variant: "destructive" });
      return;
    }
    // Alinha o estado local com o que ficou gravado (as linhas em branco foram
    // descartadas acima) — senão o botão Guardar ficava sempre "sujo".
    setComponentes(comps);
    startTransition(() => router.refresh());
  }

  return (
    <section className={cn("card", open && "hw-open")}>
      <button
        type="button"
        className="card-label"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          background: "none",
          border: 0,
          cursor: "pointer",
          padding: 0,
          margin: 0,
          textAlign: "left",
        }}
      >
        <ChevronRight className="ic chev" aria-hidden="true" />
        <Cpu className="ic" aria-hidden="true" />
        Hardware
        {hasData && !open && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--ink-mute)",
              letterSpacing: ".04em",
              textTransform: "none",
            }}
          >
            {[
              [hw.marca, hw.modelo].filter(Boolean).join(" "),
              componentesIniciais.length
                ? `${componentesIniciais.length} componente${componentesIniciais.length === 1 ? "" : "s"}`
                : "",
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        )}
      </button>

      <div className="hw-body">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
          <div className="field">
            <label htmlFor="hw-marca">Marca</label>
            <input
              id="hw-marca"
              value={marca}
              onChange={(e) => setMarca(e.target.value)}
              maxLength={100}
              disabled={saving}
            />
          </div>
          <div className="field">
            <label htmlFor="hw-modelo">Modelo</label>
            <input
              id="hw-modelo"
              value={modelo}
              onChange={(e) => setModelo(e.target.value)}
              maxLength={100}
              disabled={saving}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="hw-serial">Número de série</label>
          <input
            id="hw-serial"
            value={serial}
            onChange={(e) => setSerial(e.target.value)}
            maxLength={100}
            disabled={saving}
          />
        </div>
        <div className="field">
          <label htmlFor="hw-aces">Acessórios entregues</label>
          <textarea
            id="hw-aces"
            value={acessorios}
            onChange={(e) => setAcessorios(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="ex: carregador, cabo, mala"
            disabled={saving}
          />
        </div>

        {/* Componentes — marca/modelo não chegam numa torre montada, e há peças
            com número de série próprio (garantias, provar o que entrou/saiu). */}
        <div className="psub">
          <p className="plabel">
            <MemoryStick style={{ width: 13, height: 13 }} aria-hidden="true" />
            Componentes
          </p>

          {componentes.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--ink-mute)", fontStyle: "italic", margin: "0 0 8px" }}>
              Sem componentes registados. Usa <b>Peças típicas de PC</b> para semear a ficha de uma
              torre, ou acrescenta só as peças que interessam.
            </p>
          ) : (
            componentes.map((c) => (
              <div key={c.id} className="hwrow">
                <select
                  className="hwtipo"
                  value={c.tipo}
                  onChange={(e) =>
                    updateComponente(c.id, { tipo: e.target.value as HardwareComponenteTipo })
                  }
                  disabled={saving}
                  aria-label="Tipo de componente"
                >
                  {HW_COMPONENTE_TIPO.map((t) => (
                    <option key={t} value={t}>
                      {HW_COMPONENTE_LABEL[t]}
                    </option>
                  ))}
                </select>
                <input
                  className="in-sm hwdesc"
                  value={c.descricao}
                  onChange={(e) => updateComponente(c.id, { descricao: e.target.value })}
                  maxLength={300}
                  placeholder={PLACEHOLDER[c.tipo]}
                  disabled={saving}
                  aria-label={`${HW_COMPONENTE_LABEL[c.tipo]} — descrição`}
                />
                <input
                  className="in-sm hwserie"
                  value={c.serial ?? ""}
                  onChange={(e) => updateComponente(c.id, { serial: e.target.value })}
                  maxLength={100}
                  placeholder="Nº de série"
                  disabled={saving}
                  aria-label={`${HW_COMPONENTE_LABEL[c.tipo]} — número de série`}
                />
                <button
                  type="button"
                  className="icon-mini hwdel"
                  onClick={() => setComponentes((cs) => cs.filter((x) => x.id !== c.id))}
                  disabled={saving}
                  title="Remover componente"
                  aria-label={`Remover ${HW_COMPONENTE_LABEL[c.tipo]}`}
                >
                  <Trash2 aria-hidden="true" />
                </button>
              </div>
            ))
          )}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn-ghost" onClick={() => addComponente()} disabled={saving}>
              <Plus style={{ width: 13, height: 13 }} aria-hidden="true" />
              Adicionar componente
            </button>
            <button type="button" className="btn-ghost" onClick={addPcTipico} disabled={saving}>
              <Cpu style={{ width: 13, height: 13 }} aria-hidden="true" />
              Peças típicas de PC
            </button>
          </div>
          <p style={{ fontSize: 11.5, color: "var(--ink-mute)", margin: "8px 0 0" }}>
            Ficha interna: o cliente continua a ver só marca e modelo no portal. Linhas em branco não
            são guardadas.
          </p>
        </div>
        {error && (
          <p style={{ fontSize: 12, color: "var(--ember)", margin: "10px 0 0" }}>{error}</p>
        )}
        {dirty && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
            <button type="button" className="btn-primary" onClick={save} disabled={saving}>
              {saving && (
                <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} aria-hidden="true" />
              )}
              Guardar
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
