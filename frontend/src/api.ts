import type { ConvertOptions, ResponseType } from "./types";

export async function convertImages(
    files: File[],
    options: ConvertOptions
): Promise<{ blob: Blob; type: ResponseType }> {
    const formData = new FormData();
    files.forEach((f) => formData.append("images", f));
    formData.append("mode", options.mode);
    formData.append("page_size", options.page_size);
    formData.append("orientation", options.orientation);
    formData.append("margin_px", String(options.margin_px));
    formData.append("quality", String(options.quality));

    const response = await fetch("/api/convert", {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        const data = await response
            .json()
            .catch(() => ({ error: "Conversion failed" }));
        throw new Error(data.error ?? "Conversion failed");
    }

    const contentType = response.headers.get("content-type") ?? "";
    const blob = await response.blob();
    const type: ResponseType = contentType.includes("zip") ? "zip" : "pdf";
    return { blob, type };
}

export function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
