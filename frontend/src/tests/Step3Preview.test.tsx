import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Step3Preview } from "../components/Step3Preview";

vi.mock("../api", () => ({
    downloadBlob: vi.fn(),
}));

describe("Step3Preview", () => {
    it("renders PDF preview in a browser-native frame", () => {
        URL.createObjectURL = vi.fn().mockReturnValue("blob:preview-pdf");
        URL.revokeObjectURL = vi.fn();

        render(
            <Step3Preview
                blob={new Blob(["pdf"], { type: "application/pdf" })}
                type="pdf"
                onBack={() => undefined}
                onReset={() => undefined}
            />
        );

        const frame = screen.getByTitle("Preview do PDF");
        expect(frame.getAttribute("src")).toBe("blob:preview-pdf");
    });
});
