import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE } from "./route";
import { resolvePortalToken } from "@/lib/portal-auth";
import { pullArquivo } from "@/lib/mongodb/projetos";
import { deleteManagedBlob } from "@/lib/blob";
import { logMutation } from "@/lib/mongodb/mutation-audit";

vi.mock("@/lib/portal-auth", () => ({ resolvePortalToken: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimitDistributed: vi.fn().mockResolvedValue({ allowed: true }),
  getClientIp: vi.fn(() => "127.0.0.1"),
}));
vi.mock("@/lib/mongodb/projetos", () => ({ pullArquivo: vi.fn() }));
vi.mock("@/lib/blob", () => ({ deleteManagedBlob: vi.fn() }));
vi.mock("@/lib/mongodb/mutation-audit", () => ({ logMutation: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

describe("DELETE /api/portal/arquivo/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(logMutation).mockResolvedValue(undefined as never);
    vi.mocked(deleteManagedBlob).mockResolvedValue(undefined as never);
  });

  it("remove ficheiros enviados pelo cliente pelo portal", async () => {
    vi.mocked(resolvePortalToken).mockResolvedValue({
      id: "proj-1",
      arquivos: [{ id: "file-1", nome: "foto.jpg", origem: "cliente", blobUrl: "https://blob.test/foto.jpg" }],
    } as never);
    vi.mocked(pullArquivo).mockResolvedValue(true);

    const res = await DELETE(new Request("http://test/api/portal/arquivo/file-1?t=token"), {
      params: Promise.resolve({ id: "file-1" }),
    });

    expect(res.status).toBe(200);
    expect(pullArquivo).toHaveBeenCalledWith("proj-1", "file-1");
    expect(deleteManagedBlob).toHaveBeenCalledWith("https://blob.test/foto.jpg");
  });

  it("não remove ficheiros que não foram enviados pelo cliente", async () => {
    vi.mocked(resolvePortalToken).mockResolvedValue({
      id: "proj-1",
      arquivos: [{ id: "file-1", nome: "entregavel.pdf", origem: "nos", blobUrl: "https://blob.test/entregavel.pdf" }],
    } as never);

    const res = await DELETE(new Request("http://test/api/portal/arquivo/file-1?t=token"), {
      params: Promise.resolve({ id: "file-1" }),
    });

    expect(res.status).toBe(403);
    expect(pullArquivo).not.toHaveBeenCalled();
    expect(deleteManagedBlob).not.toHaveBeenCalled();
  });
});
