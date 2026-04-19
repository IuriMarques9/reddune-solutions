# Plano de Melhorias da Loja — v2
## (Para o Claude Code implementar)

## Estado atual do projeto
- `src/app/contacto/page.tsx` — ficheiro existe mas incompleto (criado a meio)
- `src/components/sections/Contact.tsx` — ✅ JÁ ATUALIZADO (tem dropdown de assunto + useSearchParams)
- `messages/pt.json` e `messages/en.json` — sem chave `contact` no TabTitles
- `src/components/sections/Hero.tsx` — link "Entre em contacto" ainda aponta para `#contact`
- `src/app/page.tsx` — ainda tem `<Contact />` embutido na landing page (a secção completa com formulário)
- Filtros da loja ainda usam pills (`CategoryFilter.tsx`)
- Tipo `Product` ainda não tem o campo `condition`

---

## PASSO 1 — Adicionar chave `contact` ao TabTitles nas traduções

**Ficheiros a alterar:** `messages/pt.json` e `messages/en.json`

Em `pt.json`, dentro de `TabTitles`, adicionar:
```json
"contact": "RedDune Solutions - Contacto"
```

Em `en.json`, dentro de `TabTitles`, adicionar:
```json
"contact": "RedDune Solutions - Contact"
```

---

## PASSO 2 — Completar a página `/contacto`

**Ficheiro a alterar:** `src/app/contacto/page.tsx`
(ficheiro já existe mas está incompleto — substituir o conteúdo inteiro)

```tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Contact } from "@/components/sections/Contact";
import { getLocale, getMessages } from "next-intl/server";
import type { SiteMessages } from "@/types/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const messages = (await getMessages()) as unknown as SiteMessages;
  const title =
    (messages.TabTitles as Record<string, string> | undefined)?.contact ??
    "RedDune Solutions - Contacto";
  const description =
    messages.TabDescription ?? "Entre em contacto com a RedDune Solutions.";

  return {
    title,
    description,
    alternates: { canonical: "/contacto" },
    openGraph: {
      title,
      description,
      type: "website",
      locale,
      url: "/contacto",
      siteName: "Reddune Solutions",
    },
  };
}

export default function ContactPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow pt-20">
        <Suspense fallback={null}>
          <Contact />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
```

O `pt-20` no `<main>` serve para compensar o header fixo.

---

## PASSO 3 — ✅ JÁ FEITO — Contact.tsx

O `src/components/sections/Contact.tsx` já foi atualizado e tem:
- Dropdown de assunto (Suporte Técnico, Orçamento, Dúvida sobre produto da Loja, Outro)
- Leitura do URL param `?subject=loja` via `useSearchParams` com pré-seleção automática
- Campo `subject` incluído no payload enviado à API

Não fazer nada neste passo.

---

## PASSO 4 — Substituir a secção de contacto na landing page por um CTA banner

A landing page (`src/app/page.tsx`) tem atualmente `<Contact />` embutido com o formulário completo. Como agora existe uma página dedicada `/contacto`, substituir por um banner de chamada à ação.

### 4a — Criar o componente `ContactCTA`

**Ficheiro a criar:** `src/components/sections/ContactCTA.tsx`

```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

export function ContactCTA() {
  const t = useTranslations("HomePage.ContactCTA");

  return (
    <section className="bg-primary py-20">
      <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="font-headline text-3xl md:text-4xl font-bold text-primary-foreground">
          {t("title")}
        </h2>
        <p className="mt-4 text-lg text-primary-foreground/80 max-w-2xl mx-auto">
          {t("description")}
        </p>
        <div className="mt-10">
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary transition-colors duration-300 font-bold group"
          >
            <Link href="/contacto">
              {t("cta")}
              <ArrowRight
                className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                aria-hidden="true"
              />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
```

### 4b — Adicionar traduções do ContactCTA

**Ficheiros a alterar:** `messages/pt.json` e `messages/en.json`

Em `pt.json`, dentro de `HomePage`, adicionar a secção `ContactCTA`:
```json
"ContactCTA": {
  "title": "Tem um projeto em mente?",
  "description": "Fale connosco e encontramos a solução certa para si. Estamos sempre disponíveis para ajudar.",
  "cta": "Entre em contacto"
}
```

Em `en.json`, dentro de `HomePage`, adicionar:
```json
"ContactCTA": {
  "title": "Have a project in mind?",
  "description": "Get in touch with us and we'll find the right solution for you. We're always available to help.",
  "cta": "Get in touch"
}
```

### 4c — Atualizar `src/app/page.tsx`

Substituir o import e uso de `<Contact />` pelo novo `<ContactCTA />`:

```tsx
// Remover:
import { Contact } from "@/components/sections/Contact";
// e o bloco <Suspense fallback={null}><Contact /></Suspense>

// Adicionar:
import { ContactCTA } from "@/components/sections/ContactCTA";
// e usar <ContactCTA /> no lugar do bloco anterior
```

O componente `ContactCTA` é um Server Component (sem `"use client"`), por isso não precisa de `<Suspense>`.

---

## PASSO 5 — Atualizar `Hero.tsx` — botão "Entre em contacto"

**Ficheiro a alterar:** `src/components/sections/Hero.tsx`

Mudar o link do botão de contacto:
```tsx
// Antes:
<Link href="#contact">

// Depois:
<Link href="/contacto">
```

---

## PASSO 6 — Atualizar o tipo `Product` com campo `condition`

**Ficheiro a alterar:** `src/types/product.ts`

Adicionar o array de condições, o tipo, e o campo no `Product`:

