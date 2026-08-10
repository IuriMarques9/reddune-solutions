// Tipos de ficheiro aceites nos uploads (painel e portal), num sítio só.
// Antes cada rota tinha a sua tabela e o `accept=` do input era uma string
// escrita à mão que já não batia certo com o servidor — resultado: um orçamento
// em .docx/.odt/.zip era recusado ou nem aparecia no seletor de ficheiros.

/** Base comum: documentos e imagens que servem de orçamento/entregável. */
const BASE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "application/vnd.oasis.opendocument.text": "odt",
  "application/vnd.oasis.opendocument.spreadsheet": "ods",
  "application/vnd.oasis.opendocument.presentation": "odp",
  "application/rtf": "rtf",
  "text/csv": "csv",
  "text/plain": "txt",
  "application/zip": "zip",
};

/**
 * Painel (nós): base + `text/html` — mockups de ficheiro único (Claude Design),
 * servidos ao cliente só via proxy do portal com CSP sandbox.
 */
export const MIME_PAINEL: Record<string, string> = { ...BASE, "text/html": "html" };

/**
 * Portal (cliente): base SEM `text/html` e sem SVG — HTML/SVG de terceiros
 * servido no nosso domínio é XSS na origem reddune (ver
 * hospedar-html-nao-confiavel-no-teu-dominio).
 */
export const MIME_PORTAL: Record<string, string> = { ...BASE };

/** Aliases que os SOs inventam para o mesmo formato. */
const ALIAS: Record<string, string> = {
  "application/x-zip-compressed": "application/zip",
  "application/x-zip": "application/zip",
  "application/x-pdf": "application/pdf",
  "image/heic-sequence": "image/heic",
  "image/heif-sequence": "image/heif",
  "text/comma-separated-values": "text/csv",
  "application/csv": "text/csv",
  "text/rtf": "application/rtf",
};

/**
 * MIME normalizado do ficheiro, ou null se não for aceite pela allowlist dada.
 *
 * Windows/Android muitas vezes não põem MIME (ou põem `application/octet-stream`)
 * em .zip, .odt, .heic e afins — nesses casos decidimos pela extensão, que é o
 * que o utilizador vê. A extensão nunca ALARGA a allowlist: só resolve o tipo
 * quando o browser não o soube dizer.
 */
export function resolveTipoUpload(
  file: { type?: string | null; name: string },
  permitidos: Record<string, string>
): string | null {
  const bruto = (file.type ?? "").toLowerCase().split(";")[0]!.trim();
  const tipo = ALIAS[bruto] ?? bruto;
  if (permitidos[tipo]) return tipo;
  if (tipo !== "" && tipo !== "application/octet-stream") return null;

  const ext = file.name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
  if (!ext) return null;
  const porExt = Object.entries(permitidos).find(([, e]) => e === ext);
  return porExt?.[0] ?? null;
}

/** Valor do `accept=` de um <input type="file"> — MIMEs + extensões. */
export function acceptAttr(permitidos: Record<string, string>): string {
  const mimes = Object.keys(permitidos);
  const exts = [...new Set(Object.values(permitidos))].map((e) => `.${e}`);
  return [...mimes, ...exts].join(",");
}
