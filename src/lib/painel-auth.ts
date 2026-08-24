import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/**
 * Gate de sessão das páginas do painel — SEGUNDA linha de defesa.
 *
 * O gate principal é `src/proxy.ts` (ex-middleware), que corta a request no edge antes de
 * qualquer render. Isto existe porque o guard do layout NÃO chega: o layout e as
 * páginas renderizam em paralelo, por isso o `redirect()` do layout manda o
 * browser para /entrar mas os dados que a página já carregou vão na mesma no
 * payload RSC (verificado a 2026-07-15: um GET sem cookie devolvia 200 com
 * nomes, telefones e NIFs de clientes reais lá dentro).
 *
 * Chamar como PRIMEIRA instrução da página, antes de qualquer loader — o
 * redirect corta a execução e nenhum dado chega a ser lido nem serializado.
 */
export async function requirePainelSession() {
  const session = await auth();
  if (!session?.user) {
    redirect("/entrar?from=/painel");
  }
  return session;
}
