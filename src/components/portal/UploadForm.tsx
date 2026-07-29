"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import imageCompression from "browser-image-compression";

type Props = { token: string };

type Pendente = { id: string; nome: string; estado: "a-preparar" | "a-enviar" | "erro"; erro?: string };

const ACCEPT =
  "image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf," +
  "application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document," +
  "application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet," +
  "text/csv,text/plain,application/zip,.zip";

const COMPRESSAO = {
  maxSizeMB: 0.6,
  maxWidthOrHeight: 2000,
  useWebWorker: true,
  fileType: "image/webp" as const,
  initialQuality: 0.82,
};

/**
 * Envio de ficheiros pelo cliente (fotos da avaria, documentos, ZIP de fotos).
 * Fotos são comprimidas no browser antes de subir — telemóveis produzem 4-8MB
 * por foto e o tecto do servidor são 10MB.
 */
export function UploadForm({ token }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendentes, setPendentes] = useState<Pendente[]>([]);
  const [enviados, setEnviados] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  // Honeypot controlado — humanos não o veem; bots preenchem-no.
  const [website, setWebsite] = useState("");

  const enviarFicheiros = useCallback(
    async (lista: FileList | File[]) => {
      const ficheiros = Array.from(lista);
      if (ficheiros.length === 0) return;
      let sucesso = 0;

      for (const original of ficheiros) {
        const pid = `${original.name}-${original.size}-${pendentes.length}-${Math.random()
          .toString(36)
          .slice(2, 8)}`;
        const isImg = original.type.startsWith("image/");
        setPendentes((p) => [
          ...p,
          { id: pid, nome: original.name, estado: isImg ? "a-preparar" : "a-enviar" },
        ]);

        try {
          let ficheiro = original;
          if (isImg) {
            try {
              const comprimido = await imageCompression(original, COMPRESSAO);
              const base = original.name.replace(/\.[^.]+$/, "");
              ficheiro = new File([comprimido], `${base}.webp`, { type: "image/webp" });
            } catch {
              // HEIC que o browser não descodifica, etc. — segue o original.
            }
            setPendentes((p) => p.map((x) => (x.id === pid ? { ...x, estado: "a-enviar" } : x)));
          }

          const fd = new FormData();
          fd.append("t", token);
          fd.append("file", ficheiro);
          fd.append("website", website);

          const res = await fetch("/api/portal/arquivo", { method: "POST", body: fd });
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          if (!res.ok) {
            setPendentes((p) =>
              p.map((x) =>
                x.id === pid ? { ...x, estado: "erro", erro: data.error ?? "Não foi possível enviar." } : x
              )
            );
            continue;
          }
          sucesso += 1;
          setPendentes((p) => p.filter((x) => x.id !== pid));
        } catch {
          setPendentes((p) =>
            p.map((x) => (x.id === pid ? { ...x, estado: "erro", erro: "Falha de rede." } : x))
          );
        }
      }

      if (sucesso > 0) {
        setEnviados((n) => n + sucesso);
        router.refresh();
      }
    },
    [token, website, pendentes.length, router]
  );

  return (
    <div
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files?.length) enviarFicheiros(e.dataTransfer.files);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      className={`rounded-[16px] border border-dashed p-5 transition-colors duration-300 ease-oasis ${
        dragOver ? "border-ember bg-[rgba(214,66,42,0.05)]" : "border-[rgba(90,14,14,0.20)]"
      }`}
    >
      <p className="text-sm text-ink-soft">
        Arraste para aqui ou escolha do seu equipamento. Fotos, PDF, documentos ou ZIP até 10MB cada.
      </p>

      <div className="mt-3.5 flex flex-wrap items-center gap-3.5">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-full bg-ink px-[26px] py-3 text-sm font-semibold leading-[1.2] text-cream transition [transition-duration:350ms] ease-oasis hover:-translate-y-0.5 hover:bg-ember hover:shadow-[0_14px_36px_rgba(214,66,42,0.36)]"
        >
          Escolher ficheiros
        </button>
        {enviados > 0 && pendentes.length === 0 && (
          <span className="text-sm font-semibold text-ember">
            {enviados} ficheiro{enviados === 1 ? "" : "s"} enviado{enviados === 1 ? "" : "s"} ✓
          </span>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) enviarFicheiros(e.target.files);
          e.target.value = "";
        }}
      />
      {/* honeypot invisível */}
      <input
        type="text"
        name="website"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />

      {pendentes.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2 text-sm">
          {pendentes.map((p) => (
            <li key={p.id} className="flex flex-wrap items-baseline gap-2">
              <span className="font-medium text-ink [overflow-wrap:anywhere]">{p.nome}</span>
              <span className={p.estado === "erro" ? "text-dune" : "text-ink-mute"}>
                {p.estado === "a-preparar"
                  ? "a preparar…"
                  : p.estado === "a-enviar"
                    ? "a enviar…"
                    : (p.erro ?? "erro")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
