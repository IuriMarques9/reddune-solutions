"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ColaboradorForm } from "./ColaboradorForm";
import type { Colaborador } from "@/types/colaborador";

type Props = {
  colaborador?: Colaborador;
  /** Controlo externo do sheet. Sem esta prop gere o próprio estado. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Esconde o botão trigger — o sheet passa a abrir apenas via `open` controlado. */
  hideTrigger?: boolean;
  /** Chamado com o id depois de gravar — ex.: escolher logo quem acabou de criar. */
  onSaved?: (id: string) => void;
  label?: string;
};

export function NovoColaboradorButton({
  colaborador,
  open: openProp,
  onOpenChange,
  hideTrigger = false,
  onSaved,
  label,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const isEdit = !!colaborador;

  function setOpen(o: boolean) {
    onOpenChange?.(o);
    if (openProp === undefined) setInternalOpen(o);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <SheetTrigger asChild>
          <button type="button" className={isEdit ? "btn-ghost" : "btn-primary"}>
            {!isEdit && <Plus className="ic" aria-hidden="true" />}
            {label ?? (isEdit ? "Editar" : "Novo colaborador")}
          </button>
        </SheetTrigger>
      )}
      <SheetContent side="right" className="flex flex-col p-0">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Editar colaborador" : "Novo colaborador"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Actualiza os dados desta pessoa."
              : "Quem trabalha contigo nos projectos — não é cliente."}
          </SheetDescription>
        </SheetHeader>
        <ColaboradorForm
          colaborador={colaborador}
          onSaved={(id) => {
            setOpen(false);
            onSaved?.(id);
          }}
          onCancel={() => setOpen(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
