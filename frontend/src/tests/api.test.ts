import { describe, it, expect, vi, beforeEach } from "vitest";
import { convertImages } from "../api";

const makeFile = (name = "test.jpg", type = "image/jpeg") =>
  new File([new Uint8Array(10)], name, { type });

describe("convertImages", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns pdf blob on success", async () => {
    const mockBlob = new Blob(["pdf"], { type: "application/pdf" });
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => "application/pdf" },
      blob: () => Promise.resolve(mockBlob),
    } as unknown as Response);

    const result = await convertImages([makeFile()], {
      mode: "multi", page_size: "A4", orientation: "portrait", margin_px: 0, quality: 150,
    });

    expect(result.type).toBe("pdf");
    expect(result.blob).toBe(mockBlob);
  });

  it("returns zip type when content-type is application/zip", async () => {
    const mockBlob = new Blob(["zip"], { type: "application/zip" });
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => "application/zip" },
      blob: () => Promise.resolve(mockBlob),
    } as unknown as Response);

    const result = await convertImages([makeFile(), makeFile("b.jpg")], {
      mode: "single", page_size: "fit", orientation: "portrait", margin_px: 0, quality: 150,
    });
    expect(result.type).toBe("zip");
  });

  it("throws error message from API on failure", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Unsupported type" }),
    } as unknown as Response);

    await expect(
      convertImages([makeFile()], {
        mode: "multi", page_size: "A4", orientation: "portrait", margin_px: 0, quality: 150,
      })
    ).rejects.toThrow("Unsupported type");
  });
});
