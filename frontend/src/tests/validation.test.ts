import { describe, it, expect } from "vitest";
import { validateFiles, validatePdfFiles } from "../validation";

const makeFile = (name: string, type: string, size: number) =>
    Object.defineProperty(new File([], name, { type }), "size", {
        value: size,
    });

describe("validateFiles", () => {
    it("accepts PNG", () => {
        expect(
            validateFiles([makeFile("a.png", "image/png", 100)])
        ).toHaveLength(0);
    });

    it("accepts JPEG", () => {
        expect(
            validateFiles([makeFile("a.jpg", "image/jpeg", 100)])
        ).toHaveLength(0);
    });

    it("rejects GIF", () => {
        const errors = validateFiles([makeFile("a.gif", "image/gif", 100)]);
        expect(errors[0].message).toContain("PNG and JPG");
    });

    it("rejects file over 20 MB", () => {
        const errors = validateFiles([
            makeFile("a.jpg", "image/jpeg", 21 * 1024 * 1024),
        ]);
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

describe("validatePdfFiles", () => {
    it("accepts PDF MIME type", () => {
        expect(
            validatePdfFiles([makeFile("a.pdf", "application/pdf", 100)])
        ).toHaveLength(0);
    });

    it("accepts PDF extension when MIME type is generic", () => {
        expect(
            validatePdfFiles([
                makeFile("a.pdf", "application/octet-stream", 100),
            ])
        ).toHaveLength(0);
    });

    it("rejects non-PDF files", () => {
        const errors = validatePdfFiles([makeFile("a.txt", "text/plain", 100)]);
        expect(errors[0].message).toContain("PDF");
    });

    it("rejects PDF over 20 MB", () => {
        const errors = validatePdfFiles([
            makeFile("a.pdf", "application/pdf", 21 * 1024 * 1024),
        ]);
        expect(errors[0].message).toContain("20 MB");
    });
});