```ts
export const PRODUCT_CONDITIONS = ["novo", "segunda-mao", "recondicionado"] as const;
export type ProductCondition = (typeof PRODUCT_CONDITIONS)[number];

export type Product = {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  category: ProductCategory;
  condition: ProductCondition;   // ← campo novo
  price: number;
  imageUrl: string;
  available: boolean;
  featured: boolean;
  createdAt: string;
};
```

---

## PASSO 7 — Atualizar o serviço MongoDB para incluir `condition`

**Ficheiro a alterar:** `src/lib/mongodb/products.ts`

Adicionar o validador e incluir `condition` no `mapDoc`:

```ts
import { PRODUCT_CONDITIONS, type ProductCondition } from "@/types/product";

const isValidCondition = (v: unknown): v is ProductCondition =>
  typeof v === "string" && PRODUCT_CONDITIONS.includes(v as ProductCondition);

// dentro de mapDoc, adicionar:
condition: isValidCondition(doc.condition) ? doc.condition : "novo",
```

---

## PASSO 8 — Adicionar traduções das condições e dos filtros

**Ficheiros a alterar:** `messages/pt.json` e `messages/en.json`

Adicionar dentro de `ShopPage` (já deve existir esta secção):

PT:
```json
"filters": {
  "searchPlaceholder": "Pesquisar produtos...",
  "categoryLabel": "Categoria",
  "conditionLabel": "Condição",
  "allCategories": "Todas as categorias",
  "allConditions": "Todas as condições"
},
"conditions": {
  "novo": "Novo",
  "segunda-mao": "Segunda Mão",
  "recondicionado": "Recondicionado"
}
```

EN:
```json
"filters": {
  "searchPlaceholder": "Search products...",
  "categoryLabel": "Category",
  "conditionLabel": "Condition",
  "allCategories": "All categories",
  "allConditions": "All conditions"
},
"conditions": {
  "novo": "New",
  "segunda-mao": "Second Hand",
  "recondicionado": "Refurbished"
}
```

---

## PASSO 9 — Substituir `CategoryFilter` por `ShopFilters` (pills → dropdowns)

**Ficheiro a apagar:** `src/components/sections/shop/CategoryFilter.tsx`
**Ficheiro a criar:** `src/components/sections/shop/ShopFilters.tsx`

Props do novo componente:
```ts
export type CategoryValue = ProductCategory | "all";
export type ConditionValue = ProductCondition | "all";

type Props = {
  search: string;
  onSearchChange: (v: string) => void;
  category: CategoryValue;
  onCategoryChange: (v: CategoryValue) => void;
  condition: ConditionValue;
  onConditionChange: (v: ConditionValue) => void;
  availableCategories: ProductCategory[];
  availableConditions: ProductCondition[];
};
```

Layout (numa linha, responsivo):
```
[ 🔍 Pesquisar...  ] [ Categoria ▼ ] [ Condição ▼ ]
```

Em mobile, os dropdowns ficam abaixo da pesquisa em coluna.

Os `<select>` devem usar as classes do projeto:
```
border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground
focus:outline-none focus:ring-2 focus:ring-ring
```

A barra de pesquisa usa o componente `<Input>` existente com o ícone `<Search>` do lucide-react à esquerda.

---

## PASSO 10 — Atualizar `ProductGrid.tsx`

**Ficheiro a alterar:** `src/components/sections/shop/ProductGrid.tsx`

- Substituir import de `CategoryFilter` por `ShopFilters`
- Adicionar estado: `const [condition, setCondition] = useState<ConditionValue>("all")`
- Atualizar o `useMemo` de filtros para também filtrar por condição:
```ts
if (condition !== "all") {
  result = result.filter((p) => p.condition === condition);
}
```
- Calcular `availableConditions` da mesma forma que `availableCategories`:
```ts
const availableConditions = useMemo(() => {
  const conds = new Set<ProductCondition>();
  products.forEach((p) => conds.add(p.condition));
  return Array.from(conds);
}, [products]);
```
- Passar todas as props para `<ShopFilters />`

---

## PASSO 11 — Atualizar `ProductCard.tsx`

**Ficheiro a alterar:** `src/components/sections/shop/ProductCard.tsx`

**Alteração 1 — Badge de condição** no canto superior direito da imagem (o badge "Destaque" fica no esquerdo):
```tsx
<span className={cn(
  "absolute top-3 right-3 text-xs font-semibold px-2 py-1 rounded",
  product.condition === "novo" && "bg-green-100 text-green-800",
  product.condition === "recondicionado" && "bg-yellow-100 text-yellow-800",
  product.condition === "segunda-mao" && "bg-gray-100 text-gray-700",
)}>
  {t(`conditions.${product.condition}`)}
</span>
```

**Alteração 2 — Corrigir o link do botão Contactar:**
```tsx
// Antes:
<Link href="/#contact?subject=loja">

// Depois:
<Link href="/contacto?subject=loja">
```

---

## PASSO 12 — Atualizar documentos no MongoDB Atlas (manual)

Adicionar o campo `condition` a todos os documentos na coleção `products` no Atlas:
```json
"condition": "novo"
```
Valores válidos: `"novo"` | `"segunda-mao"` | `"recondicionado"`

---

## Ordem de execução recomendada

1. Passo 1 — traduções (TabTitles contact)
2. Passo 2 — completar página `/contacto`
3. ~~Passo 3~~ — ✅ Contact.tsx já está feito
4. Passo 4 — CTA banner na landing page (criar ContactCTA + traduções + atualizar page.tsx)
5. Passo 5 — Hero.tsx (link do botão)
6. Passo 6 — tipo Product (condition)
7. Passo 7 — serviço MongoDB (condition)
8. Passo 8 — traduções (conditions + filters)
9. Passo 9 — criar ShopFilters
10. Passo 10 — atualizar ProductGrid
11. Passo 11 — atualizar ProductCard
12. Passo 12 — MongoDB Atlas (manual, após deploy)
