# Plano de Implementação — Loja RedDune Solutions
## (Base de dados: MongoDB Atlas)

## Contexto
Site Next.js 15 com next-intl (PT/EN), Tailwind + Radix UI.
A loja é um catálogo sem pagamentos — o cliente clica "Contactar" e é enviado para o formulário de contacto com o assunto pré-selecionado.
Firebase está a ser descontinuado → migrar para MongoDB Atlas (free tier M0).

---

## O QUE O IURI PRECISA DE FAZER MANUALMENTE (antes do código)

### 1. Criar conta e cluster no MongoDB Atlas
1. Ir a https://www.mongodb.com/atlas e criar conta gratuita (ou entrar se já tiver)
2. Criar um novo **Project** (ex: "reddune")
3. Criar um **Cluster M0** (gratuito) — escolher região Europa (ex: Frankfurt)
4. Em **Database Access**: criar um utilizador com username e password (guardar bem)
5. Em **Network Access**: clicar "Add IP Address" → "Allow Access from Anywhere" (0.0.0.0/0) para funcionar com o Vercel
6. Clicar em **Connect** no cluster → "Drivers" → copiar a connection string (URI), que tem este formato:
   ```
   mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   Substituir USERNAME e PASSWORD pelos dados criados no passo 4

### 2. Adicionar a variável de ambiente no Vercel
1. Ir ao dashboard do Vercel → projeto reddune-solutions → **Settings** → **Environment Variables**
2. Adicionar:
   - Nome: `MONGODB_URI`
   - Valor: a connection string completa do passo anterior
3. Aplicar para os ambientes Production, Preview e Development

### 3. Remover as variáveis antigas do Firebase do Vercel
Apagar as variáveis `NEXT_PUBLIC_FIREBASE_*`, `FIREBASE_CLIENT_EMAIL` e `FIREBASE_PRIVATE_KEY`
(só depois do código estar migrado e deployado com sucesso)

---

## PASSO 1 — Instalar MongoDB e remover Firebase

```bash
npm install mongodb
npm uninstall firebase firebase-admin
```

---

## PASSO 2 — Criar o cliente MongoDB

**Ficheiro a criar:** `src/lib/mongodb/client.ts`

Criar um singleton de conexão para reutilizar a ligação entre requests (padrão recomendado no Next.js):

```ts
import "server-only";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI!;
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;
```

---

## PASSO 3 — Criar o serviço de produtos para MongoDB

**Ficheiro a criar:** `src/lib/mongodb/products.ts`
**Ficheiro a apagar depois:** `src/lib/firebase/products.ts`

A interface pública mantém-se igual (`getAllProducts`, `getProductsByCategory`) — só muda a implementação interna. O tipo `Product` em `src/types/product.ts` não muda nada.

```ts
import "server-only";
import clientPromise from "./client";
import type { Product, ProductCategory } from "@/types/product";
import { PRODUCT_CATEGORIES } from "@/types/product";
import { WithId, Document } from "mongodb";

const DB_NAME = "reddune";
const COLLECTION = "products";

const isValidCategory = (v: unknown): v is ProductCategory =>
  typeof v === "string" && PRODUCT_CATEGORIES.includes(v as ProductCategory);

function mapDoc(doc: WithId<Document>): Product | null {
  if (
    typeof doc.name?.pt !== "string" ||
    typeof doc.name?.en !== "string" ||
    typeof doc.description?.pt !== "string" ||
    typeof doc.description?.en !== "string" ||
    !isValidCategory(doc.category)
  ) return null;

  return {
    id: doc._id.toString(),
    name: { pt: doc.name.pt, en: doc.name.en },
    description: { pt: doc.description.pt, en: doc.description.en },
    category: doc.category,
    price: typeof doc.price === "number" ? doc.price : 0,
    imageUrl: typeof doc.imageUrl === "string" ? doc.imageUrl : "",
    available: doc.available === true,
    featured: doc.featured === true,
    createdAt: doc.createdAt instanceof Date
      ? doc.createdAt.toISOString()
      : new Date(0).toISOString(),
  };
}

async function getCollection() {
  const client = await clientPromise;
  return client.db(DB_NAME).collection(COLLECTION);
}

export async function getAllProducts(): Promise<Product[]> {
  try {
    const col = await getCollection();
    const docs = await col
      .find({ available: true })
      .sort({ featured: -1, createdAt: -1 })
      .toArray();
    return docs.map(mapDoc).filter((p): p is Product => p !== null);
  } catch (error) {
    console.error("getAllProducts error:", error);
    return [];
  }
}

export async function getProductsByCategory(
  category: ProductCategory
): Promise<Product[]> {
  try {
    const col = await getCollection();
    const docs = await col
      .find({ available: true, category })
      .sort({ featured: -1, createdAt: -1 })
      .toArray();
    return docs.map(mapDoc).filter((p): p is Product => p !== null);
  } catch (error) {
    console.error("getProductsByCategory error:", error);
    return [];
  }
}
```

---

## PASSO 4 — Atualizar o import na página da loja

**Ficheiro a alterar:** `src/app/loja/page.tsx`

Mudar apenas a linha do import:
```ts
// Antes:
import { getAllProducts } from "@/lib/firebase/products";

