"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";

type Props = {
  token: string;
  arquivo: { id: string; nome: string };
};

export function ArquivoPortalDeleteButton({ token, arquivo }: Props) {
  const router = useRouter();
  const [removendo, setRemovendo] = useState(false);

  async function handleDelete() {
    if (removendo) return;

    const confirmar = window.confirm(
      `Tem a certeza que quer apagar “${arquivo.nome}”? Esta ação remove o ficheiro do projeto.`
    );
    if (!confirmar) return;

    setRemovendo(true);
    try {
      const res = await fetch(`/api/portal/arquivo/${arquivo.id}?t=${encodeURIComponent(token)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Não foi possível remover o ficheiro.");
      }
      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Não foi possível remover o ficheiro.");
    } finally {
      setRemovendo(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      aria-label={`Apagar ${arquivo.nome}`}
      title="Apagar ficheiro"
      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(90,14,14,0.16)] bg-white/90 text-ember transition-all duration-300 ease-oasis hover:-translate-y-0.5 hover:bg-[rgba(214,66,42,0.10)] hover:text-dune disabled:cursor-not-allowed disabled:opacity-60"
      disabled={removendo}
    >
      {removendo ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  );
}
