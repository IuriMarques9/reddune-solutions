# Plano de Novas Alterações — v3
## (Para o Claude Code implementar)

---

## PASSO 1 — Produto com múltiplas imagens

### 1a — Atualizar o tipo `Product`
**Ficheiro a alterar:** `src/types/product.ts`

Substituir o campo `imageUrl: string` por `imageUrls: string[]`:
```ts
// Antes:
imageUrl: string;

// Depois:
imageUrls: string[];
```

### 1b — Atualizar o serviço MongoDB
**Ficheiro a alterar:** `src/lib/mongodb/products.ts`

Atualizar o `mapDoc` para lidar com o novo campo. Suportar retrocompatibilidade: se o documento tiver `imageUrl` (singular, antigo) converte para array; se já tiver `imageUrls` usa diretamente:
```ts
imageUrls: Array.isArray(doc.imageUrls) && doc.imageUrls.length > 0
  ? doc.imageUrls
  : typeof doc.imageUrl === "string" && doc.imageUrl
    ? [doc.imageUrl]
    : [],
```

### 1c — Atualizar `ProductCard.tsx`
**Ficheiro a alterar:** `src/components/sections/shop/ProductCard.tsx`

Substituir a imagem estática por um **carrossel simples** com estado local:
- Estado `currentIndex` para controlar a imagem ativa
- Se houver só uma imagem, mostrar sem controlos de navegação
- Se houver múltiplas, mostrar botões `←` / `→` sobre a imagem e dots indicadores em baixo
- Fallback com ícone `<ImageOff>` se `imageUrls` estiver vazio
- Os botões de navegação devem parar a propagação de eventos (não disparar o link do card)

### 1d — Atualizar estrutura dos documentos no MongoDB Atlas (manual)
No Atlas, renomear o campo `imageUrl` para `imageUrls` e converter o valor para array:
```json
// Antes:
{ "imageUrl": "https://..." }

// Depois:
{ "imageUrls": ["https://...", "https://..."] }
```

---

## PASSO 2 — Hero na página de Serviços e breadcrumb movido

### 2a — Adicionar hero à página de Serviços
**Ficheiro a alterar:** `src/app/pricingPage/page.tsx`

Adicionar um hero no topo da página com fundo vermelho (`bg-primary`), igual ao padrão do site. O hero deve ter:
- Título: usar a chave de tradução já existente (`PricingPage.title` ou criar `PricingPage.hero.title`)
- Subtítulo: curto, usar `PricingPage.subtitle` ou criar chave nova
- Sem botões CTA — é apenas um banner de identificação de página

Adicionar as traduções PT/EN necessárias se as chaves não existirem.

### 2b — Remover o breadcrumb da página de Serviços
**Ficheiro a alterar:** `src/app/pricingPage/page.tsx` e/ou o componente do breadcrumb

Remover o elemento de breadcrumb (Home > Preços / Home > Pricing) da página de Serviços. Se o componente de breadcrumb for reutilizável, não o apagar — apenas não o usar nesta página.

---

## PASSO 3 — Breadcrumb na página `/contacto`

**Ficheiro a alterar:** `src/app/contacto/page.tsx`

Adicionar um breadcrumb simples no topo da página (abaixo do Header, antes do `<Contact />`):
```
Início > Contacto   (PT)
Home > Contact      (EN)
```

Se já existir um componente de breadcrumb no projeto, reutilizá-lo. Caso contrário, criar um inline simples com `<Link>` e separador `/` ou `>`.

Adicionar as traduções necessárias em `messages/pt.json` e `messages/en.json` se não existirem:
```json
"Breadcrumb": {
  "home": "Início",
  "contact": "Contacto"
}
```

---

## PASSO 4 — Portfolio carregado da base de dados

### 4a — Definir o tipo `PortfolioItem`
**Ficheiro a criar:** `src/types/portfolio.ts`

```ts
export type PortfolioItem = {
  id: string;
  title: { pt: string; en: string };
  description: { pt: string; en: string };
  category: { pt: string; en: string };
  imageUrls: string[];
  featured: boolean;
  createdAt: string;
};
```

### 4b — Criar o serviço MongoDB para portfolio
**Ficheiro a criar:** `src/lib/mongodb/portfolio.ts`

Seguir o mesmo padrão de `src/lib/mongodb/products.ts`:
- Função `getAllPortfolioItems()` — busca todos os items, ordenados por `featured` desc e `createdAt` desc
- Validação e mapeamento dos documentos com fallback seguro para cada campo

### 4c — Atualizar o componente `Portfolio`
**Ficheiro a alterar:** `src/components/sections/Portfolio.tsx`

Atualmente o componente usa dados hardcoded ou de um ficheiro local. Alterar para:
- Receber `items: PortfolioItem[]` como prop (Server Component)
- Renderizar cada item com as suas imagens (usar carrossel simples igual ao do ProductCard se tiver múltiplas imagens)
- Nome e categoria do item em `item.title[locale]` e `item.category[locale]`

### 4d — Atualizar a landing page para passar os dados ao Portfolio
**Ficheiro a alterar:** `src/app/page.tsx`

Converter a homepage para buscar os items do portfolio antes de renderizar:
```ts
import { getAllPortfolioItems } from "@/lib/mongodb/portfolio";

// dentro do componente (Server Component):
const portfolioItems = await getAllPortfolioItems();

// passar como prop:
<Portfolio items={portfolioItems} />
```

### 4e — Criar a coleção `portfolio` no MongoDB Atlas (manual)
Estrutura de cada documento:
```json
{
  "title": { "pt": "Computador Gaming", "en": "Gaming PC" },
  "description": { "pt": "Montagem personalizada...", "en": "Custom build..." },
  "category": { "pt": "Construção de Computadores", "en": "PC Building" },
  "imageUrls": ["https://..."],
  "featured": true,
  "createdAt": { "$date": "2025-01-01T00:00:00Z" }
}
```

---

## PASSO 5 — Seletor de idioma com bandeiras

**Ficheiro a alterar:** `src/components/templates/language-switcher.tsx`

Substituir o texto "PT" / "EN" por ícones de bandeiras. Usar emojis de bandeiras (sem dependências extra):
- Portugal: `🇵🇹`
- Reino Unido: `🇬🇧`

O botão da língua ativa deve ter um estilo de destaque (ex: `ring-2 ring-primary` ou fundo ligeiramente destacado). O botão da língua inativa deve ter menor opacidade (`opacity-60`).

Manter o atributo `aria-label` para acessibilidade:
```tsx
aria-label="Português"   // para o botão PT
aria-label="English"     // para o botão EN
```

O tamanho dos emojis de bandeira deve ser ajustado com `text-xl` ou `text-2xl` para ficarem bem visíveis.

---

## Ordem de execução recomendada

1. Passo 5 — seletor de idioma (mais isolado, sem dependências)
2. Passo 1 — múltiplas imagens no produto (tipo + serviço + card)
3. Passo 2 — hero na página de Serviços + remover breadcrumb
4. Passo 3 — breadcrumb no /contacto
5. Passo 4 — portfolio da base de dados (tipo + serviço + componente + page.tsx)
6. Passos manuais no Atlas: atualizar documentos `products` (imageUrls) e criar coleção `portfolio`