// Depois:
import { getAllProducts } from "@/lib/mongodb/products";
```

---

## PASSO 5 — Apagar pasta Firebase (após confirmar que tudo funciona)

Apagar os ficheiros:
- `src/lib/firebase/products.ts`
- `src/lib/firebase/admin.ts`
- `src/lib/firebase/config.ts`
- A pasta `src/lib/firebase/` completa

---

## PASSO 6 — Atualizar a Navegação

**Ficheiros a alterar:**
- `src/components/layout/Header.tsx`
- `messages/pt.json`
- `messages/en.json`

Em `messages/pt.json`, na secção `Navigation`, remover `portfolio` e `about` e adicionar `shop`:
```json
"Navigation": {
  "home": "Início",
  "services": "Serviços",
  "shop": "Loja"
}
```

Em `messages/en.json`:
```json
"Navigation": {
  "home": "Home",
  "services": "Services",
  "shop": "Shop"
}
```

Em `Header.tsx`, manter apenas os 3 links: Início (`/`), Serviços (scroll `/#services`), Loja (`/loja`).

---

## PASSO 7 — Adicionar campo "Assunto" ao formulário de contacto

**Ficheiros a alterar:**
- `src/components/sections/Contact.tsx`
- `src/lib/validation.ts`
- `src/app/api/sendEmail/route.ts`
- `messages/pt.json`
- `messages/en.json`

Adicionar um `<select>` de "Assunto" no formulário, entre o email e a mensagem.

Opções (PT): "Suporte Técnico", "Orçamento", "Dúvida sobre produto da Loja", "Outro"
Opções (EN): "Technical Support", "Quote Request", "Product Inquiry from Shop", "Other"

O campo deve ler o URL query param `?subject=loja` e pré-selecionar "Dúvida sobre produto da Loja" automaticamente.

Atualizar `validation.ts` para incluir `subject` como campo opcional.
Atualizar `route.ts` para incluir o `subject` no email enviado.

---

## PASSO 8 — Criar os componentes da Loja

**Ficheiros a criar** (se ainda não existirem):
- `src/components/sections/shop/ShopHero.tsx`
- `src/components/sections/shop/ProductCard.tsx`
- `src/components/sections/shop/ProductGrid.tsx`
- `src/components/sections/shop/CategoryFilter.tsx`

Estilo igual ao resto do site: fundo `bg-secondary/50`, cards brancos com `shadow-lg rounded-lg`, cor primária `text-primary` (vermelho escuro), `font-headline` para títulos.

### ProductCard.tsx
- Badge "Destaque" se `featured == true`
- Nome em `product.name[locale]`, descrição em `product.description[locale]`
- Preço: `${price}€` ou "Consultar preço" se `price == 0`
- Botão "Contactar" → link para `/#contact?subject=loja`
- SEM carrinho, SEM "Adicionar ao carrinho"

### CategoryFilter.tsx
Client Component com estado local.
Categorias: Todos, PCs, Componentes, Acessórios.
Pills com o estilo do site.

### ProductGrid.tsx
Recebe lista de produtos e categoria ativa, filtra e renderiza grid responsiva (1/2/3 colunas).

---

## PASSO 9 — Adicionar traduções da Loja

**Ficheiros a alterar:** `messages/pt.json` e `messages/en.json`

Adicionar secção `ShopPage` com:
- Título da tab, hero title, hero description
- Categorias: Todos, PCs, Componentes, Acessórios
- Labels: "Destaque", "Consultar preço", "Contactar sobre este produto"
- Mensagem vazia: "Nenhum produto disponível de momento."

---

## Estrutura dos documentos no MongoDB (para adicionar manualmente na consola Atlas)

```json
{
  "name": {
    "pt": "PC Gaming Mid-Range",
    "en": "Mid-Range Gaming PC"
  },
  "description": {
    "pt": "Computador para gaming montado à medida com garantia incluída.",
    "en": "Custom-built gaming computer with included warranty."
  },
  "category": "pc",
  "price": 799,
  "imageUrl": "",
  "available": true,
  "featured": true,
  "createdAt": { "$date": "2025-01-01T00:00:00Z" }
}
```

Categorias válidas: `"pc"` | `"componente"` | `"acessorio"` | `"outro"`
Se `price` for `0`, aparece "Consultar preço" na loja.

---

## Ordem de execução recomendada para o Claude Code
1. Passo 1 (instalar/desinstalar pacotes)
2. Passo 2 (cliente MongoDB)
3. Passo 3 (serviço de produtos)
4. Passo 4 (atualizar import na página)
5. Testar localmente → confirmar que funciona
6. Passo 5 (apagar pasta Firebase)
7. Passo 6 (navegação)
8. Passo 7 (formulário contacto)
9. Passo 8 (componentes loja, se ainda não existirem)
10. Passo 9 (traduções)
