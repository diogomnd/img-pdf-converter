import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "../App";

describe("App", () => {
    it("renders the title with SVG icons instead of emoji text", () => {
        render(<App />);

        const heading = screen.getByRole("heading", { name: "IMG PDF" });

        expect(heading.textContent).toBe("IMGPDF");
        expect(heading.textContent).not.toContain(
            String.fromCodePoint(0x1f5bc)
        );
        expect(heading.querySelectorAll("svg")).toHaveLength(3);
    });
});
