import { describe, it, expect } from "vitest";
import { validateFiles } from "../validation";

const makeFile = (name: string, type: string, size: number) =>
  Object.defineProperty(new File([], name, { type }), "size", { value: size });

describe("validateFiles", () => {
  it("accepts PNG", () => {
    expect(validateFiles([makeFile("a.png", "image/png", 100)])).toHaveLength(0);
  });

  it("accepts JPEG", () => {
    expect(validateFiles([makeFile("a.jpg", "image/jpeg", 100)])).toHaveLength(0);
  });

  it("rejects GIF", () => {
    const errors = validateFiles([makeFile("a.gif", "image/gif", 100)]);
    expect(errors[0].message).toContain("PNG and JPG");
  });

  it("rejects file over 20 MB", () => {
    const errors = validateFiles([makeFile("a.jpg", "image/jpeg", 21 * 1024 * 1024)]);
    expect(errors[0].message).toContain("20 MB");
  });

  it("returns multiple errors for multiple bad files", () => {
    const errors = validateFiles([
      makeFile("a.gif", "image/gif", 100),
      makeFile("b.jpg", "image/jpeg", 21 * 1024 * 1024),
    ]);
    expect(errors).toHaveLength(2);
  });
});
