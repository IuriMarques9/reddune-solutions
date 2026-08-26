import { cn } from "@/lib/utils";
import { comIva as aplicaIva, IVA_LABEL } from "@/lib/iva";
import {
  LINHA_CATEGORIA,
  LINHA_CATEGORIA_LABEL,
  type LinhaCategoria,
  type ProjetoLinha,
} from "@/types/projeto";

type Props = {
  linhas: ProjetoLinha[];
  /** Linhas são sempre base s/ IVA; isto acrescenta a linha de IVA ao total. */
  comIva?: boolean;
};

const CATEGORIA_COLOR: Record<LinhaCategoria, string> = {
  peca: "bg-orange-500/10 text-orange-700 border-orange-500/30",
  "mao-obra": "bg-sky-500/10 text-sky-700 border-sky-500/30",
  portes: "bg-amber-600/10 text-amber-800 border-amber-600/30",
  deslocacao: "bg-violet-500/10 text-violet-700 border-violet-500/30",
  software: "bg-teal-600/10 text-teal-800 border-teal-600/30",
  outro: "bg-slate-500/10 text-slate-700 border-slate-500/30",
};

export function LinhasBreakdown({ linhas, comIva = false }: Props) {
  const total = linhas.reduce((s, l) => s + l.quantidade * l.precoUnit, 0);
  const totalComIva = aplicaIva(total, comIva);
  // Baldes a partir de LINHA_CATEGORIA — acrescentar uma categoria não pode
  // deixar aqui um `undefined` a rebentar na soma ou no push.
  const byCat = Object.fromEntries(LINHA_CATEGORIA.map((c) => [c, 0])) as Record<
    LinhaCategoria,
    number
  >;
  for (const l of linhas) byCat[l.categoria] += l.quantidade * l.precoUnit;

  // Group rows by categoria
  const grouped = Object.fromEntries(
    LINHA_CATEGORIA.map((c) => [c, [] as ProjetoLinha[]])
  ) as Record<LinhaCategoria, ProjetoLinha[]>;
  for (const l of linhas) grouped[l.categoria].push(l);

  const categories: readonly LinhaCategoria[] = LINHA_CATEGORIA;

  return (
    <div className="space-y-4">
      {categories.map((cat) => {
        const items = grouped[cat];
        if (items.length === 0) return null;
        return (
          <div key={cat} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "inline-flex items-center rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide border",
                  CATEGORIA_COLOR[cat]
                )}
              >
                {LINHA_CATEGORIA_LABEL[cat]}
              </span>
              <span className="font-mono tabular-nums text-xs text-muted-foreground">
                {byCat[cat].toFixed(2)}€
              </span>
            </div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border/50">
                {items.map((l) => (
                  <tr key={l.id}>
                    <td className="py-1.5 text-foreground/90">{l.descricao || "—"}</td>
                    <td className="py-1.5 text-right font-mono text-xs tabular-nums text-muted-foreground w-20">
                      {l.quantidade} × {l.precoUnit.toFixed(2)}€
                    </td>
                    <td className="py-1.5 text-right font-mono text-sm tabular-nums font-semibold w-20">
                      {(l.quantidade * l.precoUnit).toFixed(2)}€
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}

      <div className="border-t border-border pt-3 space-y-1">
        {comIva && (
          <>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Subtotal s/ IVA</span>
              <span className="font-mono tabular-nums">{total.toFixed(2)}€</span>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{IVA_LABEL}</span>
              <span className="font-mono tabular-nums">{(totalComIva - total).toFixed(2)}€</span>
            </div>
          </>
        )}
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {comIva ? "Total c/ IVA" : "Total"}
          </span>
          <span className="font-mono tabular-nums text-lg font-bold text-foreground">
            {totalComIva.toFixed(2)}€
          </span>
        </div>
      </div>
    </div>
  );
}
